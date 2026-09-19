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
import { todayIsoDate } from "./format";
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
    async (nome: string, saldoDevedorInicial = 0, saldoContaInicial = 0) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        saldoDevedor: saldoDevedorInicial,
        ...(saldoContaInicial ? { saldoContaInicial } : {}),
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const renameBank = useCallback(async (id: string, nome: string) => {
    await updateDoc(doc(db, COLLECTION, id), { nome });
  }, []);

  const updateBank = useCallback(
    async (
      id: string,
      input: { nome: string; saldoDevedor: number; saldoContaInicial?: number },
    ) => {
      await updateDoc(doc(db, COLLECTION, id), {
        nome: input.nome,
        saldoDevedor: input.saldoDevedor,
        saldoContaInicial: input.saldoContaInicial ? input.saldoContaInicial : deleteField(),
      });
    },
    [],
  );

  const removeBank = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  /**
   * Registra o pagamento da fatura/dívida de um banco: abate o saldo anterior
   * (se houver) e sempre debita o valor pago do saldo em conta desse banco.
   */
  const payFatura = useCallback(
    async (bancoId: string, valor: number) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const bankRef = doc(db, COLLECTION, bancoId);
        const bankSnap = await transaction.get(bankRef);
        const saldoDevedor = (bankSnap.data()?.saldoDevedor as number) ?? 0;
        const abatimentoAnterior = Math.min(valor, saldoDevedor);
        if (abatimentoAnterior > 0) {
          transaction.update(bankRef, { saldoDevedor: increment(-abatimentoAnterior) });
        }
        transaction.set(doc(collection(db, "bankPayments")), {
          userId: user.uid,
          bancoId,
          valor,
          data: todayIsoDate(),
          criadoEm: Date.now(),
        });
      });
    },
    [user],
  );

  return {
    banks,
    loading,
    addBank,
    renameBank,
    updateBank,
    removeBank,
    payFatura,
  };
}
