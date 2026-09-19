"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeftRight, Landmark, Receipt } from "lucide-react";
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
  onTransfer,
}: {
  banks: Bank[];
  gastosMesPorBanco: Map<string, number>;
  saldoContaPorBanco: Map<string, number>;
  onPayFatura: (id: string, valor: number) => Promise<void>;
  onTransfer: (fromBancoId: string, toBancoId: string, valor: number) => Promise<void>;
}) {
  const [paying, setPaying] = useState<Bank | null>(null);
  const [transferring, setTransferring] = useState(false);

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
          const saldoConta = saldoContaPorBanco.get(banco.id) ?? 0;
          const totalDevido = fatura + banco.saldoDevedor;
          return (
            <li key={banco.id} className="rounded-card bg-surface px-4 py-3">
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

      <div className="flex items-center gap-4">
        <Link
          href="/configuracoes#bancos"
          className="text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
        >
          Gerenciar bancos
        </Link>
        {banks.length > 1 && (
          <button
            onClick={() => setTransferring(true)}
            className="flex items-center gap-1.5 text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
          >
            <ArrowLeftRight size={14} />
            Transferir entre bancos
          </button>
        )}
      </div>

      <PayFaturaSheet
        banco={paying}
        totalDevido={paying ? (gastosMesPorBanco.get(paying.id) ?? 0) + paying.saldoDevedor : 0}
        onPayFatura={onPayFatura}
        onClose={() => setPaying(null)}
      />

      <TransferBankSheet
        open={transferring}
        banks={banks}
        saldoContaPorBanco={saldoContaPorBanco}
        onTransfer={onTransfer}
        onClose={() => setTransferring(false)}
      />
    </div>
  );
}

function TransferBankSheet({
  open,
  banks,
  saldoContaPorBanco,
  onTransfer,
  onClose,
}: {
  open: boolean;
  banks: Bank[];
  saldoContaPorBanco: Map<string, number>;
  onTransfer: (fromBancoId: string, toBancoId: string, valor: number) => Promise<void>;
  onClose: () => void;
}) {
  const [fromId, setFromId] = useState(banks[0]?.id ?? "");
  const [toId, setToId] = useState(banks[1]?.id ?? "");
  const [valor, setValor] = useState(0);
  const [saving, setSaving] = useState(false);

  const fromBanco = banks.find((b) => b.id === fromId);
  const toBanco = banks.find((b) => b.id === toId);
  const saldoOrigemAtual = saldoContaPorBanco.get(fromId) ?? 0;
  const saldoDestinoAtual = saldoContaPorBanco.get(toId) ?? 0;

  async function handleSave() {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Escolha dois bancos diferentes.");
      return;
    }
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    const saldoOrigem = saldoContaPorBanco.get(fromId) ?? 0;
    if (valor > saldoOrigem) {
      toast.error("Saldo em conta insuficiente nesse banco.");
      return;
    }

    setSaving(true);
    try {
      await onTransfer(fromId, toId, valor);
      toast.success("Transferência feita.");
      setValor(0);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transferir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="mb-4 font-medium">Transferir entre bancos</p>
      <div className="flex flex-col gap-3">
        <select
          value={fromId}
          onChange={(event) => setFromId(event.target.value)}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        >
          {banks.map((banco) => (
            <option key={banco.id} value={banco.id}>
              De: {banco.nome} ({formatCurrency(saldoContaPorBanco.get(banco.id) ?? 0)})
            </option>
          ))}
        </select>
        <select
          value={toId}
          onChange={(event) => setToId(event.target.value)}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        >
          {banks.map((banco) => (
            <option key={banco.id} value={banco.id}>
              Para: {banco.nome} ({formatCurrency(saldoContaPorBanco.get(banco.id) ?? 0)})
            </option>
          ))}
        </select>
        <CurrencyInput
          value={valor}
          onChange={setValor}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        {fromBanco && toBanco && fromId !== toId && valor > 0 && (
          <div className="flex flex-col gap-1 rounded-2xl bg-bg px-4 py-3 text-xs text-ink-muted">
            <span className="flex items-center justify-between">
              <span className="truncate">{fromBanco.nome} depois</span>
              <span
                className={
                  saldoOrigemAtual - valor < 0 ? "font-medium text-negative" : "font-medium text-ink"
                }
              >
                {formatCurrency(saldoOrigemAtual - valor)}
              </span>
            </span>
            <span className="flex items-center justify-between">
              <span className="truncate">{toBanco.nome} depois</span>
              <span className="font-medium text-ink">{formatCurrency(saldoDestinoAtual + valor)}</span>
            </span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
        >
          Transferir
        </button>
      </div>
    </BottomSheet>
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
