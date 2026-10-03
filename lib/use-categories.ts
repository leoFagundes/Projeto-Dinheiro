"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_ICON } from "./categories";
import { commitInBackground } from "./firestore-writes";
import type { Category, TransactionType } from "./types";

const COLLECTION = "categories";
const PREFS_COLLECTION = "userPreferences";

// Contas (uid) que já tiveram a checagem de "categorias padrão" feita nesta
// sessão — vale entre todas as instâncias do hook (várias telas usam ao mesmo
// tempo), senão cada uma podia popular as padrão por conta própria.
const checkedDefaults = new Set<string>();

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, COLLECTION), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Category, "id">),
      }));
      setCategories(items);
      setLoading(false);
      if (!snapshot.metadata.fromCache) setSynced(true);
    });
    return unsubscribe;
  }, [user]);

  /**
   * Popula as categorias padrão SÓ numa conta realmente nova. A marca
   * `categoriasPadraoCriadas` (em userPreferences) é o que diferencia "conta
   * nova" de "usuário que excluiu todas as categorias de propósito" — antes,
   * zerar as categorias fazia as padrão voltarem na próxima abertura. Só
   * decide com dados confirmados pelo servidor (o cache do aparelho pode
   * estar vazio só por ser o primeiro acesso nele).
   */
  useEffect(() => {
    if (!user || !synced || checkingRef.current || checkedDefaults.has(user.uid)) return;
    checkingRef.current = true;
    checkedDefaults.add(user.uid);
    const prefsRef = doc(db, PREFS_COLLECTION, user.uid);

    (async () => {
      const prefs = await getDoc(prefsRef);
      if (prefs.data()?.categoriasPadraoCriadas) return;
      const batch = writeBatch(db);
      if (categories.length === 0) {
        for (const categoria of DEFAULT_CATEGORIES) {
          batch.set(doc(collection(db, COLLECTION)), {
            userId: user.uid,
            nome: categoria.nome,
            tipo: categoria.tipo,
            icone: categoria.icone,
            criadoEm: Date.now(),
          });
        }
      }
      // Conta antiga (já tinha categorias) também ganha a marca, pra que
      // excluir todas depois não traga as padrão de volta.
      batch.set(prefsRef, { categoriasPadraoCriadas: true }, { merge: true });
      await batch.commit();
    })().catch((error) => {
      checkedDefaults.delete(user.uid);
      checkingRef.current = false;
      console.error("Não foi possível verificar as categorias padrão:", error);
    });
  }, [user, synced, categories.length]);

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
    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTION, id));
    commitInBackground([batch], "Não foi possível remover a categoria. Tente de novo.");
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
