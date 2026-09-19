"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
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
    async (nome: string, saldoInicial: number, metaValor?: number) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        saldo: saldoInicial,
        ...(metaValor ? { metaValor } : {}),
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const adjustSaldo = useCallback(async (id: string, delta: number) => {
    await updateDoc(doc(db, COLLECTION, id), { saldo: increment(delta) });
  }, []);

  const updatePocket = useCallback(
    async (id: string, input: { nome: string; saldo: number; metaValor?: number }) => {
      await updateDoc(doc(db, COLLECTION, id), {
        nome: input.nome,
        saldo: input.saldo,
        metaValor: input.metaValor ? input.metaValor : deleteField(),
      });
    },
    [],
  );

  const removePocket = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  /** Move dinheiro de uma caixinha para outra de forma atômica. */
  const transferBetweenPockets = useCallback(
    async (fromId: string, toId: string, valor: number) => {
      await runTransaction(db, async (transaction) => {
        const fromRef = doc(db, COLLECTION, fromId);
        const fromSnap = await transaction.get(fromRef);
        const saldoAtual = (fromSnap.data()?.saldo as number) ?? 0;
        if (valor > saldoAtual) {
          throw new Error("Saldo insuficiente para transferir.");
        }
        transaction.update(fromRef, { saldo: increment(-valor) });
        transaction.update(doc(db, COLLECTION, toId), { saldo: increment(valor) });
      });
    },
    [],
  );

  return {
    pockets,
    loading,
    addPocket,
    adjustSaldo,
    updatePocket,
    removePocket,
    transferBetweenPockets,
  };
}
