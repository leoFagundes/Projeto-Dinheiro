"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { useCategoryGoals } from "@/lib/use-category-goals";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { useBankPayments } from "@/lib/use-bank-payments";
import { useBankTransfers } from "@/lib/use-bank-transfers";
import { usePockets } from "@/lib/use-pockets";
import { usePocketMovements } from "@/lib/use-pocket-movements";
import { useInvestments } from "@/lib/use-investments";
import { useInvestmentMovements } from "@/lib/use-investment-movements";
import { usePatrimonioHistory } from "@/lib/use-patrimonio-history";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import {
  computeBankSaldoConta,
  computeMonthlyFlowTrend,
  computeMonthTotals,
  computeOriginDateById,
  computePatrimonio,
  computeProjectedMonthBalance,
  computeUpcomingEvents,
} from "@/lib/derived";
import { addMonthsToKey, currentMonthKey } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { DashboardSkeleton } from "@/app/_components/Skeleton";
import { SummaryCards } from "./_components/SummaryCards";
import { DashboardQuickNav } from "./_components/DashboardQuickNav";
import { RecentTransactions } from "./_components/RecentTransactions";
import { UpcomingEvents } from "./_components/UpcomingEvents";
import { AnalisesCard } from "./_components/AnalisesCard";
import { BankDebtSection } from "./_components/BankDebtSection";
import { CategoryGoals } from "./_components/CategoryGoals";
import { PocketsSection } from "./_components/PocketsSection";
import { InvestmentsSection } from "./_components/InvestmentsSection";

const MODO_DETALHADO_KEY = "modoDetalhado";

function readModoDetalhado(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem(MODO_DETALHADO_KEY);
    return saved === null ? true : saved === "1";
  } catch {
    return true;
  }
}

