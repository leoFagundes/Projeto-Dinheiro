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
import type { Bank } from "./types";

const COLLECTION = "banks";

export function useBanks() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Bank, "id">),
      }));
      setBanks(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addBank = useCallback(
    async (nome: string, saldoDevedorInicial = 0) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        saldoDevedor: saldoDevedorInicial,
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const adjustSaldoDevedor = useCallback(async (id: string, delta: number) => {
    await updateDoc(doc(db, COLLECTION, id), { saldoDevedor: increment(delta) });
  }, []);

  const renameBank = useCallback(async (id: string, nome: string) => {
    await updateDoc(doc(db, COLLECTION, id), { nome });
  }, []);

  const updateBank = useCallback(
    async (id: string, input: { nome: string; saldoDevedor: number }) => {
      await updateDoc(doc(db, COLLECTION, id), input);
    },
    [],
  );

  const removeBank = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  return {
    banks,
    loading,
    addBank,
    adjustSaldoDevedor,
    renameBank,
    updateBank,
    removeBank,
  };
}
