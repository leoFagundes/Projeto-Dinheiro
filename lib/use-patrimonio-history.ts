"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { PatrimonioSnapshot } from "./types";

const COLLECTION = "patrimonioSnapshots";

/**
 * Histórico de retratos mensais do patrimônio, pra dar um gráfico de
 * evolução real — sem isso o app só sabia o valor de agora.
 */
export function usePatrimonioHistory() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<PatrimonioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PatrimonioSnapshot, "id">),
        }))
        .sort((a, b) => (a.monthKey < b.monthKey ? -1 : a.monthKey > b.monthKey ? 1 : 0));
      setSnapshots(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  /** Grava (ou atualiza) o retrato do mês atual com os valores calculados agora. */
  const syncSnapshot = useCallback(
    async (
      monthKey: string,
      patrimonio: { contas: number; caixinhas: number; investimentos: number; dividas: number; total: number },
    ) => {
      if (!user) return;
      const ref = doc(db, COLLECTION, `${user.uid}_${monthKey}`);
      await setDoc(
        ref,
        {
          userId: user.uid,
          monthKey,
          ...patrimonio,
          criadoEm: Date.now(),
          atualizadoEm: Date.now(),
        },
        { merge: true },
      );
    },
    [user],
  );

  return { snapshots, loading, syncSnapshot };
}
