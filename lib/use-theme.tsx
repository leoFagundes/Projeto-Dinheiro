"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "temaPreferencia";
const COLLECTION = "userPreferences";

function readStoredTheme(): ThemePreference {
  // Sem preferência salva (conta nova ou nunca mexeu em Aparência): claro
  // por padrão, sem seguir o sistema — só quem escolhe "Sistema" de
  // propósito é que segue o SO.
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "light";
  } catch {
    return "light";
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Preferência de tema por conta (guardada em `userPreferences/{uid}`, não só
 * neste aparelho) — o localStorage só serve de cache pra aplicar o tema certo
 * já no primeiro paint, antes do Firestore responder, evitando o "flash" de
 * claro em quem usa escuro. Firestore é sempre a fonte da verdade.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, COLLECTION, user.uid), (snap) => {
      const saved = snap.data()?.theme as ThemePreference | undefined;
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeState(saved);
      }
    });
    return unsubscribe;
  }, [user]);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  async function setTheme(next: ThemePreference) {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // sem persistência local, tudo bem — Firestore continua sendo a fonte da verdade
    }
    if (user) {
      await setDoc(doc(db, COLLECTION, user.uid), { theme: next }, { merge: true });
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
}
