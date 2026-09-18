"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { NewTransaction, Transaction } from "./types";
import {
  addMonthsToKey,
  clampDayToMonth,
  currentMonthKey,
  monthKeyOfIsoDate,
  splitInstallments,
} from "./format";

const COLLECTION = "transactions";

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const generatedRecurringRef = useRef(false);

  useEffect(() => {
    generatedRecurringRef.current = false;

    // Hooks são usados apenas dentro de páginas protegidas, que só renderizam
    // quando há um usuário autenticado — sem usuário, não há o que assinar.
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Transaction, "id">),
        }))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
      setTransactions(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addTransaction = useCallback(
    async (input: NewTransaction) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        ...input,
        userId: user.uid,
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  /** Cria uma compra parcelada: divide o valor total em N despesas, uma por mês. */
  const addInstallmentPurchase = useCallback(
    async (
      input: {
        valorTotal: number;
        categoria: string;
        descricao: string;
        data: string;
        bancoId?: string;
      },
      numParcelas: number,
    ) => {
      if (!user) return;
      const valores = splitInstallments(input.valorTotal, numParcelas);
      const compraId = crypto.randomUUID();
      const baseMonth = monthKeyOfIsoDate(input.data);
      const originalDay = Number(input.data.slice(8, 10));

      await Promise.all(
        valores.map((valor, index) => {
          const monthKey = addMonthsToKey(baseMonth, index);
          const day = clampDayToMonth(monthKey, originalDay);
          return addDoc(collection(db, COLLECTION), {
            userId: user.uid,
            valor,
            tipo: "despesa" as const,
            categoria: input.categoria,
            descricao: input.descricao,
            data: `${monthKey}-${day}`,
            recorrente: false,
            compraId,
            parcelaAtual: index + 1,
            parcelaTotal: numParcelas,
            ...(input.bancoId ? { bancoId: input.bancoId, formaPagamento: "credito" } : {}),
            criadoEm: Date.now(),
          });
        }),
      );
    },
    [user],
  );

  const updateTransaction = useCallback(
    async (id: string, input: Partial<NewTransaction>) => {
      await updateDoc(doc(db, COLLECTION, id), input);
    },
    [],
  );

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  // O app não tem backend agendado, então cada template recorrente ganha sua
  // instância do mês atual assim que o usuário abre o app, uma vez por sessão.
  useEffect(() => {
    if (loading || !user || generatedRecurringRef.current) return;
    generatedRecurringRef.current = true;

    const thisMonth = currentMonthKey();
    const templates = transactions.filter(
      (t) => t.recorrente && !t.recorrenteOrigemId,
    );

    for (const template of templates) {
      if (monthKeyOfIsoDate(template.data) === thisMonth) continue;

      const alreadyExists = transactions.some(
        (t) =>
          t.recorrenteOrigemId === template.id &&
          monthKeyOfIsoDate(t.data) === thisMonth,
      );
      if (alreadyExists) continue;

      const originalDay = Number(template.data.slice(8, 10));
      const day = clampDayToMonth(thisMonth, originalDay);

      addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        valor: template.valor,
        tipo: template.tipo,
        categoria: template.categoria,
        descricao: template.descricao,
        data: `${thisMonth}-${day}`,
        recorrente: true,
        recorrenteOrigemId: template.id,
        ...(template.bancoId ? { bancoId: template.bancoId } : {}),
        criadoEm: Date.now(),
      });
    }
  }, [loading, user, transactions]);

  return {
    transactions,
    loading,
    addTransaction,
    addInstallmentPurchase,
    updateTransaction,
    deleteTransaction,
  };
}
