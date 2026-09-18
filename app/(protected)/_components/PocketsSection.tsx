"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { formatCurrency } from "@/lib/format";
import type { Pocket } from "@/lib/types";

export function PocketsSection({
  pockets,
  onAdjust,
}: {
  pockets: Pocket[];
  onAdjust: (id: string, delta: number) => Promise<void>;
}) {
  const [adjusting, setAdjusting] = useState<Pocket | null>(null);

  if (pockets.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title="Nenhuma caixinha ainda"
        description="Crie caixinhas em Configurações para separar dinheiro guardado."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3">
        {pockets.map((pocket) => (
          <li key={pocket.id}>
            <button
              onClick={() => setAdjusting(pocket)}
              className="w-full rounded-card bg-surface p-4 text-left transition-transform active:scale-[0.98]"
            >
              <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                <PiggyBank size={14} />
                {pocket.nome}
              </p>
              <p className="mt-1 text-lg font-semibold text-accent-strong">
                {formatCurrency(pocket.saldo)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <Link
        href="/configuracoes"
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        Gerenciar caixinhas
      </Link>

      <AdjustPocketSheet pocket={adjusting} onAdjust={onAdjust} onClose={() => setAdjusting(null)} />
    </div>
  );
}

function AdjustPocketSheet({
  pocket,
  onAdjust,
  onClose,
}: {
  pocket: Pocket | null;
  onAdjust: (id: string, delta: number) => Promise<void>;
  onClose: () => void;
}) {
  const [modo, setModo] = useState<"adicionar" | "retirar">("adicionar");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!pocket) return;
    const parsed = Number(valor.replace(",", "."));
    if (!parsed || parsed <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (modo === "retirar" && parsed > pocket.saldo) {
      toast.error("Saldo insuficiente nessa caixinha.");
      return;
    }

    setSaving(true);
    try {
      await onAdjust(pocket.id, modo === "adicionar" ? parsed : -parsed);
      toast.success(modo === "adicionar" ? "Valor adicionado." : "Valor retirado.");
      setValor("");
      setModo("adicionar");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar a caixinha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={pocket !== null} onClose={onClose}>
      <p className="mb-4 font-medium">{pocket?.nome}</p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setModo("adicionar")}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            modo === "adicionar"
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-border text-ink-muted"
          }`}
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => setModo("retirar")}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            modo === "retirar"
              ? "border-negative bg-negative-soft text-negative"
              : "border-border text-ink-muted"
          }`}
        >
          Retirar
        </button>
      </div>

      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="R$ 0,00"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        className="mt-3 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
      >
        Confirmar
      </button>
    </BottomSheet>
  );
}
