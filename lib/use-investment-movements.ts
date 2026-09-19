"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { InvestmentMovement } from "./types";

const COLLECTION = "investmentMovements";

/** Histórico de aportes/resgates de todos os investimentos, para exibir por ativo. */
export function useInvestmentMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<InvestmentMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<InvestmentMovement, "id">),
        }))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      setMovements(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { movements, loading };
}
