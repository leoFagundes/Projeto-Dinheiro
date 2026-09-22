"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  type TooltipContentProps,
} from "recharts";
import {
  categoryKey,
  CATEGORY_PALETTE,
  FALLBACK_CATEGORY_COLOR,
  FALLBACK_CATEGORY_ICON,
} from "@/lib/categories";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { EmptyState } from "@/app/_components/EmptyState";
import { TrendIndicator } from "@/app/_components/TrendIndicator";
import { PieChart as PieChartIcon, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import type { TransactionType } from "@/lib/types";

const GRID_COLOR = "var(--color-border)";
const TICK_STYLE = { fill: "var(--color-ink-muted)", fontSize: 12 };

/** Tooltip com a mesma cara dos cards do app, em vez da caixa branca padrão do Recharts. */
function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-card">
      {label && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-1.5 text-ink-muted">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: String(entry.color ?? entry.payload?.fill ?? "") }}
          />
          {entry.name ? `${entry.name}: ` : ""}
          {formatCurrency(Number(entry.value))}
        </p>
      ))}
    </div>
  );
}

/** Total no centro do donut — o valor já está calculado, só faltava mostrar. */
function DonutCenterLabel({ value, sub }: { value: number; sub: string }) {
  return (
    <>
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-ink text-sm font-semibold">
        {formatCurrency(value)}
      </text>
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-ink-muted text-[10px]">
        {sub}
      </text>
    </>
  );
}

