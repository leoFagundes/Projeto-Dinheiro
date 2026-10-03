"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { batchBuilder, commitInBackground } from "./firestore-writes";
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

  /**
   * Remove a caixinha junto com TODO o histórico dela (depósitos, retiradas,
   * rendimentos e transferências de/para ela), num batch atômico. Antes só o
   * documento da caixinha sumia — os movimentos ficavam órfãos, ainda
   * aparecendo no Histórico como "caixinha removida".
   */
  const removePocket = useCallback(
    async (id: string) => {
      if (!user) return;
      const doUsuario = where("userId", "==", user.uid);
      const [movimentos, enviadas, recebidas] = await Promise.all([
        getDocs(query(collection(db, "pocketMovements"), doUsuario, where("pocketId", "==", id))),
        getDocs(query(collection(db, "pocketTransfers"), doUsuario, where("fromPocketId", "==", id))),
        getDocs(query(collection(db, "pocketTransfers"), doUsuario, where("toPocketId", "==", id))),
      ]);
      const exclusao = batchBuilder();
      exclusao.next().delete(doc(db, COLLECTION, id));
      for (const snap of [...movimentos.docs, ...enviadas.docs, ...recebidas.docs]) {
        exclusao.next().delete(snap.ref);
      }
      commitInBackground(exclusao.batches, "Não foi possível remover a caixinha. Tente de novo.");
    },
    [user],
  );

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

  /**
   * Desfaz uma transferência entre caixinhas, devolvendo o saldo pra origem.
   * Batch (não runTransaction): não precisa ler nada antes — e transação do
   * Firestore só funciona online, então com internet ruim a exclusão falhava.
   * Se uma das caixinhas já não existe mais, só apaga o registro.
   */
  const deletePocketTransfer = useCallback(
    async (transfer: PocketTransfer) => {
      // Sem a lista carregada não dá pra saber se as caixinhas existem —
      // melhor recusar do que apagar o registro sem desfazer os saldos.
      if (loading) throw new Error("Caixinhas ainda carregando.");
      const batch = writeBatch(db);
      if (pockets.some((p) => p.id === transfer.fromPocketId)) {
        batch.update(doc(db, COLLECTION, transfer.fromPocketId), { saldo: increment(transfer.valor) });
      }
      if (pockets.some((p) => p.id === transfer.toPocketId)) {
        batch.update(doc(db, COLLECTION, transfer.toPocketId), { saldo: increment(-transfer.valor) });
      }
      batch.delete(doc(db, "pocketTransfers", transfer.id));
      commitInBackground([batch], "Não foi possível excluir a transferência. Tente de novo.");
    },
    [pockets, loading],
  );

  /** Deposita ou retira dinheiro de uma caixinha, registrando o movimento no histórico dela. */
  const moveFunds = useCallback(
    async (pocketId: string, tipo: "deposito" | "retirada", valor: number, data: string = todayIsoDate()) => {
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

  /**
   * Exclui um movimento (depósito/retirada/rendimento), desfazendo o efeito
   * no saldo da caixinha — em batch, pelo mesmo motivo de deletePocketTransfer.
   */
  const deletePocketMovement = useCallback(
    async (movement: PocketMovement) => {
      if (loading) throw new Error("Caixinhas ainda carregando.");
      const delta = movement.tipo === "retirada" ? movement.valor : -movement.valor;
      const batch = writeBatch(db);
      if (pockets.some((p) => p.id === movement.pocketId)) {
        batch.update(doc(db, COLLECTION, movement.pocketId), { saldo: increment(delta) });
      }
      batch.delete(doc(db, "pocketMovements", movement.id));
      commitInBackground([batch], "Não foi possível excluir o movimento. Tente de novo.");
    },
    [pockets, loading],
  );

  return {
    pockets,
    loading,
    addPocket,
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
