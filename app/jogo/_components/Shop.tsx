"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Shuffle, Sparkles, Store, Waves } from "lucide-react";
import { useGameScores } from "@/lib/use-game-scores";
import { BIRD_SKINS, DEFAULT_SKIN_ID } from "@/lib/shop-items";
import { GAME_MODES, DEFAULT_MODE_ID, type GameModeId } from "@/lib/game-modes";
import { BirdIcon } from "@/app/_components/BirdIcon";
import { BottomSheet } from "@/app/_components/BottomSheet";

const MODE_ICONS: Record<GameModeId, typeof Waves> = {
  classico: Sparkles,
  oscilante: Waves,
  caotico: Shuffle,
};

type Tab = "passarinhos" | "modos";

export function Shop({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { myCoins, ownedItems, equippedBird, purchaseItem, equipBird } = useGameScores();
  const [tab, setTab] = useState<Tab>("passarinhos");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleBuy(id: string, preco: number, autoEquip: boolean) {
    if (myCoins < preco) {
      toast.error("Moedas insuficientes.");
      return;
    }
    setPendingId(id);
    try {
      const ok = await purchaseItem(id, preco);
      if (ok) {
        toast.success("Item comprado!");
        if (autoEquip) void equipBird(id);
      } else {
        toast.error("Não foi possível comprar. Tenta de novo.");
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 font-medium">
          <Store size={18} className="text-accent-strong" />
          Loja
        </p>
        <span className="text-sm font-semibold text-ink">🪙 {myCoins}</span>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("passarinhos")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
            tab === "passarinhos" ? "bg-accent-soft text-accent-strong" : "bg-bg text-ink-muted"
          }`}
        >
          Passarinhos
        </button>
        <button
          onClick={() => setTab("modos")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
            tab === "modos" ? "bg-accent-soft text-accent-strong" : "bg-bg text-ink-muted"
          }`}
        >
          Modos de jogo
        </button>
      </div>

      {tab === "passarinhos" ? (
        <div className="grid grid-cols-2 gap-3">
          {BIRD_SKINS.map((skin) => {
            const owned = skin.id === DEFAULT_SKIN_ID || ownedItems.includes(skin.id);
            const equipped = equippedBird === skin.id;
            const canAfford = myCoins >= skin.preco;

            return (
              <div
                key={skin.id}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center ${
                  equipped ? "border-accent bg-accent-soft" : "border-border bg-bg"
                }`}
              >
                <span className="flex size-14 items-center justify-center rounded-full bg-surface shadow-card">
                  <BirdIcon size={34} corpo={skin.corpo} corpoForte={skin.corpoForte} acessorio={skin.acessorio} />
                </span>
                <p className="text-sm font-medium">{skin.nome}</p>

                {equipped ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-accent-strong">
                    <Check size={14} />
                    Equipado
                  </span>
                ) : owned ? (
                  <button
                    onClick={() => void equipBird(skin.id)}
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-transform active:scale-95 hover:bg-surface"
                  >
                    Equipar
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(skin.id, skin.preco, true)}
                    disabled={pendingId === skin.id || !canAfford}
                    className="rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-50"
                  >
                    {pendingId === skin.id ? "…" : `🪙 ${skin.preco}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {GAME_MODES.map((mode) => {
            const owned = mode.id === DEFAULT_MODE_ID || ownedItems.includes(mode.id);
            const canAfford = myCoins >= mode.preco;
            const Icon = MODE_ICONS[mode.id];

            return (
              <div
                key={mode.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-bg p-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{mode.nome}</p>
                  <p className="text-xs text-ink-muted">{mode.descricao}</p>
                </div>
                {owned ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent-strong">
                    <Check size={14} />
                    Liberado
                  </span>
                ) : (
                  <button
                    onClick={() => handleBuy(mode.id, mode.preco, false)}
                    disabled={pendingId === mode.id || !canAfford}
                    className="shrink-0 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-50"
                  >
                    {pendingId === mode.id ? "…" : `🪙 ${mode.preco}`}
                  </button>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-ink-muted">
            O modo escolhido antes de jogar vale só pra essa partida — o próximo jogo volta pro Clássico.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
