"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Receipt, Search, X } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { useBankPayments } from "@/lib/use-bank-payments";
import { useBankTransfers } from "@/lib/use-bank-transfers";
import { usePockets } from "@/lib/use-pockets";
import { usePocketMovements } from "@/lib/use-pocket-movements";
import { usePocketTransfers } from "@/lib/use-pocket-transfers";
import { useInvestments } from "@/lib/use-investments";
import { useInvestmentMovements } from "@/lib/use-investment-movements";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import {
  computeMonthTotals,
  computeOriginDateById,
  computeProjectedSubscriptionEntries,
  computeUnifiedHistory,
  type HistoryEntry,
} from "@/lib/derived";
import { currentMonthKey, formatCurrency, monthKeyOfIsoDate } from "@/lib/format";
import { downloadMonthlyReportCsv } from "@/lib/csv";
import { MonthFilter } from "@/app/_components/MonthFilter";
import { EmptyState } from "@/app/_components/EmptyState";
import { TransactionListItem } from "@/app/_components/TransactionListItem";
import { HistoryEntryRow } from "@/app/_components/HistoryEntryRow";
import { PageFade } from "@/app/_components/PageFade";
import { ListSkeleton } from "@/app/_components/Skeleton";
import type { FormaPagamento } from "@/lib/types";

type TipoFiltro =
  | "todos"
  | "receita"
  | "despesa"
  | "transferencia"
  | "fatura"
  | "caixinha"
  | "investimento";

const TIPO_FILTROS: { id: TipoFiltro; label: string }[] = [
  { id: "todos", label: "Tudo" },
  { id: "receita", label: "Receitas" },
  { id: "despesa", label: "Despesas" },
  { id: "transferencia", label: "Transferências" },
  { id: "fatura", label: "Fatura" },
  { id: "caixinha", label: "Caixinhas" },
  { id: "investimento", label: "Investimentos" },
];

function matchesTipoFiltro(entry: HistoryEntry, filtro: TipoFiltro): boolean {
  if (filtro === "todos") return true;
  if (filtro === "fatura") return entry.tipo === "pagamento_fatura" || entry.tipo === "ajuste_fatura";
  if (filtro === "transferencia") {
    return entry.tipo === "transferencia" || entry.tipo === "transferencia_caixinha";
  }
  return entry.tipo === filtro;
}

