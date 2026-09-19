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
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_ICON } from "./categories";
import type { Category, TransactionType } from "./types";

const COLLECTION = "categories";

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  useEffect(() => {
    seededRef.current = false;

    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Category, "id">),
      }));
      setCategories(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  // Popula as categorias padrão na primeira vez que uma conta é usada.
  useEffect(() => {
    if (loading || !user || seededRef.current || categories.length > 0) return;
    seededRef.current = true;

    for (const categoria of DEFAULT_CATEGORIES) {
      addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome: categoria.nome,
        tipo: categoria.tipo,
        icone: categoria.icone,
        criadoEm: Date.now(),
      });
    }
  }, [loading, user, categories]);

  const addCategory = useCallback(
    async (nome: string, tipo: TransactionType, icone: string = FALLBACK_CATEGORY_ICON) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        tipo,
        icone,
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  const removeCategory = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  const renameCategory = useCallback(async (id: string, nome: string) => {
    await updateDoc(doc(db, COLLECTION, id), { nome });
  }, []);

  const updateCategory = useCallback(
    async (id: string, input: { nome: string; icone: string }) => {
      await updateDoc(doc(db, COLLECTION, id), input);
    },
    [],
  );

  const byType = useCallback(
    (tipo: TransactionType) => categories.filter((c) => c.tipo === tipo),
    [categories],
  );

  return {
    categories,
    loading,
    addCategory,
    removeCategory,
    renameCategory,
    updateCategory,
    byType,
  };
}
