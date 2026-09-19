"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
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

  const removeGoal = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

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

  const removeGoalOverride = useCallback(async (id: string) => {
    await deleteDoc(doc(db, OVERRIDES_COLLECTION, id));
  }, []);

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
