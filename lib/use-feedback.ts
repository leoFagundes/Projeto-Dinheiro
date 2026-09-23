"use client";

import { useCallback } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import type { FeedbackTipo } from "./types";

const COLLECTION = "feedback";

/** Só cria — o usuário não lê de volta o que enviou. Gestão fica em /admin. */
export function useFeedback() {
  const { user } = useAuth();

  const sendFeedback = useCallback(
    async (tipo: FeedbackTipo, mensagem: string) => {
      if (!user) return;
      await addDoc(collection(db, COLLECTION), {
        userId: user.uid,
        userEmail: user.email ?? "",
        tipo,
        mensagem,
        status: "novo",
        criadoEm: Date.now(),
      });
    },
    [user],
  );

  return { sendFeedback };
}
