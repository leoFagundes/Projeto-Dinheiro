"use client";

import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { commitInBackground } from "./firestore-writes";
import type { InvestmentGoal } from "./types";

const COLLECTION = "investmentGoals";

/** Metas de valor total da carteira — funcionam como marcos independentes, cada um marcado como concluído ao ser atingido. */
export function useInvestmentGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<InvestmentGoal, "id">),
        }))
        .sort((a, b) => a.metaValor - b.metaValor);
      setGoals(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addGoal = useCallback(
    async (metaValor: number, nome?: string) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        metaValor,
        ...(nome ? { nome } : {}),
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const removeGoal = useCallback(async (id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTION, id));
    commitInBackground([batch], "Não foi possível remover a meta. Tente de novo.");
  }, []);

  return { goals, loading, addGoal, removeGoal };
}