export function CategoryPieChart({
  data,
  previousData,
  tipo = "despesa",
  colorByCategoria,
  iconByCategoria,
}: {
  data: { categoria: string; total: number }[];
  /** Mesmo breakdown do mês anterior, pra mostrar a variação ao lado de cada categoria. */
  previousData?: { categoria: string; total: number }[];
  tipo?: TransactionType;
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
}) {
  const [activeCategoria, setActiveCategoria] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title={tipo === "despesa" ? "Nenhum gasto este mês" : "Nenhuma receita este mês"}
        description={
          tipo === "despesa"
            ? "Quando você registrar despesas, elas aparecem aqui divididas por categoria."
            : "Quando você registrar receitas, elas aparecem aqui divididas por categoria."
        }
      />
    );
  }

  const totalGeral = data.reduce((sum, item) => sum + item.total, 0);
  const previousByCategoria = new Map((previousData ?? []).map((item) => [item.categoria, item.total]));

  return (
    <div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="categoria"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item) => (
                <Cell
                  key={item.categoria}
                  fill={colorByCategoria.get(categoryKey(tipo, item.categoria)) ?? FALLBACK_CATEGORY_COLOR}
                  opacity={activeCategoria === null || activeCategoria === item.categoria ? 1 : 0.35}
                  onMouseEnter={() => setActiveCategoria(item.categoria)}
                  onMouseLeave={() => setActiveCategoria(null)}
                  style={{ transition: "opacity 0.15s ease" }}
                />
              ))}
            </Pie>
            <DonutCenterLabel value={totalGeral} sub="Total" />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {data.map((item) => (
          <li
            key={item.categoria}
            onMouseEnter={() => setActiveCategoria(item.categoria)}
            onMouseLeave={() => setActiveCategoria(null)}
            className={`flex items-center justify-between rounded-lg px-1.5 py-0.5 text-sm transition-colors ${
              activeCategoria === item.categoria ? "bg-bg" : ""
            }`}
          >
            <span className="flex items-center gap-2 text-ink-muted">
              <span
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor:
                    colorByCategoria.get(categoryKey(tipo, item.categoria)) ?? FALLBACK_CATEGORY_COLOR,
                }}
              />
              <span>
                {iconByCategoria.get(categoryKey(tipo, item.categoria)) ?? FALLBACK_CATEGORY_ICON}
              </span>
              {item.categoria}
            </span>
            <span className="flex items-center gap-2">
              {previousData && (
                <TrendIndicator
                  current={item.total}
                  previous={previousByCategoria.get(item.categoria) ?? null}
                  invert={tipo === "despesa"}
                  className="text-[11px]"
                />
              )}
              {formatCurrency(item.total)}
              <span className="text-xs text-ink-muted">
                {Math.round((item.total / totalGeral) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pizza + legenda genéricas pra qualquer breakdown simples (banco, forma de pagamento). */
export function BreakdownChart({
  data,
  emptyTitle,
  emptyDescription,
}: {
  data: { label: string; total: number }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const filtered = data.filter((item) => item.total > 0);
  if (filtered.length === 0) {
    return <EmptyState icon={Wallet} title={emptyTitle} description={emptyDescription} />;
  }

  const totalGeral = filtered.reduce((sum, item) => sum + item.total, 0);
  const colorByLabel = new Map(
    filtered.map((item, index) => [item.label, CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]]),
  );

  return (
    <div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="total"
              nameKey="label"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {filtered.map((item) => (
                <Cell
                  key={item.label}
                  fill={colorByLabel.get(item.label)}
                  opacity={activeLabel === null || activeLabel === item.label ? 1 : 0.35}
                  onMouseEnter={() => setActiveLabel(item.label)}
                  onMouseLeave={() => setActiveLabel(null)}
                  style={{ transition: "opacity 0.15s ease" }}
                />
              ))}
            </Pie>
            <DonutCenterLabel value={totalGeral} sub="Total" />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {filtered.map((item) => (
          <li
            key={item.label}
            onMouseEnter={() => setActiveLabel(item.label)}
            onMouseLeave={() => setActiveLabel(null)}
            className={`flex items-center justify-between rounded-lg px-1.5 py-0.5 text-sm transition-colors ${
              activeLabel === item.label ? "bg-bg" : ""
            }`}
          >
            <span className="flex items-center gap-2 text-ink-muted">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: colorByLabel.get(item.label) }}
              />
              {item.label}
            </span>
            <span className="flex items-center gap-2">
              {formatCurrency(item.total)}
              <span className="text-xs text-ink-muted">
                {Math.round((item.total / totalGeral) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha/área genérica pra qualquer evolução mensal de um único valor (patrimônio, aportes acumulados, etc.). */
export function AreaTrendChart({
  data,
  label,
  color = "var(--color-chart-1)",
  icon: Icon,
  emptyTitle,
  emptyDescription,
}: {
  data: { monthKey: string; total: number }[];
  label: string;
  color?: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const gradientId = useId();
  if (data.length < 2) {
    return <EmptyState icon={Icon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis
            dataKey="monthKey"
            tickFormatter={(key: string) => formatMonthLabel(key).slice(0, 3)}
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} />}
            formatter={(value) => [formatCurrency(Number(value)), label]}
            labelFormatter={(monthLabel) => formatMonthLabel(String(monthLabel))}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras genéricas pra um único valor mensal (ex: aportes de investimento por mês). */
export function SingleSeriesBarChart({
  data,
  label,
  color = "var(--color-chart-1)",
  icon: Icon,
  emptyTitle,
  emptyDescription,
}: {
  data: { monthKey: string; total: number }[];
  label: string;
  color?: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const gradientId = useId();
  const hasMovement = data.some((item) => item.total !== 0);
  if (!hasMovement) {
    return <EmptyState icon={Icon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis
            dataKey="monthKey"
            tickFormatter={(key: string) => formatMonthLabel(key).slice(0, 3)}
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} />}
            formatter={(value) => [formatCurrency(Number(value)), label]}
            labelFormatter={(monthLabel) => formatMonthLabel(String(monthLabel))}
          />
          <Bar dataKey="total" fill={`url(#${gradientId})`} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Receitas x despesas por mês — não é um saldo acumulado (esse conceito hoje
 * é o Patrimônio, que depende do estado atual de bancos/caixinhas/investimentos,
 * não dá pra reconstruir com precisão só a partir do histórico de transações).
 */
export function MonthlyFlowChart({
  data,
}: {
  data: { monthKey: string; receitas: number; despesas: number; saldoMes: number }[];
}) {
  const receitasGradientId = useId();
  const despesasGradientId = useId();
  const hasMovement = data.some((item) => item.receitas !== 0 || item.despesas !== 0);
  if (!hasMovement) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sem histórico ainda"
        description="Receitas e despesas dos últimos meses aparecem aqui, lado a lado."
      />
    );
  }

  return (
    <div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={receitasGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id={despesasGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-negative)" stopOpacity={0.95} />
                <stop offset="100%" stopColor="var(--color-negative)" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="monthKey"
              tickFormatter={(key: string) => formatMonthLabel(key).slice(0, 3)}
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={(props) => <ChartTooltip {...props} />}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "receitas" ? "Receitas" : "Despesas",
              ]}
              labelFormatter={(label) => formatMonthLabel(String(label))}
            />
            <Bar dataKey="receitas" fill={`url(#${receitasGradientId})`} radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" fill={`url(#${despesasGradientId})`} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-accent" /> Receitas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-negative" /> Despesas
        </span>
      </div>
    </div>
  );
}
