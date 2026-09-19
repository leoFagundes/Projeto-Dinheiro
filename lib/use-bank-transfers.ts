"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { BankTransfer } from "./types";

const COLLECTION = "bankTransfers";

/** Histórico de transferências entre bancos, usado para calcular o saldo em conta. */
export function useBankTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<BankTransfer, "id">),
        }))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      setTransfers(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { transfers, loading };
}