export default function HistoricoPage() {
  const { transactions, loading, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { banks, deleteBankPayment, deleteBankTransfer } = useBanks();
  const { payments: bankPayments } = useBankPayments();
  const { transfers: bankTransfers } = useBankTransfers();
  const { pockets, deletePocketMovement, deletePocketTransfer } = usePockets();
  const { movements: pocketMovements } = usePocketMovements();
  const { transfers: pocketTransfers } = usePocketTransfers();
  const { investments, deleteInvestmentMovement } = useInvestments();
  const { movements: investmentMovements } = useInvestmentMovements();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState<FormaPagamento | "">("");

  if (loading) {
    return (
      <PageFade>
        <div className="flex flex-col gap-4 pb-8">
          <h1 className="text-lg font-semibold">Histórico</h1>
          <ListSkeleton />
        </div>
      </PageFade>
    );
  }

  const termo = busca.trim().toLowerCase();
  const buscando = termo !== "";

  const { receitas, despesas, saldoMes } = computeMonthTotals(transactions, monthKey);
  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  const originDateById = computeOriginDateById(transactions);

  const unified = computeUnifiedHistory({
    transactions,
    banks,
    pockets,
    investments,
    bankTransfers,
    bankPayments,
    pocketMovements,
    investmentMovements,
    pocketTransfers,
    onDeleteBankTransfer: deleteBankTransfer,
    onDeleteBankPayment: deleteBankPayment,
    onDeletePocketMovement: deletePocketMovement,
    onDeleteInvestmentMovement: deleteInvestmentMovement,
    onDeletePocketTransfer: deletePocketTransfer,
  });

  const mostraCategoria = tipoFiltro === "todos" || tipoFiltro === "receita" || tipoFiltro === "despesa";
  const mostraFormaPagamento = tipoFiltro === "todos" || tipoFiltro === "despesa";
  const filtroAtivo = tipoFiltro !== "todos" || categoriaFiltro !== "" || formaPagamentoFiltro !== "";

  // Meses futuros ainda não têm transação real gerada pras assinaturas —
  // sem isso, avançar pros próximos meses no Histórico mostrava tudo vazio
  // mesmo já sabendo que aquelas cobranças vão acontecer.
  const previstas = buscando ? [] : computeProjectedSubscriptionEntries(transactions, monthKey);

  const listaExibida = [...unified, ...previstas]
    .filter((entry) => {
      if (!buscando && monthKeyOfIsoDate(entry.data) !== monthKey) return false;
      if (!matchesTipoFiltro(entry, tipoFiltro)) return false;
      if (categoriaFiltro && entry.categoria !== categoriaFiltro) return false;
      if (formaPagamentoFiltro && entry.formaPagamento !== formaPagamentoFiltro) return false;
      if (buscando) {
        const alvo = `${entry.titulo} ${entry.categoria ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criadoEm - a.criadoEm));

  return (
    <PageFade>
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Histórico</h1>
          {!buscando && (
            <button
              onClick={() =>
                downloadMonthlyReportCsv({
                  transactions,
                  monthKey,
                  banks,
                  pockets,
                  investments,
                  pocketMovements,
                  bankPayments,
                  investmentMovements,
                  bankTransfers,
                })
              }
              className="flex items-center gap-1.5 text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
            >
              <Download size={16} />
              Exportar CSV do mês
            </button>
          )}
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-10 pr-9 text-sm outline-none transition-colors focus:border-accent"
          />
          {buscando && (
            <button
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {!buscando && <MonthFilter monthKey={monthKey} onChange={setMonthKey} />}

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none">
          {TIPO_FILTROS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                setTipoFiltro(id);
                setCategoriaFiltro("");
                setFormaPagamentoFiltro("");
              }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-transform active:scale-95 ${
                tipoFiltro === id
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border bg-surface text-ink-muted hover:bg-bg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(mostraCategoria || mostraFormaPagamento) && (
          <div className="flex gap-2">
            {mostraCategoria && (
              <select
                value={categoriaFiltro}
                onChange={(event) => setCategoriaFiltro(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-3 py-2 text-xs outline-none transition-colors focus:border-accent"
              >
                <option value="">Todas as categorias</option>
                {categories
                  .filter((c) => tipoFiltro === "todos" || c.tipo === tipoFiltro)
                  .map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.icone ?? ""} {c.nome}
                    </option>
                  ))}
              </select>
            )}
            {mostraFormaPagamento && (
              <select
                value={formaPagamentoFiltro}
                onChange={(event) =>
                  setFormaPagamentoFiltro(event.target.value as FormaPagamento | "")
                }
                className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-3 py-2 text-xs outline-none transition-colors focus:border-accent"
              >
                <option value="">Crédito e débito</option>
                <option value="credito">Só crédito</option>
                <option value="debito">Só débito</option>
              </select>
            )}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={buscando ? `busca-${termo}` : `${monthKey}-${tipoFiltro}-${categoriaFiltro}-${formaPagamentoFiltro}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col gap-4"
          >
            {!buscando && !filtroAtivo && (
              <div className="grid grid-cols-3 gap-2 rounded-card bg-surface shadow-card p-4 text-center">
                <div>
                  <p className="text-xs text-ink-muted">Receitas</p>
                  <p className="mt-0.5 text-sm font-semibold text-accent-strong">
                    {formatCurrency(receitas)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Despesas</p>
                  <p className="mt-0.5 text-sm font-semibold text-negative">
                    {formatCurrency(despesas)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Saldo</p>
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      saldoMes < 0 ? "text-negative" : "text-accent-strong"
                    }`}
                  >
                    {formatCurrency(saldoMes)}
                  </p>
                </div>
              </div>
            )}

            {listaExibida.length === 0 ? (
              <EmptyState
                icon={buscando ? Search : Receipt}
                title={buscando ? "Nada encontrado" : "Nada por aqui"}
                description={
                  buscando
                    ? "Nenhum item corresponde a essa busca."
                    : filtroAtivo
                      ? "Nenhum item corresponde a esse filtro neste mês."
                      : "Nenhuma movimentação registrada neste mês."
                }
              />
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {listaExibida.map((entry) =>
                    entry.transaction ? (
                      <TransactionListItem
                        key={entry.id}
                        transaction={entry.transaction}
                        onDelete={deleteTransaction}
                        colorByCategoria={colorByCategoria}
                        iconByCategoria={iconByCategoria}
                        bankNameById={bankNameById}
                        originDateById={originDateById}
                      />
                    ) : (
                      <HistoryEntryRow key={entry.id} entry={entry} />
                    ),
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageFade>
  );
}
