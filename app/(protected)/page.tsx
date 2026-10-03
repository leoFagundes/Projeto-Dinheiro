"use client";

import { useEffect } from "react";
import { useTransactions } from "@/lib/use-transactions";
import { useCategoryGoals } from "@/lib/use-category-goals";
import { useCategories } from "@/lib/use-categories";
import { useAccountPreferences } from "@/lib/use-account-preferences";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import {
  computeLoans,
  computeMonthlyFlowTrend,
  computeMonthProgress,
  computeOriginDateById,
  computeUpcomingEvents,
  computeUpcomingReminders,
} from "@/lib/derived";
import { currentMonthKey, formatCurrency } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { DashboardSkeleton } from "@/app/_components/Skeleton";
import { SummaryCards } from "./_components/SummaryCards";
import { ActivitySection } from "./_components/ActivitySection";
import { AnalisesCard } from "./_components/AnalisesCard";
import { LoansSection } from "./_components/LoansSection";
import { CategoryGoals } from "./_components/CategoryGoals";

export default function DashboardPage() {
  const { transactions, loading, deleteTransaction, payLoanInstallment, undoLoanInstallmentPayment } =
    useTransactions();
  const { goals, overrides: goalOverrides, setGoal, removeGoal, setGoalOverride, removeGoalOverride } =
    useCategoryGoals();
  const { categories } = useCategories();
  const { notificacoesFatura } = useAccountPreferences();

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

  const thisMonth = currentMonthKey();
  const progresso = computeMonthProgress(transactions, thisMonth);
  const upcomingEvents = computeUpcomingEvents(transactions, 7);
  const monthlyFlow = computeMonthlyFlowTrend(transactions, 6);
  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const categoriaNomes = new Set(categories.filter((c) => c.tipo === "despesa").map((c) => c.nome));
  const goalsValidos = goals.filter((g) => categoriaNomes.has(g.categoria));
  const goalOverridesValidos = goalOverrides.filter((o) => categoriaNomes.has(o.categoria));
  const originDateById = computeOriginDateById(transactions);
  const loans = computeLoans(transactions);

  return (
    <PageFade>
      <div className="flex flex-col gap-10 pb-8">
        <SummaryCards
          receitasAteHoje={progresso.receitasAteHoje}
          receitasAReceber={progresso.receitasAReceber}
          despesasAteHoje={progresso.despesasAteHoje}
          despesasAPagar={progresso.despesasAPagar}
          despesasMesAnteriorMesmoPeriodo={progresso.despesasMesAnteriorMesmoPeriodo}
        />

        <ActivitySection
          upcomingEvents={upcomingEvents}
          transactions={transactions}
          onDeleteTransaction={deleteTransaction}
          colorByCategoria={colorByCategoria}
          iconByCategoria={iconByCategoria}
          originDateById={originDateById}
        />

        <LoansSection
          loans={loans}
          onPayInstallment={payLoanInstallment}
          onUndoPayment={undoLoanInstallmentPayment}
        />

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Análises</h2>
          <AnalisesCard
            transactions={transactions}
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
