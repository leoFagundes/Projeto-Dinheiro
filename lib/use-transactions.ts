"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { batchBuilder, commitInBackground } from "./firestore-writes";
import {
  addMonthsToKey,
  clampDayToMonth,
  currentMonthKey,
  monthKeyOfIsoDate,
  splitInstallments,
} from "./format";
import type { NewTransaction, Transaction } from "./types";

/**
 * Igual a Partial<NewTransaction>, exceto pelos campos opcionais que
 * precisam de um jeito explícito de dizer "limpa esse campo" — passar
 * string vazia (ou "" tipada) remove o campo no Firestore em vez de deixar
 * o valor antigo esquecido lá (updateDoc faz merge, não substitui).
 */
type TransactionUpdateInput = Partial<
  Omit<NewTransaction, "recorrenteFim" | "recorrenciaIntervalo" | "mesesExcluidos">
> & {
  recorrenteFim?: string;
  recorrenciaIntervalo?: "mensal" | "anual" | "";
};

const COLLECTION = "transactions";

/**
 * Id fixo da cobrança gerada de uma recorrência num mês. Com id
 * determinístico, dois geradores rodando ao mesmo tempo (dois aparelhos,
 * duas abas) escrevem no MESMO documento em vez de criar duas cobranças —
 * antes surgiam duplicatas, e excluir uma deixava a outra lá.
 */
function recurringInstanceId(templateId: string, monthKey: string): string {
  return `${templateId}_${monthKey}`;
}

/** Mês a que uma cobrança gerada pertence (pelo id fixo, ou pela data nas antigas). */
function recurringInstanceMonth(t: Transaction): string {
  const prefixo = `${t.recorrenteOrigemId}_`;
  if (t.id.startsWith(prefixo)) return t.id.slice(prefixo.length);
  return monthKeyOfIsoDate(t.data);
}

function withoutId(t: Transaction): Omit<Transaction, "id"> {
  const rest: Partial<Transaction> = { ...t };
  delete rest.id;
  return rest as Omit<Transaction, "id">;
}

