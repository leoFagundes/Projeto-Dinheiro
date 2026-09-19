import { Money } from "@/app/_components/Money";
import { formatCurrency } from "@/lib/format";

export function SummaryCards({
  patrimonio,
  receitasMes,
  despesasMes,
  variacaoDespesas,
}: {
  patrimonio: {
    contas: number;
    caixinhas: number;
    investimentos: number;
    dividas: number;
    total: number;
  };
  receitasMes: number;
  despesasMes: number;
  variacaoDespesas: number | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card bg-surface p-5">
        <p className="text-sm text-ink-muted">Patrimônio</p>
        <p className="mt-1 text-3xl font-semibold">
          <Money value={patrimonio.total} />
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          <span>Contas: {formatCurrency(patrimonio.contas)}</span>
          <span>Caixinhas: {formatCurrency(patrimonio.caixinhas)}</span>
          {patrimonio.investimentos > 0 && (
            <span>Investimentos: {formatCurrency(patrimonio.investimentos)}</span>
          )}
          {patrimonio.dividas > 0 && (
            <span className="text-negative">Fatura: -{formatCurrency(patrimonio.dividas)}</span>
          )}
        </div>
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
