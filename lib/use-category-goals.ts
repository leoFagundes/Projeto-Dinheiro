"use client";

import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { batchBuilder, commitInBackground } from "./firestore-writes";
import type { CategoryGoal, CategoryGoalOverride } from "./types";

const COLLECTION = "categoryGoals";
const OVERRIDES_COLLECTION = "categoryGoalOverrides";

export function useCategoryGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<CategoryGoal[]>([]);
  const [overrides, setOverrides] = useState<CategoryGoalOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hooks são usados apenas dentro de páginas protegidas, que só renderizam
    // quando há um usuário autenticado — sem usuário, não há o que assinar.
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CategoryGoal, "id">),
      }));
      setGoals(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, OVERRIDES_COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CategoryGoalOverride, "id">),
      }));
      setOverrides(items);
    });
    return unsubscribe;
  }, [user]);

  const setGoal = useCallback(
    async (categoria: string, limiteMensal: number) => {
      if (!user) return;
      const existing = goals.find((g) => g.categoria === categoria);
      if (existing) {
        await updateDoc(doc(db, COLLECTION, existing.id), { limiteMensal });
      } else {
        await addDoc(collection(db, COLLECTION), {
          userId: user.uid,
          categoria,
          limiteMensal,
        });
      }
    },
    [user, goals],
  );

  /**
   * Tira o limite de uma categoria: apaga TODOS os registros de limite dela
   * (se por algum motivo existir mais de um, apagar só o primeiro deixava o
   * limite "voltando") e as personalizações por mês, num batch só.
   */
  const removeGoal = useCallback(
    async (categoria: string) => {
      const exclusao = batchBuilder();
      for (const g of goals.filter((g) => g.categoria === categoria)) {
        exclusao.next().delete(doc(db, COLLECTION, g.id));
      }
      for (const o of overrides.filter((o) => o.categoria === categoria)) {
        exclusao.next().delete(doc(db, OVERRIDES_COLLECTION, o.id));
      }
      commitInBackground(exclusao.batches, "Não foi possível remover o limite. Tente de novo.");
    },
    [goals, overrides],
  );

  /** Mantém o limite de gastos acompanhando a categoria quando ela é renomeada. */
  const renameGoalCategoria = useCallback(
    async (nomeAntigo: string, nomeNovo: string) => {
      const existing = goals.find((g) => g.categoria === nomeAntigo);
      if (existing) {
        await updateDoc(doc(db, COLLECTION, existing.id), { categoria: nomeNovo });
      }
      await Promise.all(
        overrides
          .filter((o) => o.categoria === nomeAntigo)
          .map((o) => updateDoc(doc(db, OVERRIDES_COLLECTION, o.id), { categoria: nomeNovo })),
      );
    },
    [goals, overrides],
  );

  /** Define (ou atualiza) um limite que vale só pra um mês específico, sem mexer no limite geral. */
  const setGoalOverride = useCallback(
    async (categoria: string, monthKey: string, limiteMensal: number) => {
      if (!user) return;
      const existing = overrides.find(
        (o) => o.categoria === categoria && o.monthKey === monthKey,
      );
      if (existing) {
        await updateDoc(doc(db, OVERRIDES_COLLECTION, existing.id), { limiteMensal });
      } else {
        await addDoc(collection(db, OVERRIDES_COLLECTION), {
          userId: user.uid,
          categoria,
          monthKey,
          limiteMensal,
        });
      }
    },
    [user, overrides],
  );

  /** Volta um mês ao limite geral — apaga todas as personalizações daquela categoria naquele mês. */
  const removeGoalOverride = useCallback(
    async (categoria: string, monthKey: string) => {
      const exclusao = batchBuilder();
      for (const o of overrides.filter((o) => o.categoria === categoria && o.monthKey === monthKey)) {
        exclusao.next().delete(doc(db, OVERRIDES_COLLECTION, o.id));
      }
      commitInBackground(exclusao.batches, "Não foi possível remover a personalização. Tente de novo.");
    },
    [overrides],
  );

  return {
    goals,
    overrides,
    loading,
    setGoal,
    removeGoal,
    renameGoalCategoria,
    setGoalOverride,
    removeGoalOverride,
  };
}