export default function DashboardPage() {
  const { transactions, loading, deleteTransaction } = useTransactions();
  const { goals, overrides: goalOverrides, setGoal, removeGoal, setGoalOverride, removeGoalOverride } =
    useCategoryGoals();
  const { categories } = useCategories();
  const { banks, payFatura, transferBetweenBanks } = useBanks();
  const { payments: bankPayments } = useBankPayments();
  const { transfers: bankTransfers } = useBankTransfers();
  const { pockets, adjustSaldo, moveFunds, registrarRendimento, deletePocketMovement } = usePockets();
  const { movements } = usePocketMovements();
  const {
    investments,
    moveInvestment,
    registrarRendimento: registrarRendimentoInvestimento,
    deleteInvestmentMovement,
  } = useInvestments();
  const { movements: investmentMovements } = useInvestmentMovements();
  const { snapshots: patrimonioHistorico, syncSnapshot } = usePatrimonioHistory();
  const [modoDetalhado, setModoDetalhado] = useState(readModoDetalhado);

  function toggleModoDetalhado() {
    setModoDetalhado((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MODO_DETALHADO_KEY, next ? "1" : "0");
      } catch {
        // sem persistência, tudo bem
      }
      return next;
    });
  }

  const thisMonth = currentMonthKey();
  const patrimonio = computePatrimonio(
    banks,
    pockets,
    investments,
    transactions,
    movements,
    bankPayments,
    investmentMovements,
    bankTransfers,
  );

  const patrimonioSyncRef = useRef<number | null>(null);
  useEffect(() => {
    if (loading) return;
    if (patrimonioSyncRef.current === patrimonio.total) return;
    patrimonioSyncRef.current = patrimonio.total;
    syncSnapshot(thisMonth, {
      contas: patrimonio.contas,
      caixinhas: patrimonio.caixinhas,
      investimentos: patrimonio.investimentos,
      dividas: patrimonio.dividas,
      total: patrimonio.total,
    });
  }, [loading, patrimonio, thisMonth, syncSnapshot]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const upcomingEvents = computeUpcomingEvents(transactions, 30);
  const { receitas, despesas } = computeMonthTotals(transactions, thisMonth);
  const despesasMesAnterior = computeMonthTotals(
    transactions,
    addMonthsToKey(thisMonth, -1),
  ).despesas;
  const saldoProjetadoMes = computeProjectedMonthBalance(transactions, thisMonth);
  const monthlyFlow = computeMonthlyFlowTrend(transactions, 6);
  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const categoriaNomes = new Set(categories.filter((c) => c.tipo === "despesa").map((c) => c.nome));
  const goalsValidos = goals.filter((g) => categoriaNomes.has(g.categoria));
  const goalOverridesValidos = goalOverrides.filter((o) => categoriaNomes.has(o.categoria));
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  const originDateById = computeOriginDateById(transactions);
  const visibleBanks = banks.filter((b) => !b.oculto);
  const visiblePockets = pockets.filter((p) => !p.oculto);
  const visibleInvestments = investments.filter((inv) => !inv.oculto);
  const saldoContaPorBanco = new Map(
    banks.map((b) => [
      b.id,
      computeBankSaldoConta(
        b,
        transactions,
        movements,
        bankPayments,
        investmentMovements,
        bankTransfers,
      ),
    ]),
  );

  return (
    <PageFade>
      <div className="flex flex-col gap-10 pb-8">
        <SummaryCards
          patrimonio={patrimonio}
          receitasMes={receitas}
          despesasMes={despesas}
          despesasMesAnterior={despesasMesAnterior}
          saldoProjetadoMes={saldoProjetadoMes}
        />

        <DashboardQuickNav />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-muted">Próximos 30 dias</h2>
            <Link href="/calendario" className="text-xs text-accent-strong hover:underline">
              Ver agenda
            </Link>
          </div>
          <UpcomingEvents events={upcomingEvents} />
        </section>

        <section id="bancos" className="scroll-mt-20">
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Bancos</h2>
          <BankDebtSection
            banks={visibleBanks}
            allBanks={banks}
            transactions={transactions}
            bankPayments={bankPayments}
            saldoContaPorBanco={saldoContaPorBanco}
            onPayFatura={payFatura}
            onTransfer={transferBetweenBanks}
            onDeleteTransaction={deleteTransaction}
            colorByCategoria={colorByCategoria}
            iconByCategoria={iconByCategoria}
            bankNameById={bankNameById}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-muted">Últimas transações</h2>
            <Link href="/historico" className="text-xs text-accent-strong hover:underline">
              Ver tudo
            </Link>
          </div>
          <RecentTransactions
            transactions={transactions}
            onDelete={deleteTransaction}
            colorByCategoria={colorByCategoria}
            iconByCategoria={iconByCategoria}
            bankNameById={bankNameById}
            originDateById={originDateById}
          />
        </section>

        <section id="caixinhas" className="scroll-mt-20">
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Caixinhas</h2>
          <PocketsSection
            pockets={visiblePockets}
            banks={banks}
            movements={movements}
            onAdjust={adjustSaldo}
            onMoveFunds={moveFunds}
            onRegistrarRendimento={registrarRendimento}
            onDeleteMovement={deletePocketMovement}
          />
        </section>

        {modoDetalhado && (
          <section id="investimentos" className="scroll-mt-20">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink-muted">Investimentos</h2>
              <Link href="/investimentos" className="text-xs text-accent-strong hover:underline">
                Ver tudo
              </Link>
            </div>
            <InvestmentsSection
              investments={visibleInvestments}
              movements={investmentMovements}
              banks={banks}
              onMove={moveInvestment}
              onRegistrarRendimento={registrarRendimentoInvestimento}
              onDeleteMovement={deleteInvestmentMovement}
            />
          </section>
        )}

        {modoDetalhado && (
          <section id="analises" className="scroll-mt-20">
            <h2 className="mb-3 text-sm font-medium text-ink-muted">Análises</h2>
            <AnalisesCard
              transactions={transactions}
              banks={banks}
              patrimonioHistorico={patrimonioHistorico}
              colorByCategoria={colorByCategoria}
              iconByCategoria={iconByCategoria}
              monthlyFlow={monthlyFlow}
            />
          </section>
        )}

        {modoDetalhado && (
          <section id="metas" className="scroll-mt-20">
            <h2 className="mb-3 text-sm font-medium text-ink-muted">Limite de gastos por categoria</h2>
            <CategoryGoals
              goals={goalsValidos}
              overrides={goalOverridesValidos}
              transactions={transactions}
              iconByCategoria={iconByCategoria}
              onSetGoal={setGoal}
              onRemoveGoal={removeGoal}
              onSetGoalOverride={setGoalOverride}
              onRemoveGoalOverride={removeGoalOverride}
            />
          </section>
        )}

        <button
          onClick={toggleModoDetalhado}
          className="flex items-center justify-center gap-1.5 self-center text-sm text-ink-muted transition-transform active:scale-95 hover:text-ink"
        >
          {modoDetalhado ? (
            <>
              <ChevronUp size={16} />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Mostrar investimentos, análises e metas
            </>
          )}
        </button>
      </div>
    </PageFade>
  );
}
