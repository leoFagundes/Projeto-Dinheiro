"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { formatCurrency } from "@/lib/format";
import type { Bank } from "@/lib/types";

export function BankDebtSection({
  banks,
  gastosMesPorBanco,
  onAdjust,
}: {
  banks: Bank[];
  gastosMesPorBanco: Map<string, number>;
  onAdjust: (id: string, delta: number) => Promise<void>;
}) {
  const [adjusting, setAdjusting] = useState<Bank | null>(null);

  if (banks.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="Nenhum banco cadastrado"
        description="Cadastre um banco em Configurações para acompanhar sua fatura."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {banks.map((banco) => {
          const fatura = gastosMesPorBanco.get(banco.id) ?? 0;
          return (
            <li key={banco.id}>
              <button
                onClick={() => setAdjusting(banco)}
                className="flex w-full items-center justify-between rounded-2xl bg-bg px-4 py-3 text-left transition-transform active:scale-[0.98]"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Landmark size={16} className="text-ink-muted" />
                  <span>
                    {banco.nome}
                    {banco.saldoDevedor > 0 && (
                      <span className="block text-xs text-ink-muted">
                        + {formatCurrency(banco.saldoDevedor)} de saldo anterior
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-medium text-negative">
                    {formatCurrency(fatura)}
                  </span>
                  <span className="block text-[11px] text-ink-muted">fatura deste mês</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Link
        href="/configuracoes"
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        Gerenciar bancos
      </Link>

      <AdjustDebtSheet banco={adjusting} onAdjust={onAdjust} onClose={() => setAdjusting(null)} />
    </div>
  );
}

function AdjustDebtSheet({
  banco,
  onAdjust,
  onClose,
}: {
  banco: Bank | null;
  onAdjust: (id: string, delta: number) => Promise<void>;
  onClose: () => void;
}) {
  const [modo, setModo] = useState<"divida" | "pagamento">("divida");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!banco) return;
    const parsed = Number(valor.replace(",", "."));
    if (!parsed || parsed <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (modo === "pagamento" && parsed > banco.saldoDevedor) {
      toast.error("O valor é maior que o saldo anterior.");
      return;
    }

    setSaving(true);
    try {
      await onAdjust(banco.id, modo === "divida" ? parsed : -parsed);
      toast.success(modo === "divida" ? "Saldo anterior atualizado." : "Pagamento registrado.");
      setValor("");
      setModo("divida");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar o banco.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={banco !== null} onClose={onClose}>
      <p className="font-medium">{banco?.nome}</p>
      <p className="mb-4 text-xs text-ink-muted">
        A fatura do mês é calculada a partir das despesas vinculadas a este banco. Use os
        botões abaixo só para ajustar um saldo anterior (dívida que não veio de uma
        transação registrada aqui).
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setModo("divida")}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            modo === "divida"
              ? "border-negative bg-negative-soft text-negative"
              : "border-border text-ink-muted"
          }`}
        >
          Adicionar saldo
        </button>
        <button
          type="button"
          onClick={() => setModo("pagamento")}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            modo === "pagamento"
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-border text-ink-muted"
          }`}
        >
          Registrar pagamento
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
