"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { batchBuilder, commitInBackground } from "./firestore-writes";
import { todayIsoDate } from "./format";
import type { Investment, InvestmentMovement, InvestmentSubtipo, InvestmentType } from "./types";

const COLLECTION = "investments";
const MOVEMENTS_COLLECTION = "investmentMovements";

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Investment, "id">),
          }))
          .sort((a, b) => a.criadoEm - b.criadoEm);
        setInvestments(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Sem isso, uma falha aqui (ex: regra de segurança desatualizada)
        // ficava 100% invisível — a lista só parecia vazia, sem nenhum aviso.
        console.error("Erro ao carregar investimentos:", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  const addInvestment = useCallback(
    async (nome: string, tipo: InvestmentType, descricao?: string, subtipo?: InvestmentSubtipo) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        tipo,
        valorInvestido: 0,
        ...(descricao ? { descricao } : {}),
        ...(tipo === "rendaVariavel" && subtipo ? { subtipo } : {}),
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const updateInvestment = useCallback(
    async (
      id: string,
      input: { nome: string; tipo: InvestmentType; descricao?: string; subtipo?: InvestmentSubtipo },
    ) => {
      await updateDoc(doc(db, COLLECTION, id), {
        nome: input.nome,
        tipo: input.tipo,
        descricao: input.descricao ? input.descricao : deleteField(),
        subtipo: input.tipo === "rendaVariavel" && input.subtipo ? input.subtipo : deleteField(),
      });
    },
    [],
  );

  /**
   * Remove o investimento junto com todo o histórico dele (aportes, resgates,
   * rendimentos), num batch atômico. Antes os movimentos ficavam órfãos e
   * continuavam somando nos gráficos de aportes e no Histórico.
   */
  const removeInvestment = useCallback(
    async (id: string) => {
      if (!user) return;
      const movimentos = await getDocs(
        query(collection(db, MOVEMENTS_COLLECTION), where("userId", "==", user.uid), where("investimentoId", "==", id)),
      );
      const exclusao = batchBuilder();
      exclusao.next().delete(doc(db, COLLECTION, id));
      for (const snap of movimentos.docs) exclusao.next().delete(snap.ref);
      commitInBackground(exclusao.batches, "Não foi possível remover o investimento. Tente de novo.");
    },
    [user],
  );

  const setInvestmentOculto = useCallback(async (id: string, oculto: boolean) => {
    await updateDoc(doc(db, COLLECTION, id), oculto ? { oculto: true } : { oculto: deleteField() });
  }, []);

  /**
   * Registra um aporte ou resgate. Aporte soma em `valorInvestido` (e, se já
   * houver `saldoAtual`, soma nele também, senão um aporte feito depois de um
   * rendimento "desaparecia" do valor exibido). Resgate pode ir até o
   * `saldoAtual` (que já inclui rendimento) — só o custo (`valorInvestido`)
   * fica travado em 0 em vez de negativo, já que não faz sentido custo
   * negativo.
   */
  const moveInvestment = useCallback(
    async (
      investimentoId: string,
      tipo: "aporte" | "resgate",
      valor: number,
      cotas?: number,
      data: string = todayIsoDate(),
    ) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const investRef = doc(db, COLLECTION, investimentoId);
        const investSnap = await transaction.get(investRef);
        const snapData = investSnap.data();
        const valorInvestidoAtual = (snapData?.valorInvestido as number) ?? 0;
        const saldoAtualExistente = snapData?.saldoAtual as number | undefined;
        const valorDisponivel = saldoAtualExistente ?? valorInvestidoAtual;
        if (tipo === "resgate" && valor > valorDisponivel) {
          throw new Error("Valor maior que o saldo atual do investimento.");
        }

        const custoDelta =
          tipo === "aporte"
            ? valor
            : Math.max(0, valorInvestidoAtual - valor) - valorInvestidoAtual;
        const saldoDelta = saldoAtualExistente !== undefined ? (tipo === "aporte" ? valor : -valor) : undefined;

        transaction.update(investRef, {
          valorInvestido: increment(custoDelta),
          ...(cotas ? { totalCotas: increment(tipo === "aporte" ? cotas : -cotas) } : {}),
          ...(saldoDelta !== undefined ? { saldoAtual: increment(saldoDelta) } : {}),
        });
        transaction.set(doc(collection(db, MOVEMENTS_COLLECTION)), {
          userId: user.uid,
          investimentoId,
          tipo,
          valor,
          ...(cotas ? { cotas } : {}),
          custoDelta,
          ...(saldoDelta !== undefined ? { saldoDelta } : {}),
          data,
          criadoEm: Date.now(),
        });
      });
    },
    [user],
  );

  /**
   * Registra o rendimento de um investimento: o usuário informa o valor atual
   * real (cotação/saldo na corretora) e o delta em relação ao valor atual
   * anterior vira um movimento "rendimento" — não mexe em `valorInvestido`
   * (que continua sendo só o que foi realmente aportado).
   */
  const registrarRendimento = useCallback(
    async (investimentoId: string, novoSaldoAtual: number) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const investRef = doc(db, COLLECTION, investimentoId);
        const investSnap = await transaction.get(investRef);
        const data = investSnap.data();
        const baseAnterior = (data?.saldoAtual as number) ?? (data?.valorInvestido as number) ?? 0;
        const delta = novoSaldoAtual - baseAnterior;
        transaction.update(investRef, { saldoAtual: novoSaldoAtual });
        transaction.set(doc(collection(db, MOVEMENTS_COLLECTION)), {
          userId: user.uid,
          investimentoId,
          tipo: "rendimento",
          valor: delta,
          data: todayIsoDate(),
          criadoEm: Date.now(),
        });
      });
    },
    [user],
  );

  /**
   * Exclui um movimento (aporte/resgate/rendimento) desfazendo exatamente o
   * que ele alterou no investimento — sem isso, um lançamento errado nunca
   * podia ser corrigido, só compensado com outro movimento manual. Em batch
   * (não runTransaction): não precisa ler nada antes, e transação do
   * Firestore só funciona online — com internet ruim a exclusão falhava. Se
   * o investimento já não existe, só apaga o registro.
   */
  const deleteInvestmentMovement = useCallback(
    async (movement: InvestmentMovement) => {
      // Sem a lista carregada não dá pra saber se o investimento existe —
      // melhor recusar do que apagar o registro sem desfazer o saldo.
      if (loading) throw new Error("Investimentos ainda carregando.");
      const batch = writeBatch(db);
      const investRef = doc(db, COLLECTION, movement.investimentoId);
      if (investments.some((i) => i.id === movement.investimentoId)) {
        if (movement.tipo === "rendimento") {
          batch.update(investRef, { saldoAtual: increment(-movement.valor) });
        } else {
          const custoDelta =
            movement.custoDelta ?? (movement.tipo === "aporte" ? movement.valor : -movement.valor);
          batch.update(investRef, {
            valorInvestido: increment(-custoDelta),
            ...(movement.cotas
              ? { totalCotas: increment(movement.tipo === "aporte" ? -movement.cotas : movement.cotas) }
              : {}),
            ...(movement.saldoDelta !== undefined ? { saldoAtual: increment(-movement.saldoDelta) } : {}),
          });
        }
      }
      batch.delete(doc(db, MOVEMENTS_COLLECTION, movement.id));
      commitInBackground([batch], "Não foi possível excluir o movimento. Tente de novo.");
    },
    [investments, loading],
  );

  return {
    investments,
    loading,
    error,
    addInvestment,
    updateInvestment,
    removeInvestment,
    setInvestmentOculto,
    moveInvestment,
    registrarRendimento,
    deleteInvestmentMovement,
  };
}
