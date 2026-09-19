"use client";

import Link from "next/link";
import { useTransactions } from "@/lib/use-transactions";
import { useCategoryGoals } from "@/lib/use-category-goals";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { useBankPayments } from "@/lib/use-bank-payments";
import { usePockets } from "@/lib/use-pockets";
import { usePocketMovements } from "@/lib/use-pocket-movements";
import { useInvestments } from "@/lib/use-investments";
import { useInvestmentMovements } from "@/lib/use-investment-movements";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import {
  computeBalanceTrend,
  computeBankBreakdown,
  computeBankSaldoConta,
  computeCategoryBreakdown,
  computeDespesasVariacao,
  computeMonthTotals,
  computePatrimonio,
  computeUpcomingEvents,
} from "@/lib/derived";
import { currentMonthKey } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { DashboardSkeleton } from "@/app/_components/Skeleton";
import { SummaryCards } from "./_components/SummaryCards";
import { RecentTransactions } from "./_components/RecentTransactions";
import { UpcomingEvents } from "./_components/UpcomingEvents";
import { AnalisesCard } from "./_components/AnalisesCard";
import { BankDebtSection } from "./_components/BankDebtSection";
import { CategoryGoals } from "./_components/CategoryGoals";
import { PocketsSection } from "./_components/PocketsSection";
import { InvestmentsSection } from "./_components/InvestmentsSection";

export default function DashboardPage() {
  const { transactions, loading, deleteTransaction } = useTransactions();
  const { goals, setGoal, removeGoal } = useCategoryGoals();
  const { categories } = useCategories();
  const { banks, payFatura } = useBanks();
  const { payments: bankPayments } = useBankPayments();
  const { pockets, adjustSaldo, moveFunds, registrarRendimento } = usePockets();
  const { movements } = usePocketMovements();
  const { investments, moveInvestment, registrarRendimento: registrarRendimentoInvestimento } =
    useInvestments();
  const { movements: investmentMovements } = useInvestmentMovements();

  if (loading) {
    return <DashboardSkeleton />;
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
  );
  const upcomingEvents = computeUpcomingEvents(transactions, 7);
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
  const categoriaNomes = new Set(categories.filter((c) => c.tipo === "despesa").map((c) => c.nome));
  const goalsValidos = goals.filter((g) => categoriaNomes.has(g.categoria));
  const gastosMesPorBanco = new Map(bankBreakdown.map((item) => [item.bancoId, item.total]));
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  const saldoContaPorBanco = new Map(
    banks.map((b) => [
      b.id,
      computeBankSaldoConta(b, transactions, movements, bankPayments, investmentMovements),
    ]),
  );

  return (
    <PageFade>
      <div className="flex flex-col gap-10 pb-8">
        <SummaryCards
          patrimonio={patrimonio}
          receitasMes={receitas}
          despesasMes={despesas}
          variacaoDespesas={variacaoDespesas}
        />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-muted">Próximos dias</h2>
            <Link href="/calendario" className="text-xs text-accent-strong hover:underline">
              Ver agenda
            </Link>
          </div>
          <UpcomingEvents events={upcomingEvents} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Bancos</h2>
          <BankDebtSection
            banks={banks}
            gastosMesPorBanco={gastosMesPorBanco}
            saldoContaPorBanco={saldoContaPorBanco}
            onPayFatura={payFatura}
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
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Caixinhas</h2>
          <PocketsSection
            pockets={pockets}
            banks={banks}
            movements={movements}
            onAdjust={adjustSaldo}
            onMoveFunds={moveFunds}
            onRegistrarRendimento={registrarRendimento}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Investimentos</h2>
          <InvestmentsSection
            investments={investments}
            movements={investmentMovements}
            banks={banks}
            onMove={moveInvestment}
            onRegistrarRendimento={registrarRendimentoInvestimento}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Análises do mês</h2>
          <AnalisesCard
            categoryBreakdown={categoryBreakdown}
            colorByCategoria={colorByCategoria}
            iconByCategoria={iconByCategoria}
            balanceTrend={balanceTrend}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Metas por categoria</h2>
          <CategoryGoals
            goals={goalsValidos}
            gastosPorCategoria={gastosPorCategoria}
            iconByCategoria={iconByCategoria}
            onSetGoal={setGoal}
            onRemoveGoal={removeGoal}
          />
        </section>
      </div>
    </PageFade>
  );
}
