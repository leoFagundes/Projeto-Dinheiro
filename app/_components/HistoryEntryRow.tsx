"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeftRight, PiggyBank, Repeat, Trash2, TrendingUp } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailRow, DetailSection, StatusPill } from "./DetailSheetKit";
import { Money, MaskedCurrency } from "./Money";
import { formatDate, formatLongDate, formatTimestamp, todayIsoDate } from "@/lib/format";
import type { HistoryEntry } from "@/lib/derived";

const ICON_BY_TIPO = {
  transferencia_caixinha: ArrowLeftRight,
  caixinha: PiggyBank,
  investimento: TrendingUp,
  // Só chega aqui uma receita/despesa sem `onDelete`/transaction real: uma
  // cobrança de assinatura prevista pra um mês futuro ainda não gerado.
  receita: Repeat,
  despesa: Repeat,
} as const;

const LABEL_BY_TIPO: Record<string, string> = {
  transferencia_caixinha: "Transferência entre caixinhas",
  caixinha: "Caixinha",
  investimento: "Investimento",
  receita: "Receita prevista de assinatura",
  despesa: "Cobrança prevista de assinatura",
};

/**
 * Linha pras movimentações que não são transações — tocar abre o resumo
 * completo (o título vem cortado na linha); só dá pra excluir (desfaz o
 * efeito nos saldos), não editar.
 */
export function HistoryEntryRow({ entry, hideDate = false }: { entry: HistoryEntry; hideDate?: boolean }) {
  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const Icon = ICON_BY_TIPO[entry.tipo as keyof typeof ICON_BY_TIPO] ?? ArrowLeftRight;
  const signedValue =
    entry.direcao === "positivo" ? entry.valor : entry.direcao === "negativo" ? -entry.valor : 0;

  async function handleConfirmDelete() {
    if (!entry.onDelete) return;
    setDeleting(true);
    try {
      await entry.onDelete();
      toast.success("Excluído.");
    } catch {
      toast.error("Não foi possível excluir.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  const valor =
    entry.direcao === "neutro" ? (
      <MaskedCurrency value={entry.valor} className="text-sm font-medium text-ink-muted" />
    ) : (
      <Money value={signedValue} showSign className="text-sm font-medium" />
    );

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center justify-between gap-2 rounded-card bg-surface shadow-card py-3 pl-4 pr-2">
          <button
            onClick={() => setViewing(true)}
            aria-label={`Ver detalhes de ${entry.titulo}`}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg text-ink-muted">
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.titulo}</p>
              {(!hideDate || entry.detalhe) && (
                <p className="text-xs text-ink-muted">
                  {[hideDate ? null : formatDate(entry.data), entry.detalhe].filter(Boolean).join(" · ")}
                </p>
              )}
            </span>
            <span className="shrink-0 pr-2">{valor}</span>
          </button>
          {entry.onDelete && (
            <button
              onClick={() => setConfirming(true)}
              disabled={deleting}
              aria-label="Excluir"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-transform active:scale-90 hover:bg-bg hover:text-negative"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </motion.div>

      <BottomSheet open={viewing} onClose={() => setViewing(false)}>
        <EntryDetail
          entry={entry}
          onDelete={
            entry.onDelete
              ? () => {
                  setViewing(false);
                  setConfirming(true);
                }
              : undefined
          }
        />
      </BottomSheet>

      <ConfirmDialog
        open={confirming}
        title="Excluir este item?"
        description="Desfaz exatamente o que ele alterou nos saldos envolvidos (caixinha ou investimento)."
        confirmLabel="Excluir"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function EntryDetail({ entry, onDelete }: { entry: HistoryEntry; onDelete?: () => void }) {
  const Icon = ICON_BY_TIPO[entry.tipo as keyof typeof ICON_BY_TIPO] ?? ArrowLeftRight;
  const previsto = entry.tipo === "receita" || entry.tipo === "despesa";
  const futuro = entry.data > todayIsoDate();
  const signedValue =
    entry.direcao === "positivo" ? entry.valor : entry.direcao === "negativo" ? -entry.valor : 0;

  return (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bg text-ink-muted">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">{LABEL_BY_TIPO[entry.tipo] ?? "Movimentação"}</p>
          <p className="wrap-break-word text-lg font-semibold leading-snug">{entry.titulo}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {entry.direcao === "neutro" ? (
          <MaskedCurrency value={entry.valor} className="text-3xl font-semibold" />
        ) : (
          <Money value={signedValue} showSign className="text-3xl font-semibold" />
        )}
        {previsto ? (
          <StatusPill tone="pending">Prevista</StatusPill>
        ) : futuro ? (
          <StatusPill tone="pending">Agendado</StatusPill>
        ) : null}
      </div>

      <DetailSection>
        <DetailRow label="Data">{formatLongDate(entry.data)}</DetailRow>
        {entry.categoria && <DetailRow label="Categoria">{entry.categoria}</DetailRow>}
        {entry.detalhe && !previsto && <DetailRow label="Detalhe">{entry.detalhe}</DetailRow>}
        {entry.direcao === "neutro" && <DetailRow label="Efeito no total">Nenhum — só mudou de lugar</DetailRow>}
      </DetailSection>

      {(previsto || onDelete) && (
        <p className="mt-4 text-sm text-ink-muted">
          {previsto
            ? "Ainda não foi lançada: o app cria essa cobrança sozinho quando o mês chegar. Pra mudar ou cancelar, edite a assinatura."
            : "Esse movimento não pode ser editado. Se estiver errado, exclua — o saldo da caixinha ou do investimento volta a ser o de antes — e lance de novo."}
        </p>
      )}

      {entry.criadoEm > 0 && (
        <p className="mt-3 text-center text-xs text-ink-muted">Lançado em {formatTimestamp(entry.criadoEm)}</p>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-negative-soft py-3 text-sm font-medium text-negative transition-transform active:scale-95"
        >
          <Trash2 size={15} />
          Excluir
        </button>
      )}
    </>
  );
}
