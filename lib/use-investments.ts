"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
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
import type { Investment, InvestmentType } from "./types";

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
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Investment, "id">),
      }));
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

  /**
   * Registra um aporte ou resgate, mantendo o total investido (e cotas)
   * atualizado. Quando `bancoId` é informado, o valor sai (aporte) ou volta
   * (resgate) do saldo em conta desse banco.
   */
  const moveInvestment = useCallback(
    async (
      investimentoId: string,
      tipo: "aporte" | "resgate",
      valor: number,
      cotas?: number,
      bancoId?: string,
    ) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const investRef = doc(db, COLLECTION, investimentoId);
        const investSnap = await transaction.get(investRef);
        const valorAtual = (investSnap.data()?.valorInvestido as number) ?? 0;
        if (tipo === "resgate" && valor > valorAtual) {
          throw new Error("Valor maior que o total investido.");
        }
        const delta = tipo === "aporte" ? valor : -valor;
        transaction.update(investRef, {
          valorInvestido: increment(delta),
          ...(cotas ? { totalCotas: increment(tipo === "aporte" ? cotas : -cotas) } : {}),
        });
        transaction.set(doc(collection(db, MOVEMENTS_COLLECTION)), {
          userId: user.uid,
          investimentoId,
          tipo,
          valor,
          ...(cotas ? { cotas } : {}),
          ...(bancoId ? { bancoId } : {}),
          data: todayIsoDate(),
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

  return {
    investments,
    loading,
    addInvestment,
    updateInvestment,
    removeInvestment,
    moveInvestment,
    registrarRendimento,
  };
}
