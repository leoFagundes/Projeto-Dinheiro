"use client";

import {
  type DocumentReference,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

/** Todas as coleções com documentos ligados a um usuário (via campo `userId`) — usado por backup, importação e exclusão de conta. */
const USER_SCOPED_COLLECTIONS = [
  "transactions",
  "categories",
  "categoryGoals",
  "categoryGoalOverrides",
  "banks",
  "pockets",
  "pocketMovements",
  "pocketTransfers",
  "bankPayments",
  "bankTransfers",
  "investments",
  "investmentMovements",
  "investmentGoals",
  "patrimonioSnapshots",
] as const;

const BATCH_SIZE = 450; // limite do Firestore é 500 operações por batch

export type BackupData = {
  version: 1;
  exportedAt: string;
  collections: Record<string, Record<string, unknown>[]>;
  userPreferences?: Record<string, unknown>;
};

/** Junta todos os dados do usuário num único objeto, pronto pra virar arquivo. */
export async function buildBackup(uid: string): Promise<BackupData> {
  const collections: Record<string, Record<string, unknown>[]> = {};
  for (const name of USER_SCOPED_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where("userId", "==", uid)));
    collections[name] = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }
  const prefsSnap = await getDoc(doc(db, "userPreferences", uid));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections,
    userPreferences: prefsSnap.exists() ? prefsSnap.data() : undefined,
  };
}

export function downloadBackup(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `backup-projeto-dinheiro-${data.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function deleteRefsBatched(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref);
    await batch.commit();
  }
}

/** Apaga TODOS os documentos do usuário em todas as coleções — usado antes de excluir a conta. Irreversível. */
export async function deleteAllUserData(uid: string): Promise<void> {
  for (const name of USER_SCOPED_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where("userId", "==", uid)));
    await deleteRefsBatched(snap.docs.map((docSnap) => docSnap.ref));
  }
  await deleteRefsBatched([doc(db, "userPreferences", uid)]);
}

/**
 * Importa um backup pra dentro da conta atual — sempre ADICIONA aos dados
 * existentes (gera documentos novos, com IDs novos), nunca substitui nem
 * deduplica. Importar o mesmo arquivo duas vezes duplica tudo.
 */
export async function importBackup(uid: string, data: BackupData): Promise<{ total: number }> {
  let total = 0;
  for (const name of USER_SCOPED_COLLECTIONS) {
    const items = data.collections?.[name] ?? [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const rest = { ...(item as Record<string, unknown>) };
        delete rest.id;
        delete rest.userId;
        batch.set(doc(collection(db, name)), { ...rest, userId: uid });
      }
      await batch.commit();
      total += chunk.length;
    }
  }
  if (data.userPreferences) {
    await setDoc(doc(db, "userPreferences", uid), data.userPreferences, { merge: true });
  }
  return { total };
}
