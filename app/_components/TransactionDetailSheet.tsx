"use client";

import { Pencil, Trash2 } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { DetailRow, DetailSection, StatusPill } from "./DetailSheetKit";
import { MaskedCurrency, Money } from "./Money";
import { useTransactions } from "@/lib/use-transactions";
import { computeLoans, computeNextChargeDate } from "@/lib/derived";
import { categoryTint } from "@/lib/categories";
import { formatDate, formatLongDate, formatMonthLabel, formatTimestamp, todayIsoDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";

/**
 * Resumo completo de uma transação: descrição inteira (sem cortar), valor,
 * situação e tudo que ela faz parte — compra parcelada, empréstimo ou
 * assinatura. Editar e excluir ficam aqui também, além dos botões da linha.
 */
export function TransactionDetailSheet({
  open,
  transaction,
  color,
  icon,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  transaction: Transaction;
  color: string;
  icon: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <DetailContent transaction={transaction} color={color} icon={icon} onEdit={onEdit} onDelete={onDelete} />
    </BottomSheet>
  );
}

function DetailContent({
  transaction: t,
  color,
  icon,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  color: string;
  icon: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { transactions } = useTransactions();
  const hoje = todayIsoDate();
  const futura = t.data > hoje;
  const receita = t.tipo === "receita";
  const status = receita ? (futura ? "A receber" : "Recebido") : futura ? "A pagar" : "Pago";

  return (
    <>
      <div className="flex items-start gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-xl"
          style={{ backgroundColor: categoryTint(color) }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">
            {receita ? "Receita" : "Despesa"} · {t.categoria}
          </p>
          <p className="wrap-break-word text-lg font-semibold leading-snug">{t.descricao}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Money value={receita ? t.valor : -t.valor} showSign className="text-3xl font-semibold" />
        <StatusPill tone={futura ? "pending" : "done"}>{status}</StatusPill>
      </div>

      <DetailSection>
        <DetailRow label="Data">{formatLongDate(t.data)}</DetailRow>
        <DetailRow label="Categoria">
          {icon} {t.categoria}
        </DetailRow>
        <CombinadoRows t={t} futura={futura} />
      </DetailSection>

      {t.emprestimoId ? (
        <EmprestimoSection t={t} transactions={transactions} />
      ) : t.compraId && t.parcelaTotal ? (
        <ParceladaSection t={t} transactions={transactions} hoje={hoje} />
      ) : null}

      {(t.recorrente || t.recorrenteOrigemId) && (
        <AssinaturaSection t={t} transactions={transactions} hoje={hoje} />
      )}

      {t.criadoEm > 0 && (
        <p className="mt-4 text-center text-xs text-ink-muted">Lançado em {formatTimestamp(t.criadoEm)}</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong"
        >
          <Pencil size={15} />
          Editar
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 rounded-2xl bg-negative-soft py-3 text-sm font-medium text-negative transition-transform active:scale-95"
        >
          <Trash2 size={15} />
          Excluir
        </button>
      </div>
    </>
  );
}

/** Valor/data combinados × o que de fato aconteceu (parcelas pagas antes, com desconto, multa…). */
function CombinadoRows({ t, futura }: { t: Transaction; futura: boolean }) {
  const valorMudou = t.valorOriginal !== undefined && Math.abs(t.valorOriginal - t.valor) >= 0.005;
  const dataMudou = t.dataVencimento !== undefined && t.dataVencimento !== t.data;
  if (!valorMudou && !dataMudou) return null;
  const diferenca = (t.valorOriginal ?? t.valor) - t.valor;

  return (
    <>
      {valorMudou && (
        <DetailRow label="Valor combinado">
          <MaskedCurrency value={t.valorOriginal ?? t.valor} />
        </DetailRow>
      )}
      {valorMudou && !futura && (
        <DetailRow label={diferenca > 0 ? "Economia" : "Pago a mais"}>
          <MaskedCurrency
            value={Math.abs(diferenca)}
            className={diferenca > 0 ? "text-accent-strong" : "text-negative"}
          />
        </DetailRow>
      )}
      {dataMudou && <DetailRow label="Vencimento combinado">{formatDate(t.dataVencimento ?? t.data)}</DetailRow>}
    </>
  );
}

function ParceladaSection({ t, transactions, hoje }: { t: Transaction; transactions: Transaction[]; hoje: string }) {
  const parcelas = transactions
    .filter((x) => x.compraId === t.compraId && !x.emprestimoId)
    .sort((a, b) => (a.parcelaAtual ?? 0) - (b.parcelaAtual ?? 0));
  const pagas = parcelas.filter((p) => p.data <= hoje);
  const faltam = parcelas.filter((p) => p.data > hoje);
  const ultima = parcelas[parcelas.length - 1];

  return (
    <DetailSection title="Compra parcelada">
      <DetailRow label="Parcela">
        {t.parcelaAtual} de {t.parcelaTotal}
      </DetailRow>
      <DetailRow label="Valor total">
        <MaskedCurrency value={parcelas.reduce((sum, p) => sum + p.valor, 0)} />
      </DetailRow>
      <DetailRow label={`Já pago (${pagas.length})`}>
        <MaskedCurrency value={pagas.reduce((sum, p) => sum + p.valor, 0)} />
      </DetailRow>
      <DetailRow label={`Falta pagar (${faltam.length})`}>
        <MaskedCurrency value={faltam.reduce((sum, p) => sum + p.valor, 0)} />
      </DetailRow>
      {ultima && <DetailRow label="Última parcela">{formatDate(ultima.data)}</DetailRow>}
    </DetailSection>
  );
}

function EmprestimoSection({ t, transactions }: { t: Transaction; transactions: Transaction[] }) {
  const loan = computeLoans(transactions).find((l) => l.id === t.emprestimoId);
  if (!loan) return null;

  return (
    <DetailSection title={`Empréstimo · ${loan.descricao}`}>
      {t.tipo === "despesa" && !!t.parcelaTotal && (
        <DetailRow label="Parcela">
          {t.parcelaAtual} de {t.parcelaTotal}
        </DetailRow>
      )}
      {loan.valorRecebido !== undefined && (
        <DetailRow label="Valor recebido">
          <MaskedCurrency value={loan.valorRecebido} />
        </DetailRow>
      )}
      <DetailRow label="Total a pagar">
        <MaskedCurrency value={loan.valorTotalPagar} />
      </DetailRow>
      <DetailRow label={`Já pago (${loan.parcelasPagas} de ${loan.parcelasTotal})`}>
        <MaskedCurrency value={loan.totalPago} />
      </DetailRow>
      <DetailRow label="Falta pagar">
        <MaskedCurrency value={loan.restante} />
      </DetailRow>
      {loan.economiaTotal !== 0 && (
        <DetailRow label={loan.economiaTotal > 0 ? "Economia até agora" : "Pago a mais até agora"}>
          <MaskedCurrency
            value={Math.abs(loan.economiaTotal)}
            className={loan.economiaTotal > 0 ? "text-accent-strong" : "text-negative"}
          />
        </DetailRow>
      )}
    </DetailSection>
  );
}

function AssinaturaSection({ t, transactions, hoje }: { t: Transaction; transactions: Transaction[]; hoje: string }) {
  const template = t.recorrenteOrigemId ? transactions.find((x) => x.id === t.recorrenteOrigemId) : t;
  if (!template) {
    return (
      <DetailSection title="Assinatura">
        <DetailRow label="Situação">Lançamento original excluído</DetailRow>
      </DetailSection>
    );
  }

  const cobrancas = transactions.filter(
    (x) => (x.id === template.id || x.recorrenteOrigemId === template.id) && x.data <= hoje,
  );
  const proxima = template.recorrente ? computeNextChargeDate(template, transactions) : null;

  return (
    <DetailSection title="Assinatura">
      <DetailRow label="Frequência">{template.recorrenciaIntervalo === "anual" ? "Anual" : "Mensal"}</DetailRow>
      <DetailRow label="Desde">{formatDate(template.data)}</DetailRow>
      <DetailRow label="Próxima cobrança">{proxima ? formatDate(proxima) : "Encerrada"}</DetailRow>
      {template.recorrente && template.recorrenteFim && (
        <DetailRow label="Termina em">{formatMonthLabel(template.recorrenteFim)}</DetailRow>
      )}
      <DetailRow label={`Já cobrado (${cobrancas.length}×)`}>
        <MaskedCurrency value={cobrancas.reduce((sum, x) => sum + x.valor, 0)} />
      </DetailRow>
    </DetailSection>
  );
}
