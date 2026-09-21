"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { FormaPagamento, NewTransaction, Transaction } from "./types";

/**
 * Igual a Partial<NewTransaction>, exceto pelos campos opcionais que
 * precisam de um jeito explícito de dizer "limpa esse campo" — passar
 * string vazia (ou "" tipada) remove o campo no Firestore em vez de deixar
 * o valor antigo esquecido lá (updateDoc faz merge, não substitui).
 */
type TransactionUpdateInput = Partial<
  Omit<NewTransaction, "bancoId" | "formaPagamento" | "recorrenteFim" | "recorrenciaIntervalo">
> & {
  bancoId?: string;
  formaPagamento?: FormaPagamento | "";
  recorrenteFim?: string;
  recorrenciaIntervalo?: "mensal" | "anual" | "";
};
import {
  addMonthsToKey,
  clampDayToMonth,
  currentMonthKey,
  monthKeyOfIsoDate,
  splitInstallments,
} from "./format";

const COLLECTION = "transactions";

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const generatedRecurringRef = useRef(false);

  useEffect(() => {
    generatedRecurringRef.current = false;

    // Hooks são usados apenas dentro de páginas protegidas, que só renderizam
    // quando há um usuário autenticado — sem usuário, não há o que assinar.
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Transaction, "id">),
        }))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      setTransactions(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addTransaction = useCallback(
    async (input: NewTransaction) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        ...input,
        userId: user.uid,
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  /**
   * Cria uma compra parcelada: divide o valor total em N parcelas, uma por mês.
   * `startFrom` permite registrar uma compra que já está em andamento, gerando
   * só as parcelas a partir desse número (útil ao migrar dívidas existentes).
   */
  const addInstallmentPurchase = useCallback(
    async (
      input: {
        valorTotal: number;
        categoria: string;
        descricao: string;
        data: string;
        bancoId?: string;
      },
      numParcelas: number,
      startFrom: number = 1,
    ) => {
      if (!user) return;
      const valores = splitInstallments(input.valorTotal, numParcelas);
      const compraId = crypto.randomUUID();
      const baseMonth = monthKeyOfIsoDate(input.data);
      const originalDay = Number(input.data.slice(8, 10));
      const remaining = valores.slice(startFrom - 1);

      await Promise.all(
        remaining.map((valor, index) => {
          const parcelaAtual = startFrom + index;
          const monthKey = addMonthsToKey(baseMonth, index);
          const day = clampDayToMonth(monthKey, originalDay);
          return addDoc(collection(db, COLLECTION), {
            userId: user.uid,
            valor,
            tipo: "despesa" as const,
            categoria: input.categoria,
            descricao: input.descricao,
            data: `${monthKey}-${day}`,
            recorrente: false,
            compraId,
            parcelaAtual,
            parcelaTotal: numParcelas,
            ...(input.bancoId ? { bancoId: input.bancoId, formaPagamento: "credito" } : {}),
            criadoEm: Date.now(),
          });
        }),
      );
    },
    [user],
  );

  /**
   * Registra um empréstimo: o valor recebido entra como receita na data em
   * que caiu na conta (soma no saldo em conta do banco), e o valor total a
   * pagar é dividido em N parcelas no débito a partir da data da 1ª parcela
   * — datas diferentes de propósito, já que o dinheiro costuma cair antes do
   * vencimento da primeira cobrança. Cada parcela só desconta da conta no
   * próprio dia (ver computeBankSaldoConta), então dá pra planejar deixando o
   * dinheiro reservado antes de cada cobrança chegar.
   */
  const addLoan = useCallback(
    async (
      input: {
        valorRecebido: number;
        valorTotalPagar: number;
        categoria: string;
        descricao: string;
        dataRecebimento: string;
        dataPrimeiraParcela: string;
        bancoId: string;
      },
      numParcelas: number,
    ) => {
      if (!user) return;
      const valores = splitInstallments(input.valorTotalPagar, numParcelas);
      const compraId = crypto.randomUUID();
      const baseMonth = monthKeyOfIsoDate(input.dataPrimeiraParcela);
      const originalDay = Number(input.dataPrimeiraParcela.slice(8, 10));

      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        valor: input.valorRecebido,
        tipo: "receita" as const,
        categoria: "Empréstimo",
        descricao: `Empréstimo recebido — ${input.descricao}`,
        data: input.dataRecebimento,
        recorrente: false,
        bancoId: input.bancoId,
        criadoEm: Date.now(),
      });

      await Promise.all(
        valores.map((valor, index) => {
          const monthKey = addMonthsToKey(baseMonth, index);
          const day = clampDayToMonth(monthKey, originalDay);
          return addDoc(collection(db, COLLECTION), {
            userId: user.uid,
            valor,
            tipo: "despesa" as const,
            categoria: input.categoria,
            descricao: input.descricao,
            data: `${monthKey}-${day}`,
            recorrente: false,
            bancoId: input.bancoId,
            formaPagamento: "debito" as const,
            compraId,
            parcelaAtual: index + 1,
            parcelaTotal: numParcelas,
            criadoEm: Date.now(),
          });
        }),
      );
    },
    [user],
  );

  const updateTransaction = useCallback(async (id: string, input: TransactionUpdateInput) => {
    const { bancoId, formaPagamento, recorrenteFim, recorrenciaIntervalo, ...rest } = input;
    const payload: Record<string, unknown> = { ...rest };
    if (bancoId !== undefined) payload.bancoId = bancoId ? bancoId : deleteField();
    if (formaPagamento !== undefined) {
      payload.formaPagamento = formaPagamento ? formaPagamento : deleteField();
    }
    if (recorrenteFim !== undefined) {
      payload.recorrenteFim = recorrenteFim ? recorrenteFim : deleteField();
    }
    if (recorrenciaIntervalo !== undefined) {
      payload.recorrenciaIntervalo = recorrenciaIntervalo === "anual" ? "anual" : deleteField();
    }
    await updateDoc(doc(db, COLLECTION, id), payload);
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  /** Exclui esta e todas as próximas parcelas da mesma compra parcelada. */
  const cancelRemainingInstallments = useCallback(
    async (compraId: string, fromParcela: number) => {
      const toDelete = transactions.filter(
        (t) => t.compraId === compraId && (t.parcelaAtual ?? 0) >= fromParcela,
      );
      await Promise.all(toDelete.map((t) => deleteDoc(doc(db, COLLECTION, t.id))));
    },
    [transactions],
  );

  // O app não tem backend agendado, então cada template recorrente ganha sua
  // instância do mês atual assim que o usuário abre o app, uma vez por sessão.
  useEffect(() => {
    if (loading || !user || generatedRecurringRef.current) return;
    generatedRecurringRef.current = true;

    const thisMonth = currentMonthKey();
    const templates = transactions.filter(
      (t) => t.recorrente && !t.recorrenteOrigemId,
    );

    for (const template of templates) {
      // >= (não só ===): se a assinatura começa num mês futuro, ainda não
      // existe cobrança pra gerar agora — sem isso, o dia do template era
      // "clampado" pro mês atual e criava uma instância antes da hora.
      if (monthKeyOfIsoDate(template.data) >= thisMonth) continue;
      if (template.recorrenteFim && thisMonth > template.recorrenteFim) continue;
      if (template.recorrenciaIntervalo === "anual") {
        const anniversaryMonthNum = monthKeyOfIsoDate(template.data).slice(5, 7);
        if (thisMonth.slice(5, 7) !== anniversaryMonthNum) continue;
      }

      const alreadyExists = transactions.some(
        (t) =>
          t.recorrenteOrigemId === template.id &&
          monthKeyOfIsoDate(t.data) === thisMonth,
      );
      if (alreadyExists) continue;

      const originalDay = Number(template.data.slice(8, 10));
      const day = clampDayToMonth(thisMonth, originalDay);

      addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        valor: template.valor,
        tipo: template.tipo,
        categoria: template.categoria,
        descricao: template.descricao,
        data: `${thisMonth}-${day}`,
        recorrente: true,
        recorrenteOrigemId: template.id,
        ...(template.bancoId
          ? {
              bancoId: template.bancoId,
              ...(template.formaPagamento ? { formaPagamento: template.formaPagamento } : {}),
            }
          : {}),
        criadoEm: Date.now(),
      });
    }
  }, [loading, user, transactions]);

  return {
    transactions,
    loading,
    addTransaction,
    addInstallmentPurchase,
    addLoan,
    updateTransaction,
    deleteTransaction,
    cancelRemainingInstallments,
  };
}
