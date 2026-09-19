"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { PocketMovement } from "./types";

const COLLECTION = "pocketMovements";

/** Histórico de depósitos/retiradas entre caixinhas e bancos, usado para calcular o saldo em conta. */
export function usePocketMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<PocketMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<PocketMovement, "id">),
      }));
      setMovements(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { movements, loading };
}
