"use client";

import { useState } from "react";

/**
 * Rastreia (por aparelho, via localStorage) se o usuário já "viu" uma feature
 * nova, pra sumir com o badge "novo" depois do primeiro uso. Lê o
 * localStorage direto no inicializador do useState (não num efeito) — como
 * este hook só é usado em componentes que nunca renderizam no servidor,
 * não gera divergência entre servidor e cliente.
 */
export function useSeenFeature(key: string) {
  const storageKey = `visto:${key}`;
  const [seen, setSeen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return true;
    }
  });

  function markSeen() {
    setSeen(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // sem persistência, tudo bem — só volta a aparecer na próxima visita
    }
  }

  return { seen, markSeen };
}
