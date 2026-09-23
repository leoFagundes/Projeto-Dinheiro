"use client";

import { useEffect, useRef } from "react";
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
import { useAccountPreferences } from "@/lib/use-account-preferences";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import {
  computeBankSaldoConta,
  computeLoans,
  computeMonthlyFlowTrend,
  computeMonthTotals,
  computeOriginDateById,
  computePatrimonio,
  computeProjectedMonthBalance,
  computeUpcomingEvents,
  computeUpcomingReminders,
} from "@/lib/derived";
import { addMonthsToKey, currentMonthKey, formatCurrency } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { DashboardSkeleton } from "@/app/_components/Skeleton";
import { SummaryCards } from "./_components/SummaryCards";
import { ActivitySection } from "./_components/ActivitySection";
import { AnalisesCard } from "./_components/AnalisesCard";
import { BankDebtSection } from "./_components/BankDebtSection";
import { LoansSection } from "./_components/LoansSection";
import { CategoryGoals } from "./_components/CategoryGoals";

export default function DashboardPage() {
  const { transactions, loading, deleteTransaction, payLoanInstallment, undoLoanInstallmentPayment } =
    useTransactions();
  const { goals, overrides: goalOverrides, setGoal, removeGoal, setGoalOverride, removeGoalOverride } =
    useCategoryGoals();
  const { categories } = useCategories();
  const { banks, payFatura, transferBetweenBanks } = useBanks();
  const { payments: bankPayments } = useBankPayments();
  const { transfers: bankTransfers } = useBankTransfers();
  const { pockets } = usePockets();
  const { movements } = usePocketMovements();
  const { investments } = useInvestments();
  const { movements: investmentMovements } = useInvestmentMovements();
  const { snapshots: patrimonioHistorico, syncSnapshot } = usePatrimonioHistory();
  const { notificacoesFatura } = useAccountPreferences();

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

  useEffect(() => {
    if (loading || !notificacoesFatura) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const dedupeKey = "avisosDisparados:" + todayKey;
    try {
      if (localStorage.getItem(dedupeKey)) return;
    } catch {
      return;
    }
    const reminders = computeUpcomingReminders(transactions, 3);
    if (reminders.length === 0) return;
    for (const reminder of reminders) {
      new Notification(reminder.titulo, {
        body: `${formatCurrency(reminder.valor)} · vence em ${new Date(reminder.data + "T00:00:00").toLocaleDateString("pt-BR")}`,
        tag: reminder.id,
      });
    }
    try {
      localStorage.setItem(dedupeKey, "1");
    } catch {
      // ignora — pior caso é repetir o aviso na próxima visita do mesmo dia
    }
  }, [loading, notificacoesFatura, transactions]);

  if (loading) {
    return (
      <PageFade>
        <DashboardSkeleton />
      </PageFade>
    );
  }

  const upcomingEvents = computeUpcomingEvents(transactions, 7);
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
  const loans = computeLoans(transactions);
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

        <ActivitySection
          upcomingEvents={upcomingEvents}
          transactions={transactions}
          onDeleteTransaction={deleteTransaction}
          colorByCategoria={colorByCategoria}
          iconByCategoria={iconByCategoria}
          bankNameById={bankNameById}
          originDateById={originDateById}
        />

        <section>
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

        <LoansSection
          loans={loans}
          bankNameById={bankNameById}
          onPayInstallment={payLoanInstallment}
          onUndoPayment={undoLoanInstallmentPayment}
        />

        <section>
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

        <section>
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
      </div>
    </PageFade>
  );
}
