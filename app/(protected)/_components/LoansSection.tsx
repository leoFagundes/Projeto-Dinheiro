"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Check, HandCoins, Undo2 } from "lucide-react";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { Money, MaskedCurrency } from "@/app/_components/Money";
import { formatDate, todayIsoDate } from "@/lib/format";
import type { LoanSummary } from "@/lib/derived";
import type { Transaction } from "@/lib/types";

function isQuitado(loan: LoanSummary): boolean {
  return loan.parcelasTotal > 0 && loan.parcelasPagas === loan.parcelasTotal;
}

type PayInstallment = (parcelaId: string, valor: number, data: string) => Promise<void>;
type UndoPayment = (parcela: Transaction) => Promise<void>;

/** Seção de empréstimos do Dashboard — só aparece quando há pelo menos um. */
export function LoansSection({
  loans,
  bankNameById,
  onPayInstallment,
  onUndoPayment,
}: {
  loans: LoanSummary[];
  bankNameById: Map<string, string>;
  onPayInstallment: PayInstallment;
  onUndoPayment: UndoPayment;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Deriva do array fresco a cada render (em vez de guardar o objeto
  // selecionado) — assim, pagar uma parcela dentro do modal atualiza o
  // resumo na hora, sem o modal ficar preso numa cópia antiga.
  const selected = loans.find((loan) => loan.id === selectedId) ?? null;

  // Confete só quando um empréstimo vira quitado NESTA sessão — sem essa
  // referência, todo empréstimo que já estava quitado dispararia confete de
  // novo a cada vez que o Dashboard recarrega.
  const celebratedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (celebratedRef.current === null) {
      celebratedRef.current = new Set(loans.filter(isQuitado).map((l) => l.id));
      return;
    }
    for (const loan of loans) {
      if (isQuitado(loan) && !celebratedRef.current.has(loan.id)) {
        celebratedRef.current.add(loan.id);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        toast.success(`"${loan.descricao}" foi totalmente quitado! 🎉`);
      }
    }
  }, [loans]);

  if (loans.length === 0) return null;

  return (
    <section id="emprestimos" className="scroll-mt-20">
      <h2 className="mb-3 text-sm font-medium text-ink-muted">Empréstimos</h2>
      <ul className="flex flex-col gap-2">
        {loans.map((loan) => {
          const percent =
            loan.valorTotalPagar > 0
              ? Math.min((loan.totalPago / loan.valorTotalPagar) * 100, 100)
              : 0;
          const bancoNome = loan.bancoId ? bankNameById.get(loan.bancoId) : undefined;
          const quitado = isQuitado(loan);
          return (
            <li key={loan.id}>
              <button
                onClick={() => setSelectedId(loan.id)}
                className={`w-full rounded-card p-4 text-left shadow-card transition-transform active:scale-[0.98] ${
                  quitado ? "border border-accent bg-accent-soft" : "bg-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                      <HandCoins size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{loan.descricao}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {bancoNome ? `${bancoNome} · ` : ""}
                        {loan.parcelasPagas}/{loan.parcelasTotal} parcelas pagas
                      </span>
                    </span>
                  </span>
                  {quitado ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent-strong">
                      <Check size={14} />
                      Quitado
                    </span>
                  ) : (
                    <span className="shrink-0 text-right">
                      <MaskedCurrency value={loan.restante} className="block text-sm font-medium text-negative" />
                      <span className="block text-[11px] text-ink-muted">restante</span>
                    </span>
                  )}
                </div>
                {!quitado && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <LoanDetailSheet
        loan={selected}
        bankNameById={bankNameById}
        onPayInstallment={onPayInstallment}
        onUndoPayment={onUndoPayment}
        onClose={() => setSelectedId(null)}
      />
    </section>
  );
}

function LoanDetailSheet({
  loan,
  bankNameById,
  onPayInstallment,
  onUndoPayment,
  onClose,
}: {
  loan: LoanSummary | null;
  bankNameById: Map<string, string>;
  onPayInstallment: PayInstallment;
  onUndoPayment: UndoPayment;
  onClose: () => void;
}) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const hoje = todayIsoDate();

  return (
    <BottomSheet open={loan !== null} onClose={onClose}>
      {loan && (
        <>
          <p className="mb-1 font-medium">{loan.descricao}</p>
          <p className="mb-4 text-xs text-ink-muted">
            {loan.bancoId && bankNameById.get(loan.bancoId) ? `${bankNameById.get(loan.bancoId)} · ` : ""}
            {loan.dataRecebimento
              ? `recebido em ${formatDate(loan.dataRecebimento)}`
              : "recebimento não registrado (excluído ou dinheiro já usado antes do app)"}
          </p>

          <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-bg p-3 text-xs">
            {loan.valorRecebido !== undefined && (
              <span>
                Recebido
                <MaskedCurrency value={loan.valorRecebido} className="block text-sm font-medium text-accent-strong" />
              </span>
            )}
            <span>
              Total combinado
              <MaskedCurrency value={loan.valorTotalPagar} className="block text-sm font-medium" />
            </span>
            <span>
              Já pago
              <MaskedCurrency value={loan.totalPago} className="block text-sm font-medium text-accent-strong" />
            </span>
            <span>
              Restante
              <MaskedCurrency value={loan.restante} className="block text-sm font-medium text-negative" />
            </span>
            {loan.economiaTotal !== 0 && (
              <span className="col-span-2">
                {loan.economiaTotal > 0 ? "Economia até agora" : "Custo extra até agora"}
                <Money
                  value={loan.economiaTotal}
                  className="block text-sm font-medium"
                />
              </span>
            )}
          </div>

          <p className="mb-2 text-xs font-medium text-ink-muted">Parcelas</p>
          <div className="-mx-1 flex max-h-[50vh] flex-col gap-2 overflow-y-auto px-1">
            {loan.parcelas.map((parcela) => (
              <ParcelaRow
                key={parcela.id}
                parcela={parcela}
                hoje={hoje}
                paying={payingId === parcela.id}
                onStartPay={() => setPayingId(parcela.id)}
                onCancelPay={() => setPayingId(null)}
                onConfirmPay={async (valor, data) => {
                  await onPayInstallment(parcela.id, valor, data);
                  setPayingId(null);
                }}
                onUndo={() => onUndoPayment(parcela)}
              />
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function ParcelaRow({
  parcela,
  hoje,
  paying,
  onStartPay,
  onCancelPay,
  onConfirmPay,
  onUndo,
}: {
  parcela: Transaction;
  hoje: string;
  paying: boolean;
  onStartPay: () => void;
  onCancelPay: () => void;
  onConfirmPay: (valor: number, data: string) => Promise<void>;
  onUndo: () => Promise<void>;
}) {
  const paga = parcela.data <= hoje;
  const valorCombinado = parcela.valorOriginal ?? parcela.valor;
  const dataVencimento = parcela.dataVencimento ?? parcela.data;
  const diferenca = valorCombinado - parcela.valor;
  const [valor, setValor] = useState(valorCombinado);
  const [data, setData] = useState(hoje);
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);

  async function handleConfirm() {
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      await onConfirmPay(valor, data);
      toast.success("Parcela paga registrada.");
    } catch {
      toast.error("Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUndo() {
    setUndoing(true);
    try {
      await onUndo();
      toast.success("Pagamento desfeito — parcela voltou ao combinado.");
    } catch {
      toast.error("Não foi possível desfazer.");
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div className="rounded-xl bg-bg px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate font-medium">
            Parcela {parcela.parcelaAtual}/{parcela.parcelaTotal}
          </span>
          <span className="block text-xs text-ink-muted">
            {paga ? `paga em ${formatDate(parcela.data)}` : `vence em ${formatDate(dataVencimento)}`}
          </span>
          {paga && diferenca !== 0 && (
            <span className={`block text-[11px] ${diferenca > 0 ? "text-accent-strong" : "text-negative"}`}>
              {diferenca > 0 ? "economizou " : "pagou "}
              <MaskedCurrency value={Math.abs(diferenca)} />
              {diferenca > 0 ? " pagando antes" : " a mais (atraso/juros)"}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <MaskedCurrency
            value={paga ? parcela.valor : valorCombinado}
            className={`text-sm font-medium ${paga ? "text-ink" : "text-ink-muted"}`}
          />
          {paga ? (
            <button
              onClick={handleUndo}
              disabled={undoing}
              aria-label="Desfazer pagamento"
              className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
            >
              <Undo2 size={14} />
            </button>
          ) : (
            !paying && (
              <button
                onClick={onStartPay}
                className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong"
              >
                Pagar
              </button>
            )
          )}
        </span>
      </div>

      {!paga && paying && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-[11px] text-ink-muted">
            Valor combinado: <MaskedCurrency value={valorCombinado} /> em {formatDate(dataVencimento)}. Se
            pagar antes ou depois por um valor diferente (desconto ou multa/juros), ajuste abaixo.
          </p>
          <div className="flex gap-2">
            <CurrencyInput
              value={valor}
              onChange={setValor}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
            <input
              type="date"
              value={data}
              onChange={(event) => setData(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancelPay}
              className="flex-1 rounded-xl px-3 py-2 text-xs text-ink-muted transition-transform active:scale-95 hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 rounded-xl bg-accent px-3 py-2 text-xs font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-60"
            >
              Confirmar pagamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
