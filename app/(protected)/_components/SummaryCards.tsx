import { Money } from "@/app/_components/Money";
import { formatCurrency } from "@/lib/format";

export function SummaryCards({
  saldoAtual,
  receitasMes,
  despesasMes,
  variacaoDespesas,
}: {
  saldoAtual: number;
  receitasMes: number;
  despesasMes: number;
  variacaoDespesas: number | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card bg-surface p-5">
        <p className="text-sm text-ink-muted">Saldo atual</p>
        <p className="mt-1 text-3xl font-semibold">
          <Money value={saldoAtual} />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card bg-surface p-4">
          <p className="text-xs text-ink-muted">Receitas do mês</p>
          <p className="mt-1 text-lg font-medium text-accent-strong">
            {formatCurrency(receitasMes)}
          </p>
        </div>
        <div className="rounded-card bg-surface p-4">
          <p className="text-xs text-ink-muted">Despesas do mês</p>
          <p className="mt-1 text-lg font-medium text-negative">
            {formatCurrency(despesasMes)}
          </p>
          {variacaoDespesas !== null && (
            <p
              className={`mt-0.5 text-xs ${
                variacaoDespesas > 0 ? "text-negative" : "text-accent-strong"
              }`}
            >
              {variacaoDespesas > 0 ? "+" : ""}
              {variacaoDespesas.toFixed(0)}% vs mês anterior
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
