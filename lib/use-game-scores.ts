"use client";

import { useCallback, useEffect, useState } from "react";
import {
  arrayUnion,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import { DEFAULT_SKIN_ID } from "./shop-items";
import type { GameModeId } from "./game-modes";
import type { GameScore } from "./types";

const COLLECTION = "gameScores";

/**
 * Ranking compartilhado do easter egg pra UM modo de jogo — qualquer conta
 * pode ler (é o ponto: comparar com os outros perfis), mas o app só deixa
 * escolher abas de modos que o PRÓPRIO usuário já destravou (ver
 * Leaderboard.tsx). orderBy num campo aninhado que nem todo mundo tem
 * (pontuacoesPorModo.X) já filtra sozinho pra só quem jogou aquele modo.
 */
export function useLeaderboard(modeId: GameModeId) {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sem "setLoading(true)" aqui de propósito (dispararia set-state direto
    // no corpo do efeito) — ao trocar de aba, a lista antiga fica visível
    // por uma fração de segundo até o snapshot da aba nova chegar, o que é
    // rápido o bastante pra não incomodar.
    const q = query(
      collection(db, COLLECTION),
      orderBy(`pontuacoesPorModo.${modeId}`, "desc"),
      limit(20),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScores(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<GameScore, "id">),
        })),
      );
      setLoading(false);
    });
    return unsubscribe;
  }, [modeId]);

  return { scores, loading };
}

/**
 * Recorde (por modo), moedas e loja da própria conta no easter egg.
 * `bestByMode`/`myCoins`/`ownedItems`/`equippedBird` refletem o que já está
 * salvo (ao vivo, via onSnapshot); `submitRun` grava o resultado de uma
 * partida NUM MODO ESPECÍFICO — o recorde daquele modo só é atualizado se a
 * pontuação bateu o que já estava salvo pra ele (a regra do Firestore
 * recusa sozinha uma pontuação menor em qualquer modo), mas as moedas
 * sempre acumulam, mesmo numa partida fraca. `purchaseItem`/`equipBird` são
 * a loja: comprar desconta moedas e adiciona 1 item novo (a regra recusa
 * qualquer outra combinação), equipar só troca qual skin está ativo.
 */
export function useGameScores() {
  const { user, nickname } = useAuth();
  const [bestByMode, setBestByMode] = useState<Partial<Record<GameModeId, number>>>({});
  const [myCoins, setMyCoins] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([DEFAULT_SKIN_ID]);
  const [equippedBird, setEquippedBirdState] = useState(DEFAULT_SKIN_ID);

  useEffect(() => {
    // Sem usuário não há o que assinar — o estado fica no `useState(...)`
    // inicial (não precisa "resetar" aqui: trocar de conta sempre passa por
    // /login, que desmonta este hook e remonta do zero na conta nova).
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, COLLECTION, user.uid), (snap) => {
      const data = snap.data();
      setBestByMode((data?.pontuacoesPorModo as Partial<Record<GameModeId, number>> | undefined) ?? {});
      setMyCoins((data?.moedas as number | undefined) ?? 0);
      const stored = (data?.itensComprados as string[] | undefined) ?? [];
      setOwnedItems(stored.includes(DEFAULT_SKIN_ID) ? stored : [DEFAULT_SKIN_ID, ...stored]);
      setEquippedBirdState((data?.passarinhoEquipado as string | undefined) ?? DEFAULT_SKIN_ID);
    });
    return unsubscribe;
  }, [user]);

  const submitRun = useCallback(
    async (mode: GameModeId, score: number, coinsEarned: number) => {
      if (!user) return;
      const currentBest = bestByMode[mode] ?? 0;
      const isNewBest = score > currentBest;
      if (!isNewBest && coinsEarned <= 0) return; // nada novo pra salvar
      const ref = doc(db, COLLECTION, user.uid);
      const payload: {
        nickname: string;
        atualizadoEm: number;
        moedas?: ReturnType<typeof increment>;
        // Objeto aninhado de verdade (não uma chave "pontuacoesPorModo.x")
        // — setDoc com merge:true faz merge PROFUNDO de mapas aninhados
        // sozinho, preservando os outros modos automaticamente. Uma chave
        // com ponto no nome (o truque que só vale pra updateDoc) criaria um
        // campo literal chamado "pontuacoesPorModo.classico" em vez de
        // aninhar de verdade — e foi exatamente esse o bug: a escrita não
        // dava erro, mas o app nunca lia de volta o valor certo.
        pontuacoesPorModo?: Partial<Record<GameModeId, number>>;
      } = {
        nickname: nickname || user.email || "Anônimo",
        atualizadoEm: Date.now(),
      };
      if (isNewBest) payload.pontuacoesPorModo = { [mode]: score };
      if (coinsEarned > 0) payload.moedas = increment(coinsEarned);
      try {
        await setDoc(ref, payload, { merge: true });
      } catch (error) {
        // Não trava o jogo por causa disso — mas loga no console pra dar
        // pra diagnosticar (ex: regra do Firestore ainda não publicada).
        console.error("Não foi possível salvar o progresso do jogo:", error);
      }
    },
    [user, nickname, bestByMode],
  );

  /**
   * Compra genérica — serve tanto pra skin (lib/shop-items.ts) quanto pra
   * modo de jogo (lib/game-modes.ts): os dois vivem na mesma lista
   * itensComprados e seguem a mesma regra do Firestore (moedas descem, 1
   * item novo entra), então o hook não precisa saber de qual catálogo o id
   * veio — só recebe o preço já resolvido por quem chamou.
   */
  const purchaseItem = useCallback(
    async (id: string, preco: number): Promise<boolean> => {
      if (!user || ownedItems.includes(id) || myCoins < preco) return false;
      const ref = doc(db, COLLECTION, user.uid);
      try {
        await setDoc(
          ref,
          {
            nickname: nickname || user.email || "Anônimo",
            atualizadoEm: Date.now(),
            moedas: increment(-preco),
            itensComprados: arrayUnion(id),
          },
          { merge: true },
        );
        return true;
      } catch (error) {
        console.error("Não foi possível comprar o item:", error);
        return false;
      }
    },
    [user, nickname, ownedItems, myCoins],
  );

  const equipBird = useCallback(
    async (id: string) => {
      if (!user) return;
      if (id !== DEFAULT_SKIN_ID && !ownedItems.includes(id)) return; // só equipa o que já é dono
      try {
        await setDoc(doc(db, COLLECTION, user.uid), { passarinhoEquipado: id }, { merge: true });
      } catch (error) {
        console.error("Não foi possível equipar o item:", error);
      }
    },
    [user, ownedItems],
  );

  return { submitRun, bestByMode, myCoins, ownedItems, equippedBird, purchaseItem, equipBird };
}
