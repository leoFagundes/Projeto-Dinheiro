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
import type { CategoryGoal } from "./types";

const COLLECTION = "categoryGoals";

export function useCategoryGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<CategoryGoal[]>([]);
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

  return { goals, loading, setGoal, removeGoal };
}
