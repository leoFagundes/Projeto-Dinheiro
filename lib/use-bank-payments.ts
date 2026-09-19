"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { BankPayment } from "./types";

const COLLECTION = "bankPayments";

/** Histórico de pagamentos de fatura/dívida, usado para calcular o saldo em conta. */
export function useBankPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<BankPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<BankPayment, "id">),
      }));
      setPayments(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  return { payments, loading };
}
