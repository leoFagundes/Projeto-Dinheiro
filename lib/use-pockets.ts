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

  /**
   * Deposita ou retira dinheiro de uma caixinha vinculando o movimento a um
   * banco, para que o saldo em conta desse banco reflita a transferência.
   */
  const moveFunds = useCallback(
    async (pocketId: string, bancoId: string, tipo: "deposito" | "retirada", valor: number) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const pocketRef = doc(db, COLLECTION, pocketId);
        const pocketSnap = await transaction.get(pocketRef);
        const saldoAtual = (pocketSnap.data()?.saldo as number) ?? 0;
        if (tipo === "retirada" && valor > saldoAtual) {
          throw new Error("Saldo insuficiente nessa caixinha.");
        }
        transaction.update(pocketRef, {
          saldo: increment(tipo === "deposito" ? valor : -valor),
        });
        transaction.set(doc(collection(db, "pocketMovements")), {
          userId: user.uid,
          pocketId,
          bancoId,
          tipo,
          valor,
          data: todayIsoDate(),
          criadoEm: Date.now(),
        });
      });
    },
    [user],
  );

  /**
   * Registra o rendimento de uma caixinha: o usuário informa o saldo atual
   * real (ex: depois de render juros) e o delta vira um movimento do tipo
   * "rendimento" — não conta como aporte novo, só ajusta o saldo.
   */
  const registrarRendimento = useCallback(
    async (pocketId: string, novoSaldo: number) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const pocketRef = doc(db, COLLECTION, pocketId);
        const pocketSnap = await transaction.get(pocketRef);
        const saldoAtual = (pocketSnap.data()?.saldo as number) ?? 0;
        const delta = novoSaldo - saldoAtual;
        transaction.update(pocketRef, { saldo: novoSaldo });
        transaction.set(doc(collection(db, "pocketMovements")), {
          userId: user.uid,
          pocketId,
          tipo: "rendimento",
          valor: delta,
          data: todayIsoDate(),
          criadoEm: Date.now(),
        });
      });
    },
    [user],
  );

  return {
    pockets,
    loading,
    addPocket,
    adjustSaldo,
    updatePocket,
    removePocket,
    transferBetweenPockets,
    moveFunds,
    registrarRendimento,
  };
}
