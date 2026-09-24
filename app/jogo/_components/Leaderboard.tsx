"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useGameScores, useLeaderboard } from "@/lib/use-game-scores";
import { getSkin } from "@/lib/shop-items";
import { GAME_MODES, DEFAULT_MODE_ID, type GameModeId } from "@/lib/game-modes";
import { BirdIcon } from "@/app/_components/BirdIcon";
import { BottomSheet } from "@/app/_components/BottomSheet";

export function Leaderboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { ownedItems } = useGameScores();
  const [modeId, setModeId] = useState<GameModeId>(DEFAULT_MODE_ID);
  const { scores, loading } = useLeaderboard(modeId);
  // Só mostra aba de modo que a PRÓPRIA conta já destravou — não é uma
  // restrição de segurança (o documento inteiro já é de leitura aberta),
  // só não faz sentido oferecer ranking de um modo que você nem pode jogar.
  const ownedModes = GAME_MODES.filter((mode) => mode.id === DEFAULT_MODE_ID || ownedItems.includes(mode.id));

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="mb-3 flex items-center gap-2 font-medium">
        <Trophy size={18} className="text-accent-strong" />
        Ranking
      </p>

      {ownedModes.length > 1 && (
        <div className="mb-3 flex gap-2">
          {ownedModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setModeId(mode.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                modeId === mode.id ? "bg-accent-soft text-accent-strong" : "bg-bg text-ink-muted"
              }`}
            >
              {mode.nome}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando…</p>
      ) : scores.length === 0 ? (
        <p className="text-sm text-ink-muted">Ninguém jogou esse modo ainda — seja o primeiro!</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {scores.map((entry, index) => {
            const skin = getSkin(entry.passarinhoEquipado);
            return (
              <li
                key={entry.id}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${
                  entry.id === user?.uid ? "bg-accent-soft text-accent-strong" : "bg-bg"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-6 shrink-0 text-xs text-ink-muted">{index + 1}º</span>
                  <BirdIcon
                    size={20}
                    className="shrink-0"
                    corpo={skin.corpo}
                    corpoForte={skin.corpoForte}
                    acessorio={skin.acessorio}
                  />
                  <span className="truncate">{entry.nickname}</span>
                </span>
                <span className="shrink-0 font-semibold">{entry.pontuacoesPorModo?.[modeId] ?? 0}</span>
              </li>
            );
          })}
        </ol>
      )}
    </BottomSheet>
  );
}
