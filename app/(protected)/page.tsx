"use client";

import Link from "next/link";
import { useTransactions } from "@/lib/use-transactions";
import { useCategoryGoals } from "@/lib/use-category-goals";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { usePockets } from "@/lib/use-pockets";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import {
  computeBalanceTrend,
  computeBankBreakdown,
  computeCategoryBreakdown,
  computeDespesasVariacao,
  computeMonthTotals,
  computeSaldoAtual,
} from "@/lib/derived";
import { currentMonthKey } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { DashboardSkeleton } from "@/app/_components/Skeleton";
import { SummaryCards } from "./_components/SummaryCards";
import { RecentTransactions } from "./_components/RecentTransactions";
import { AnalisesCard } from "./_components/AnalisesCard";
import { CategoryGoals } from "./_components/CategoryGoals";
import { PocketsSection } from "./_components/PocketsSection";

export default function DashboardPage() {
  const { transactions, loading, deleteTransaction } = useTransactions();
  const { goals, setGoal } = useCategoryGoals();
  const { categories } = useCategories();
  const { banks, adjustSaldoDevedor } = useBanks();
  const { pockets, adjustSaldo } = usePockets();

  if (loading) {
    return <DashboardSkeleton />;
  }

  const thisMonth = currentMonthKey();
  const saldoAtual = computeSaldoAtual(transactions);
  const { receitas, despesas } = computeMonthTotals(transactions, thisMonth);
  const variacaoDespesas = computeDespesasVariacao(transactions, thisMonth);
  const categoryBreakdown = computeCategoryBreakdown(transactions, thisMonth);
  const bankBreakdown = computeBankBreakdown(transactions, thisMonth, banks);
  const balanceTrend = computeBalanceTrend(transactions, 6);
  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const gastosPorCategoria = new Map(
    categoryBreakdown.map((item) => [item.categoria, item.total]),
  );
  const gastosMesPorBanco = new Map(bankBreakdown.map((item) => [item.bancoId, item.total]));
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));

  return (
    <PageFade>
      <div className="flex flex-col gap-10 pb-8">
        <SummaryCards
          saldoAtual={saldoAtual}
          receitasMes={receitas}
          despesasMes={despesas}
          variacaoDespesas={variacaoDespesas}
        />

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
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Caixinhas</h2>
          <PocketsSection pockets={pockets} onAdjust={adjustSaldo} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Análises do mês</h2>
          <AnalisesCard
            categoryBreakdown={categoryBreakdown}
            colorByCategoria={colorByCategoria}
            iconByCategoria={iconByCategoria}
            banks={banks}
            gastosMesPorBanco={gastosMesPorBanco}
            onAdjustBanco={adjustSaldoDevedor}
            balanceTrend={balanceTrend}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Metas por categoria</h2>
          <CategoryGoals
            goals={goals}
            gastosPorCategoria={gastosPorCategoria}
            iconByCategoria={iconByCategoria}
            onSetGoal={setGoal}
          />
        </section>
      </div>
    </PageFade>
  );
}
