"use client";

import { createContext, useContext, useState } from "react";

type VisibilityContextValue = {
  hidden: boolean;
  toggle: () => void;
};

const VisibilityContext = createContext<VisibilityContextValue | null>(null);
const STORAGE_KEY = "valoresOcultos";

function readStoredHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Preferência (só deste aparelho, não sincroniza) de esconder valores em
 * dinheiro na tela — útil pra usar o app em público sem expor números. Essa
 * tela só existe atrás do login (área protegida sempre renderiza null até o
 * cliente confirmar autenticação), então ler localStorage já na primeira
 * renderização não gera divergência entre servidor e cliente.
 */
export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(readStoredHidden);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // segue o baile sem persistir
      }
      return next;
    });
  }

  return (
    <VisibilityContext.Provider value={{ hidden, toggle }}>{children}</VisibilityContext.Provider>
  );
}

export function useValuesVisibility(): VisibilityContextValue {
  const context = useContext(VisibilityContext);
  if (!context) {
    throw new Error("useValuesVisibility deve ser usado dentro de um VisibilityProvider");
  }
  return context;
}
