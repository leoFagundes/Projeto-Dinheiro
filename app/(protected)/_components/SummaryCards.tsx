import { Money, MaskedCurrency } from "@/app/_components/Money";
import { TrendIndicator } from "@/app/_components/TrendIndicator";

export function SummaryCards({
  patrimonio,
  receitasMes,
  despesasMes,
  despesasMesAnterior,
  saldoProjetadoMes,
}: {
  patrimonio: {
    contas: number;
    caixinhas: number;
    investimentos: number;
    dividas: number;
    saldoLivre: number;
    total: number;
  };
  receitasMes: number;
  despesasMes: number;
  despesasMesAnterior: number | null;
  saldoProjetadoMes: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card bg-surface shadow-card p-5">
        <p className="text-sm text-ink-muted">Patrimônio</p>
        <p className="mt-1 text-3xl font-semibold">
          <Money value={patrimonio.total} />
        </p>
        {patrimonio.dividas > 0 && (
          <p className="mt-0.5 text-xs text-ink-muted">
            <MaskedCurrency value={patrimonio.saldoLivre} /> livres depois de pagar as faturas
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          <span>
            Contas: <MaskedCurrency value={patrimonio.contas} />
          </span>
          <span>
            Caixinhas: <MaskedCurrency value={patrimonio.caixinhas} />
          </span>
          {patrimonio.investimentos > 0 && (
            <span>
              Investimentos: <MaskedCurrency value={patrimonio.investimentos} />
            </span>
          )}
          {patrimonio.dividas > 0 && (
            <span className="text-negative">
              Fatura: -<MaskedCurrency value={patrimonio.dividas} />
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card bg-surface shadow-card p-4">
          <p className="text-xs text-ink-muted">Receitas do mês</p>
          <p className="mt-1 text-lg font-medium text-accent-strong">
            <MaskedCurrency value={receitasMes} />
          </p>
        </div>
        <div className="rounded-card bg-surface shadow-card p-4">
          <p className="text-xs text-ink-muted">Despesas do mês</p>
          <p className="mt-1 text-lg font-medium text-negative">
            <MaskedCurrency value={despesasMes} />
          </p>
          {despesasMesAnterior !== null && despesasMesAnterior !== 0 && (
            <p className="mt-0.5">
              <TrendIndicator
                current={despesasMes}
                previous={despesasMesAnterior}
                invert
                className="text-xs"
              />
              <span className="ml-1 text-xs text-ink-muted">vs mês anterior</span>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="text-xs text-ink-muted">Saldo projetado do mês</p>
        <p
          className={`mt-1 text-lg font-medium ${saldoProjetadoMes < 0 ? "text-negative" : "text-accent-strong"}`}
        >
          <MaskedCurrency value={saldoProjetadoMes} />
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Receitas menos despesas já lançadas e previstas até o fim do mês.
        </p>
      </div>
    </div>
  );
}
