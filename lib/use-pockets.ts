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
import type { Pocket, PocketMovement, PocketTransfer } from "./types";

const COLLECTION = "pockets";

export function usePockets() {
  const { user } = useAuth();
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Pocket, "id">),
        }))
        .sort((a, b) => a.criadoEm - b.criadoEm);
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

  const setPocketOculto = useCallback(async (id: string, oculto: boolean) => {
    await updateDoc(doc(db, COLLECTION, id), oculto ? { oculto: true } : { oculto: deleteField() });
  }, []);

  /**
   * Move dinheiro de uma caixinha para outra de forma atômica, registrando a
   * transferência (sem isso, ela não aparecia em lugar nenhum e não dava pra
   * desfazer).
   */
  const transferBetweenPockets = useCallback(
    async (fromId: string, toId: string, valor: number, data: string = todayIsoDate()) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const fromRef = doc(db, COLLECTION, fromId);
        const fromSnap = await transaction.get(fromRef);
        const saldoAtual = (fromSnap.data()?.saldo as number) ?? 0;
        if (valor > saldoAtual) {
          throw new Error("Saldo insuficiente para transferir.");
        }
        transaction.update(fromRef, { saldo: increment(-valor) });
        transaction.update(doc(db, COLLECTION, toId), { saldo: increment(valor) });
        transaction.set(doc(collection(db, "pocketTransfers")), {
          userId: user.uid,
          fromPocketId: fromId,
          toPocketId: toId,
          valor,
          data,
          criadoEm: Date.now(),
        });
      });
    },
    [user],
  );

  /** Desfaz uma transferência entre caixinhas, devolvendo o saldo pra origem. */
  const deletePocketTransfer = useCallback(async (transfer: PocketTransfer) => {
    await runTransaction(db, async (transaction) => {
      transaction.update(doc(db, COLLECTION, transfer.fromPocketId), {
        saldo: increment(transfer.valor),
      });
      transaction.update(doc(db, COLLECTION, transfer.toPocketId), {
        saldo: increment(-transfer.valor),
      });
      transaction.delete(doc(db, "pocketTransfers", transfer.id));
    });
  }, []);

  /**
   * Deposita ou retira dinheiro de uma caixinha vinculando o movimento a um
   * banco, para que o saldo em conta desse banco reflita a transferência.
   */
  const moveFunds = useCallback(
    async (
      pocketId: string,
      bancoId: string,
      tipo: "deposito" | "retirada",
      valor: number,
      data: string = todayIsoDate(),
    ) => {
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
          data,
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

  /** Exclui um movimento (depósito/retirada/rendimento), desfazendo o efeito no saldo da caixinha. */
  const deletePocketMovement = useCallback(async (movement: PocketMovement) => {
    const delta = movement.tipo === "retirada" ? movement.valor : -movement.valor;
    await runTransaction(db, async (transaction) => {
      transaction.update(doc(db, COLLECTION, movement.pocketId), { saldo: increment(delta) });
      transaction.delete(doc(db, "pocketMovements", movement.id));
    });
  }, []);

  return {
    pockets,
    loading,
    addPocket,
    adjustSaldo,
    updatePocket,
    removePocket,
    setPocketOculto,
    transferBetweenPockets,
    deletePocketTransfer,
    moveFunds,
    registrarRendimento,
    deletePocketMovement,
  };
}
