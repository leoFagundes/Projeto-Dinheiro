"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { PocketTransfer } from "./types";

const COLLECTION = "pocketTransfers";

/** Histórico de transferências entre caixinhas. */
export function usePocketTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<PocketTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PocketTransfer, "id">),
        }))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      setTransfers(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { transfers, loading };
}
