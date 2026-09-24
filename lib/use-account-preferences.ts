"use client";

import { useEffect, useState } from "react";
import { deleteField, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";

const COLLECTION = "userPreferences";

/**
 * Preferências de conta que não são o tema (que já tem seu próprio provider
 * em `use-theme.tsx`) — mesmo documento `userPreferences/{uid}`, escritas em
 * merge, então os dois hooks não pisam um no outro.
 */
export function useAccountPreferences() {
  const { user } = useAuth();
  const [orcamentoMensal, setOrcamentoMensalState] = useState<number | undefined>(undefined);
  const [notificacoesFatura, setNotificacoesFaturaState] = useState(false);
  // jogoDesbloqueado: true assim que a conta entra em /jogo pela 1ª vez —
  // depois disso, o "?" escondido em Ajustes vira um card de verdade.
  const [jogoDesbloqueado, setJogoDesbloqueadoState] = useState(false);
  const [jogoAtalhoMenu, setJogoAtalhoMenuState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, COLLECTION, user.uid), (snap) => {
      const data = snap.data();
      setOrcamentoMensalState((data?.orcamentoMensal as number | undefined) ?? undefined);
      setNotificacoesFaturaState(Boolean(data?.notificacoesFatura));
      setJogoDesbloqueadoState(Boolean(data?.jogoDesbloqueado));
      setJogoAtalhoMenuState(Boolean(data?.jogoAtalhoMenu));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  async function setOrcamentoMensal(valor: number) {
    if (!user) return;
    await setDoc(
      doc(db, COLLECTION, user.uid),
      { orcamentoMensal: valor > 0 ? valor : deleteField() },
      { merge: true },
    );
  }

  async function setNotificacoesFatura(ativo: boolean) {
    if (!user) return;
    await setDoc(doc(db, COLLECTION, user.uid), { notificacoesFatura: ativo }, { merge: true });
  }

  /** Chamado ao entrar em /jogo — idempotente, seguro de chamar toda vez. */
  async function markJogoDesbloqueado() {
    if (!user) return;
    await setDoc(doc(db, COLLECTION, user.uid), { jogoDesbloqueado: true }, { merge: true });
  }

  async function setJogoAtalhoMenu(ativo: boolean) {
    if (!user) return;
    await setDoc(doc(db, COLLECTION, user.uid), { jogoAtalhoMenu: ativo }, { merge: true });
  }

  return {
    orcamentoMensal,
    notificacoesFatura,
    jogoDesbloqueado,
    jogoAtalhoMenu,
    loading,
    setOrcamentoMensal,
    setNotificacoesFatura,
    markJogoDesbloqueado,
    setJogoAtalhoMenu,
  };
}
