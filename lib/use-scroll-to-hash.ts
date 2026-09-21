"use client";

import { useEffect } from "react";

/**
 * Rola até o elemento indicado pelo #hash da URL, refazendo a rolagem
 * enquanto a altura da página ainda estiver mudando. Sem isso, seções que
 * carregam dados do Firestore de forma assíncrona (ex: Categorias, Bancos)
 * crescem DEPOIS que o navegador já rolou pra posição antiga, e o alvo
 * (ex: "Caixinhas") acaba ficando mais embaixo do que onde a página parou.
 */
export function useScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const INTERVAL_MS = 150;
    const MAX_MS = 2500;
    const STABLE_CHECKS_NEEDED = 2;

    let lastHeight = -1;
    let stableChecks = 0;
    let elapsed = 0;

    const id = setInterval(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });

      const height = document.documentElement.scrollHeight;
      if (height === lastHeight) {
        stableChecks += 1;
      } else {
        stableChecks = 0;
        lastHeight = height;
      }

      elapsed += INTERVAL_MS;
      if (stableChecks >= STABLE_CHECKS_NEEDED || elapsed >= MAX_MS) {
        clearInterval(id);
      }
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, []);
}
