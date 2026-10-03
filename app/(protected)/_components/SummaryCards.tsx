import { MaskedCurrency } from "@/app/_components/Money";
import { TrendIndicator } from "@/app/_components/TrendIndicator";

/**
 * Topo do Dashboard: quanto entrou e quanto saiu no mês ATÉ HOJE (número
 * grande), com o que ainda vai cair/vencer até o fim do mês numa linha
 * menor — o total do mês sozinho misturava o que já aconteceu com o futuro.
 */
export function SummaryCards({
  receitasAteHoje,
  receitasAReceber,
  despesasAteHoje,
  despesasAPagar,
  despesasMesAnteriorMesmoPeriodo,
}: {
  receitasAteHoje: number;
  receitasAReceber: number;
  despesasAteHoje: number;
  despesasAPagar: number;
  despesasMesAnteriorMesmoPeriodo: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="text-xs text-ink-muted">Recebido no mês</p>
        <p className="mt-1 text-xl font-semibold text-accent-strong">
          <MaskedCurrency value={receitasAteHoje} />
        </p>
        {receitasAReceber > 0 && (
          <p className="mt-0.5 text-xs text-ink-muted">
            + <MaskedCurrency value={receitasAReceber} /> a receber
          </p>
        )}
      </div>

      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="text-xs text-ink-muted">Gasto no mês</p>
        <p className="mt-1 text-xl font-semibold text-negative">
          <MaskedCurrency value={despesasAteHoje} />
        </p>
        {despesasAPagar > 0 && (
          <p className="mt-0.5 text-xs text-ink-muted">
            + <MaskedCurrency value={despesasAPagar} /> a pagar
          </p>
        )}
        {despesasMesAnteriorMesmoPeriodo > 0 && despesasAteHoje !== despesasMesAnteriorMesmoPeriodo && (
          <p className="mt-0.5 text-xs text-ink-muted">
            <TrendIndicator current={despesasAteHoje} previous={despesasMesAnteriorMesmoPeriodo} invert />
            <span className="ml-1">vs mesmo período</span>
          </p>
        )}
      </div>
    </div>
  );
}
