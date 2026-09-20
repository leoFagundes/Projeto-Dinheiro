"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { todayIsoDate } from "./format";
import type { Investment, InvestmentMovement, InvestmentType } from "./types";

const COLLECTION = "investments";
const MOVEMENTS_COLLECTION = "investmentMovements";

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Investment, "id">),
        }))
        .sort((a, b) => a.criadoEm - b.criadoEm);
      setInvestments(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addInvestment = useCallback(
    async (nome: string, tipo: InvestmentType) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        tipo,
        valorInvestido: 0,
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const updateInvestment = useCallback(
    async (id: string, input: { nome: string; tipo: InvestmentType }) => {
      await updateDoc(doc(db, COLLECTION, id), input);
    },
    [],
  );

  const removeInvestment = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  const setInvestmentOculto = useCallback(async (id: string, oculto: boolean) => {
    await updateDoc(doc(db, COLLECTION, id), oculto ? { oculto: true } : { oculto: deleteField() });
  }, []);

  /**
   * Registra um aporte ou resgate. Aporte soma em `valorInvestido` (e, se já
   * houver `saldoAtual`, soma nele também, senão um aporte feito depois de um
   * rendimento "desaparecia" do valor exibido). Resgate pode ir até o
   * `saldoAtual` (que já inclui rendimento) — só o custo (`valorInvestido`)
   * fica travado em 0 em vez de negativo, já que não faz sentido custo
   * negativo. Quando `bancoId` é informado, o valor sai (aporte) ou volta
   * (resgate) do saldo em conta desse banco.
   */
  const moveInvestment = useCallback(
    async (
      investimentoId: string,
      tipo: "aporte" | "resgate",
      valor: number,
      cotas?: number,
      bancoId?: string,
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
          ...(bancoId ? { bancoId } : {}),
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
   * real (cotação/saldo do banco) e o delta em relação ao valor atual
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
   * podia ser corrigido, só compensado com outro movimento manual.
   */
  const deleteInvestmentMovement = useCallback(async (movement: InvestmentMovement) => {
    await runTransaction(db, async (transaction) => {
      const investRef = doc(db, COLLECTION, movement.investimentoId);
      if (movement.tipo === "rendimento") {
        transaction.update(investRef, { saldoAtual: increment(-movement.valor) });
      } else {
        const custoDelta =
          movement.custoDelta ?? (movement.tipo === "aporte" ? movement.valor : -movement.valor);
        transaction.update(investRef, {
          valorInvestido: increment(-custoDelta),
          ...(movement.cotas
            ? { totalCotas: increment(movement.tipo === "aporte" ? -movement.cotas : movement.cotas) }
            : {}),
          ...(movement.saldoDelta !== undefined
            ? { saldoAtual: increment(-movement.saldoDelta) }
            : {}),
        });
      }
      transaction.delete(doc(db, MOVEMENTS_COLLECTION, movement.id));
    });
  }, []);

  return {
    investments,
    loading,
    addInvestment,
    updateInvestment,
    removeInvestment,
    setInvestmentOculto,
    moveInvestment,
    registrarRendimento,
    deleteInvestmentMovement,
  };
}