function useTransactionsSource() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  // true depois do primeiro retrato vindo do SERVIDOR (não só do cache do
  // aparelho) — o gerador de recorrências só decide com dados confirmados.
  const [synced, setSynced] = useState(false);
  const generatedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Transaction, "id">),
        }))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      setTransactions(items);
      setLoading(false);
      if (!snapshot.metadata.fromCache) setSynced(true);
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
   * Tudo num batch só — ou entram todas as parcelas, ou nenhuma.
   */
  const addInstallmentPurchase = useCallback(
    async (
      input: {
        valorTotal: number;
        categoria: string;
        descricao: string;
        data: string;
      },
      numParcelas: number,
      startFrom: number = 1,
    ) => {
      if (!user) return;
      const valores = splitInstallments(input.valorTotal, numParcelas);
      const compraId = crypto.randomUUID();
      const baseMonth = monthKeyOfIsoDate(input.data);
      const originalDay = Number(input.data.slice(8, 10));
      const batch = writeBatch(db);
      valores.slice(startFrom - 1).forEach((valor, index) => {
        const monthKey = addMonthsToKey(baseMonth, index);
        batch.set(doc(collection(db, COLLECTION)), {
          userId: user.uid,
          valor,
          tipo: "despesa" as const,
          categoria: input.categoria,
          descricao: input.descricao,
          data: `${monthKey}-${clampDayToMonth(monthKey, originalDay)}`,
          recorrente: false,
          compraId,
          parcelaAtual: startFrom + index,
          parcelaTotal: numParcelas,
          criadoEm: Date.now(),
        });
      });
      await batch.commit();
    },
    [user],
  );

  /**
   * Registra um empréstimo: o valor recebido entra como receita na data em
   * que o dinheiro chegou, e o valor total a pagar é dividido em N parcelas
   * mensais a partir da data da 1ª parcela — datas diferentes de propósito,
   * já que o dinheiro costuma cair antes do vencimento da primeira cobrança.
   * Receita e parcelas compartilham `emprestimoId`, o que permite reconstruir
   * o empréstimo inteiro (ver computeLoans) sem precisar de uma coleção
   * separada. Tudo num batch só (atômico).
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
      },
      numParcelas: number,
    ) => {
      if (!user) return;
      const valores = splitInstallments(input.valorTotalPagar, numParcelas);
      const emprestimoId = crypto.randomUUID();
      const baseMonth = monthKeyOfIsoDate(input.dataPrimeiraParcela);
      const originalDay = Number(input.dataPrimeiraParcela.slice(8, 10));
      const batch = writeBatch(db);

      batch.set(doc(collection(db, COLLECTION)), {
        userId: user.uid,
        valor: input.valorRecebido,
        tipo: "receita" as const,
        categoria: "Empréstimo",
        descricao: `Empréstimo recebido — ${input.descricao}`,
        data: input.dataRecebimento,
        recorrente: false,
        emprestimoId,
        criadoEm: Date.now(),
      });
      valores.forEach((valor, index) => {
        const monthKey = addMonthsToKey(baseMonth, index);
        const data = `${monthKey}-${clampDayToMonth(monthKey, originalDay)}`;
        batch.set(doc(collection(db, COLLECTION)), {
          userId: user.uid,
          valor,
          tipo: "despesa" as const,
          categoria: input.categoria,
          descricao: input.descricao,
          data,
          recorrente: false,
          compraId: emprestimoId,
          parcelaAtual: index + 1,
          parcelaTotal: numParcelas,
          emprestimoId,
          valorOriginal: valor,
          dataVencimento: data,
          criadoEm: Date.now(),
        });
      });
      await batch.commit();
    },
    [user],
  );

  const updateTransaction = useCallback(async (id: string, input: TransactionUpdateInput) => {
    const { recorrenteFim, recorrenciaIntervalo, ...rest } = input;
    const payload: Record<string, unknown> = { ...rest };
    if (recorrenteFim !== undefined) {
      payload.recorrenteFim = recorrenteFim ? recorrenteFim : deleteField();
    }
    if (recorrenciaIntervalo !== undefined) {
      payload.recorrenciaIntervalo = recorrenciaIntervalo === "anual" ? "anual" : deleteField();
    }
    await updateDoc(doc(db, COLLECTION, id), payload);
  }, []);

  /**
   * Exclui de verdade, NA HORA e de forma atômica (todas ou nenhuma) — não
   * existe mais "exclusão agendada" que dependia do app continuar aberto.
   * Se alguma das excluídas for a cobrança gerada de uma assinatura, o mês
   * dela fica marcado no template pra nunca ser recriado. Com
   * `encerrarAssinaturaId`, a assinatura também para de gerar cobranças.
   * Devolve uma função que desfaz tudo exatamente como estava.
   */
  const deleteTransactions = useCallback(
    (lista: Transaction[], options: { encerrarAssinaturaId?: string } = {}): (() => void) => {
      if (lista.length === 0) return () => {};
      const idsExcluidos = new Set(lista.map((t) => t.id));
      const templatePorId = new Map(transactions.map((t) => [t.id, t]));
      const mesesPorTemplate = new Map<string, string[]>();
      for (const t of lista) {
        if (!t.recorrenteOrigemId || idsExcluidos.has(t.recorrenteOrigemId)) continue;
        if (!templatePorId.has(t.recorrenteOrigemId)) continue;
        const meses = mesesPorTemplate.get(t.recorrenteOrigemId) ?? [];
        meses.push(recurringInstanceMonth(t));
        mesesPorTemplate.set(t.recorrenteOrigemId, meses);
      }
      const encerrar =
        options.encerrarAssinaturaId &&
        !idsExcluidos.has(options.encerrarAssinaturaId) &&
        templatePorId.get(options.encerrarAssinaturaId)?.recorrente
          ? options.encerrarAssinaturaId
          : null;

      const exclusao = batchBuilder();
      for (const t of lista) exclusao.next().delete(doc(db, COLLECTION, t.id));
      for (const [templateId, meses] of mesesPorTemplate) {
        exclusao.next().update(doc(db, COLLECTION, templateId), { mesesExcluidos: arrayUnion(...meses) });
      }
      if (encerrar) exclusao.next().update(doc(db, COLLECTION, encerrar), { recorrente: false });
      commitInBackground(exclusao.batches, "Não foi possível excluir. Tente de novo.");

      return () => {
        const restauracao = batchBuilder();
        for (const t of lista) restauracao.next().set(doc(db, COLLECTION, t.id), withoutId(t));
        for (const [templateId, meses] of mesesPorTemplate) {
          restauracao.next().update(doc(db, COLLECTION, templateId), { mesesExcluidos: arrayRemove(...meses) });
        }
        if (encerrar) restauracao.next().update(doc(db, COLLECTION, encerrar), { recorrente: true });
        commitInBackground(restauracao.batches, "Não foi possível desfazer a exclusão.");
      };
    },
    [transactions],
  );

  /**
   * Registra o pagamento de uma parcela de empréstimo com o valor/data reais
   * — pode ser diferente do combinado (pagar antes costuma sair mais barato,
   * pagar depois mais caro com multa/juros). `valorOriginal`/`dataVencimento`
   * da parcela não mudam, só `valor`/`data` (o que efetivamente foi pago e
   * quando), que é o que o resto do app já lê.
   */
  const payLoanInstallment = useCallback(
    async (parcelaId: string, valorPago: number, dataPagamento: string) => {
      await updateDoc(doc(db, COLLECTION, parcelaId), { valor: valorPago, data: dataPagamento });
    },
    [],
  );

  /** Desfaz o pagamento registrado, voltando a parcela pro valor/data combinados. */
  const undoLoanInstallmentPayment = useCallback(async (parcela: Transaction) => {
    if (parcela.valorOriginal === undefined || parcela.dataVencimento === undefined) return;
    await updateDoc(doc(db, COLLECTION, parcela.id), {
      valor: parcela.valorOriginal,
      data: parcela.dataVencimento,
    });
  }, []);

  // O app não tem backend agendado, então cada template recorrente ganha sua
  // instância do mês atual quando o app abre — uma vez por sessão/conta, e só
  // depois de um retrato confirmado pelo servidor (o cache do aparelho pode
  // estar desatualizado e não saber de uma cobrança criada em outro aparelho).
  useEffect(() => {
    if (!user || !synced || generatedForRef.current === user.uid) return;
    generatedForRef.current = user.uid;

    const thisMonth = currentMonthKey();
    const templates = transactions.filter((t) => t.recorrente && !t.recorrenteOrigemId);

    for (const template of templates) {
      // >= (não só ===): se a assinatura começa num mês futuro, ainda não
      // existe cobrança pra gerar agora — sem isso, o dia do template era
      // "clampado" pro mês atual e criava uma instância antes da hora.
      if (monthKeyOfIsoDate(template.data) >= thisMonth) continue;
      if (template.recorrenteFim && thisMonth > template.recorrenteFim) continue;
      if (template.mesesExcluidos?.includes(thisMonth)) continue;
      if (template.recorrenciaIntervalo === "anual") {
        const anniversaryMonthNum = monthKeyOfIsoDate(template.data).slice(5, 7);
        if (thisMonth.slice(5, 7) !== anniversaryMonthNum) continue;
      }

      const alreadyExists = transactions.some(
        (t) => t.recorrenteOrigemId === template.id && recurringInstanceMonth(t) === thisMonth,
      );
      if (alreadyExists) continue;

      const day = clampDayToMonth(thisMonth, Number(template.data.slice(8, 10)));
      setDoc(doc(db, COLLECTION, recurringInstanceId(template.id, thisMonth)), {
        userId: user.uid,
        valor: template.valor,
        tipo: template.tipo,
        categoria: template.categoria,
        descricao: template.descricao,
        data: `${thisMonth}-${day}`,
        recorrente: true,
        recorrenteOrigemId: template.id,
        criadoEm: Date.now(),
      }).catch((error) => console.error("Não foi possível gerar a cobrança recorrente:", error));
    }
  }, [user, synced, transactions]);

  return useMemo(
    () => ({
      transactions,
      loading,
      addTransaction,
      addInstallmentPurchase,
      addLoan,
      updateTransaction,
      deleteTransactions,
      payLoanInstallment,
      undoLoanInstallmentPayment,
    }),
    [
      transactions,
      loading,
      addTransaction,
      addInstallmentPurchase,
      addLoan,
      updateTransaction,
      deleteTransactions,
      payLoanInstallment,
      undoLoanInstallmentPayment,
    ],
  );
}

type TransactionsContextValue = ReturnType<typeof useTransactionsSource>;

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

/**
 * Uma única escuta das transações pro app inteiro (montada no layout da área
 * logada). Antes cada tela/componente abria a sua — e cada uma rodava o
 * gerador de recorrências por conta própria, o que podia duplicar cobranças.
 */
export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const value = useTransactionsSource();
  return createElement(TransactionsContext.Provider, { value }, children);
}

export function useTransactions(): TransactionsContextValue {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error("useTransactions deve ser usado dentro de um TransactionsProvider");
  return context;
}
