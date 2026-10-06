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
import {
  DEFAULT_CATEGORIES,
  FALLBACK_CATEGORY_ICON,
  nextFreeCategoryColor,
  resolveCategoryColors,
  type CategoryColor,
} from "./categories";
import { commitInBackground } from "./firestore-writes";
import type { Category, TransactionType } from "./types";

const COLLECTION = "categories";
const PREFS_COLLECTION = "userPreferences";

// Contas (uid) que já tiveram a checagem de "categorias padrão" feita nesta
// sessão — vale entre todas as instâncias do hook (várias telas usam ao mesmo
// tempo), senão cada uma podia popular as padrão por conta própria.
const checkedDefaults = new Set<string>();
// Mesma ideia para a gravação única das cores (ver efeito abaixo).
const migratedColors = new Set<string>();

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
        DEFAULT_CATEGORIES.forEach((categoria, index) => {
          batch.set(doc(collection(db, COLLECTION)), {
            userId: user.uid,
            nome: categoria.nome,
            tipo: categoria.tipo,
            icone: categoria.icone,
            cor: index,
            criadoEm: Date.now(),
          });
        });
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

  /**
   * Grava em `cor` a cor resolvida de cada categoria que ainda não tem uma
   * (contas de antes das cores) — assim a cor fica fixa: excluir outra
   * categoria não faz as demais trocarem de cor. Cor já escolhida nunca é
   * mexida, mesmo repetida. Uma vez por sessão, só com dados do servidor (o
   * cache pode estar incompleto).
   */
  useEffect(() => {
    if (!user || !synced || migratedColors.has(user.uid) || categories.length === 0) return;
    migratedColors.add(user.uid);
    const colorById = resolveCategoryColors(categories);
    const batch = writeBatch(db);
    let changes = 0;
    for (const categoria of categories) {
      const cor = colorById.get(categoria.id);
      if (cor === undefined || cor === categoria.cor) continue;
      batch.update(doc(db, COLLECTION, categoria.id), { cor });
      changes += 1;
    }
    if (changes === 0) return;
    batch.commit().catch((error) => {
      migratedColors.delete(user.uid);
      console.error("Não foi possível salvar as cores das categorias:", error);
    });
  }, [user, synced, categories]);

  /** Sem `cor`, usa a sugestão padrão: uma cor que nenhuma outra categoria usa. */
  const addCategory = useCallback(
    async (nome: string, tipo: TransactionType, icone: string = FALLBACK_CATEGORY_ICON, cor?: CategoryColor) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        nome,
        tipo,
        icone,
        cor: cor ?? nextFreeCategoryColor(categories),
        criadoEm: Date.now(),
      });
    },
    [user, categories],
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
    async (id: string, input: { nome: string; icone: string; cor?: CategoryColor }) => {
      const { cor, ...rest } = input;
      await updateDoc(doc(db, COLLECTION, id), cor === undefined ? rest : { ...rest, cor });
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
