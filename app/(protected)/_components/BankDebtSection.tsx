"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Landmark, Receipt } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { formatCurrency } from "@/lib/format";
import type { Bank } from "@/lib/types";

export function BankDebtSection({
  banks,
  gastosMesPorBanco,
  saldoContaPorBanco,
  onPayFatura,
}: {
  banks: Bank[];
  gastosMesPorBanco: Map<string, number>;
  saldoContaPorBanco: Map<string, number>;
  onPayFatura: (id: string, valor: number) => Promise<void>;
}) {
  const [paying, setPaying] = useState<Bank | null>(null);

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
      <div className="rounded-card bg-surface p-4">
        <ul className="flex flex-col gap-2">
          {banks.map((banco) => {
            const fatura = gastosMesPorBanco.get(banco.id) ?? 0;
            const saldoConta = saldoContaPorBanco.get(banco.id) ?? 0;
            const totalDevido = fatura + banco.saldoDevedor;
            return (
              <li key={banco.id} className="rounded-2xl bg-bg px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Landmark size={16} className="shrink-0 text-ink-muted" />
                    <span className="min-w-0">
                      <span className="block truncate">{banco.nome}</span>
                      <span
                        className={`block text-xs ${saldoConta < 0 ? "text-negative" : "text-ink-muted"}`}
                      >
                        saldo em conta: {formatCurrency(saldoConta)}
                      </span>
                      {banco.saldoDevedor > 0 && (
                        <span className="block text-xs text-ink-muted">
                          + {formatCurrency(banco.saldoDevedor)} de saldo anterior
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-medium text-negative">
                      {formatCurrency(fatura)}
                    </span>
                    <span className="block text-[11px] text-ink-muted">fatura deste mês</span>
                  </span>
                </div>

                {totalDevido > 0 && (
                  <button
                    onClick={() => setPaying(banco)}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-xs font-medium text-accent-strong transition-transform active:scale-[0.98] hover:bg-accent/20"
                  >
                    <Receipt size={14} />
                    Pagar fatura ({formatCurrency(totalDevido)})
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Link
        href="/configuracoes#bancos"
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        Gerenciar bancos
      </Link>

      <PayFaturaSheet
        banco={paying}
        totalDevido={paying ? (gastosMesPorBanco.get(paying.id) ?? 0) + paying.saldoDevedor : 0}
        onPayFatura={onPayFatura}
        onClose={() => setPaying(null)}
      />
    </div>
  );
}

function PayFaturaSheet({
  banco,
  totalDevido,
  onPayFatura,
  onClose,
}: {
  banco: Bank | null;
  totalDevido: number;
  onPayFatura: (id: string, valor: number) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={banco !== null} onClose={onClose}>
      {banco && (
        <PayFaturaFields
          key={banco.id}
          banco={banco}
          totalDevido={totalDevido}
          onPayFatura={onPayFatura}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function PayFaturaFields({
  banco,
  totalDevido,
  onPayFatura,
  onClose,
}: {
  banco: Bank;
  totalDevido: number;
  onPayFatura: (id: string, valor: number) => Promise<void>;
  onClose: () => void;
}) {
  const [valor, setValor] = useState(totalDevido);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (valor > totalDevido) {
      toast.error("O valor é maior que o total devido.");
      return;
    }

    setSaving(true);
    try {
      await onPayFatura(banco.id, valor);
      toast.success("Pagamento registrado — saiu do saldo em conta.");
      onClose();
    } catch {
      toast.error("Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-1 font-medium">Pagar fatura — {banco.nome}</p>
      <p className="mb-4 text-xs text-ink-muted">
        Total devido: {formatCurrency(totalDevido)} (fatura do mês + saldo anterior). Esse valor
        sai do saldo em conta do banco. Pra corrigir manualmente o saldo anterior, use o botão de
        editar em Configurações → Bancos.
      </p>

      <CurrencyInput
        value={valor}
        onChange={setValor}
        className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
      />

      <button
        onClick={handleConfirm}
        disabled={saving}
        className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
      >
        Confirmar pagamento
      </button>
    </>
  );
}
