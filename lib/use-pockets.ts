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
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { Pocket } from "./types";

const COLLECTION = "pockets";

export function usePockets() {
  const { user } = useAuth();
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Pocket, "id">),
      }));
      setPockets(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addPocket = useCallback(
    async (nome: string, saldoInicial: number) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        saldo: saldoInicial,
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const adjustSaldo = useCallback(async (id: string, delta: number) => {
    await updateDoc(doc(db, COLLECTION, id), { saldo: increment(delta) });
  }, []);

  const removePocket = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  return { pockets, loading, addPocket, adjustSaldo, removePocket };
}
