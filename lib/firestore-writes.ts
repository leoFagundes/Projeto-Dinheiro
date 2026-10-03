"use client";

import { writeBatch, type WriteBatch } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "./firebase";

// Limite do Firestore é 500 operações por batch.
const BATCH_LIMIT = 450;

/** Batches encadeados — abre um novo quando o atual chega no limite de operações do Firestore. */
export function batchBuilder() {
  const batches = [writeBatch(db)];
  let ops = 0;
  return {
    next(): WriteBatch {
      if (ops >= BATCH_LIMIT) {
        batches.push(writeBatch(db));
        ops = 0;
      }
      ops += 1;
      return batches[batches.length - 1];
    },
    batches,
  };
}

/**
 * Envia as escritas ao servidor sem travar a tela esperando a confirmação:
 * o Firestore aplica a mudança localmente na hora (e, com o cache
 * persistente, guarda no aparelho até conseguir enviar — mesmo que o app
 * seja fechado antes). Esperar a confirmação do servidor deixava diálogos
 * "presos" com internet ruim, e o usuário acabava saindo achando que não
 * tinha ido. Se o servidor recusar, a mudança é desfeita sozinha e o
 * usuário é avisado.
 */
export function commitInBackground(batches: WriteBatch[], mensagemErro: string) {
  for (const batch of batches) {
    batch.commit().catch((error) => {
      console.error(mensagemErro, error);
      toast.error(mensagemErro);
    });
  }
}
