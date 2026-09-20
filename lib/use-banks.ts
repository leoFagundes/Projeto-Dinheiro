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
import type { Bank, BankPayment, BankTransfer } from "./types";

const COLLECTION = "banks";

export function useBanks() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Bank, "id">),
        }))
        .sort((a, b) => a.criadoEm - b.criadoEm);
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

  const setBankOculto = useCallback(async (id: string, oculto: boolean) => {
    await updateDoc(doc(db, COLLECTION, id), oculto ? { oculto: true } : { oculto: deleteField() });
  }, []);

  /**
   * Registra o pagamento da fatura/dívida de um banco: abate o saldo anterior
   * primeiro (se houver) e o restante conta como pago da fatura deste mês —
   * debita o valor total do saldo em conta e desconta da fatura exibida.
   */
  const payFatura = useCallback(
    async (bancoId: string, valor: number, data: string = todayIsoDate()) => {
      if (!user) return;
      await runTransaction(db, async (transaction) => {
        const bankRef = doc(db, COLLECTION, bancoId);
        const bankSnap = await transaction.get(bankRef);
        const saldoDevedor = (bankSnap.data()?.saldoDevedor as number) ?? 0;
        const abatimentoAnterior = Math.min(valor, saldoDevedor);
        const aplicadoFatura = valor - abatimentoAnterior;
        if (abatimentoAnterior > 0) {
          transaction.update(bankRef, { saldoDevedor: increment(-abatimentoAnterior) });
        }
        transaction.set(doc(collection(db, "bankPayments")), {
          userId: user.uid,
          bancoId,
          valor,
          aplicadoFatura,
          tipo: "pagamento",
          data,
          criadoEm: Date.now(),
        });
      });
    },
    [user],
  );

  /**
   * Exclui um pagamento/ajuste de fatura, desfazendo o abatimento do saldo
   * anterior que ele tiver aplicado — sem isso, um lançamento errado nunca
   * podia ser corrigido, só compensado com outro ajuste manual.
   */
  const deleteBankPayment = useCallback(async (payment: BankPayment) => {
    const abatimentoAnterior = payment.valor - (payment.aplicadoFatura ?? 0);
    await runTransaction(db, async (transaction) => {
      if (abatimentoAnterior !== 0) {
        transaction.update(doc(db, COLLECTION, payment.bancoId), {
          saldoDevedor: increment(abatimentoAnterior),
        });
      }
      transaction.delete(doc(db, "bankPayments", payment.id));
    });
  }, []);

  /**
   * Corrige na mão a fatura exibida deste mês (sem mexer no saldo em conta) —
   * registra só a diferença entre o valor atual e o informado, do mesmo jeito
   * que o rendimento de caixinhas/investimentos funciona.
   */
  const setFaturaAjusteManual = useCallback(
    async (bancoId: string, delta: number) => {
      if (!user || delta === 0) return;
      await addDoc(collection(db, "bankPayments"), {
        userId: user.uid,
        bancoId,
        valor: 0,
        aplicadoFatura: delta,
        tipo: "ajuste",
        data: todayIsoDate(),
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  /** Transfere saldo em conta de um banco para outro. */
  const transferBetweenBanks = useCallback(
    async (fromBancoId: string, toBancoId: string, valor: number, data: string = todayIsoDate()) => {
      if (!user) return;
      await addDoc(collection(db, "bankTransfers"), {
        userId: user.uid,
        fromBancoId,
        toBancoId,
        valor,
        data,
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  /**
   * Exclui uma transferência entre bancos. O saldo em conta é calculado
   * dinamicamente a partir da lista de transferências, então excluir o
   * registro já reverte o efeito nos dois bancos sozinho.
   */
  const deleteBankTransfer = useCallback(async (transfer: BankTransfer) => {
    await deleteDoc(doc(db, "bankTransfers", transfer.id));
  }, []);

  return {
    banks,
    loading,
    addBank,
    renameBank,
    updateBank,
    removeBank,
    setBankOculto,
    payFatura,
    deleteBankPayment,
    setFaturaAjusteManual,
    transferBetweenBanks,
    deleteBankTransfer,
  };
}
