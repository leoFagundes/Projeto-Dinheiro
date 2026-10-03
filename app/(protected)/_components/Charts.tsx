"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { ChevronRight, PieChart as PieChartIcon, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { categoryKey, CATEGORY_PALETTE, FALLBACK_CATEGORY_COLOR, FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { EmptyState } from "@/app/_components/EmptyState";
import { MaskedCurrency } from "@/app/_components/Money";
import { TrendIndicator } from "@/app/_components/TrendIndicator";
import { useValuesVisibility } from "@/lib/visibility-context";
import type { TransactionType } from "@/lib/types";

/*
 * Convenções (skill de dataviz): grade/eixos em hairline sólido e recessivo;
 * barras sólidas de no máx. 24px com a ponta arredondada; linhas de 2px; eixo
 * Y com valores compactos pra nenhum valor depender só do tooltip; legenda
 * sempre que houver 2+ séries; texto nunca na cor da série.
 */
const GRID_COLOR = "var(--color-border)";
const TICK_STYLE = { fill: "var(--color-ink-muted)", fontSize: 11 };
const MAX_BAR_SIZE = 24;
const CHART_MARGIN = { top: 8, right: 4, left: 0, bottom: 0 };

const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Formatador do eixo Y — respeita o "ocultar valores" do topo do app. */
function useAxisMoneyFormatter() {
  const { hidden } = useValuesVisibility();
  return (value: number) => (hidden ? "•••" : compactNumber.format(value));
}

/**
 * Tooltip com a cara dos cards do app. O valor vem primeiro e em destaque;
 * o nome da série, depois e mais apagado (o leitor já sabe qual é a série e
 * quer o número). Séries sem valor naquele ponto (null) não aparecem.
 */
function ChartTooltip({ active, payload, label, labelFormatter }: TooltipContentProps) {
  const { hidden } = useValuesVisibility();
  if (!active || !payload || payload.length === 0) return null;
  const entries = payload.filter((entry) => entry.value !== null && entry.value !== undefined);
  if (entries.length === 0) return null;
  const displayLabel = labelFormatter ? labelFormatter(label, payload) : label;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-card">
      {displayLabel != null && displayLabel !== "" && <p className="mb-1 text-ink-muted">{displayLabel}</p>}
      {entries.map((entry, index) => (
        <p key={index} className="flex items-center gap-2">
          <span
            className="h-0.5 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: String(entry.color ?? entry.payload?.fill ?? "") }}
          />
          <span className="font-semibold text-ink">{hidden ? "••••" : formatCurrency(Number(entry.value))}</span>
          {entry.name && <span className="text-ink-muted">{entry.name}</span>}
        </p>
      ))}
    </div>
  );
}

/** Total no centro do donut. */
function DonutCenterLabel({ value, sub }: { value: number; sub: string }) {
  const { hidden } = useValuesVisibility();
  return (
    <>
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-ink text-sm font-semibold">
        {hidden ? "••••" : formatCurrency(value)}
      </text>
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-ink-muted text-[10px]">
        {sub}
      </text>
    </>
  );
}

/** Legenda de séries — traço curto pra linha, quadradinho pra barra (espelha a marca). */
function SeriesLegend({ items }: { items: { label: string; color: string; shape: "line" | "bar" }[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-muted">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={item.shape === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-sm"}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// Acima de 6 fatias o donut fica ilegível (e as cores começam a se repetir a
// partir da 9ª categoria) — a cauda vira uma fatia cinza "Demais". A lista
// embaixo continua com TODAS as categorias, cada uma clicável.
const MAX_DONUT_SLICES = 6;
const DEMAIS_KEY = "__demais__";

export function CategoryPieChart({
  data,
  previousData,
  previousLabel = "mês passado",
  tipo = "despesa",
  colorByCategoria,
  iconByCategoria,
  onSelectCategoria,
}: {
  data: { categoria: string; total: number }[];
  /** Mesmo breakdown no período anterior, pra mostrar a variação ao lado de cada categoria. */
  previousData?: { categoria: string; total: number }[];
  previousLabel?: string;
  tipo?: TransactionType;
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  /** Quando presente, cada categoria (na lista e no donut) abre o detalhe dela. */
  onSelectCategoria?: (categoria: string) => void;
}) {
  const [activeSlice, setActiveSlice] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title={tipo === "despesa" ? "Nenhum gasto neste período" : "Nenhuma receita neste período"}
        description={
          tipo === "despesa"
            ? "Quando você registrar despesas, elas aparecem aqui divididas por categoria."
            : "Quando você registrar receitas, elas aparecem aqui divididas por categoria."
        }
      />
    );
  }

  const colorOf = (categoria: string) =>
    colorByCategoria.get(categoryKey(tipo, categoria)) ?? FALLBACK_CATEGORY_COLOR;
  const totalGeral = data.reduce((sum, item) => sum + item.total, 0);
  const previousByCategoria = new Map((previousData ?? []).map((item) => [item.categoria, item.total]));

  const agrupa = data.length > MAX_DONUT_SLICES;
  const principais = agrupa ? data.slice(0, MAX_DONUT_SLICES - 1) : data;
  const slices = principais.map((item) => ({ key: item.categoria, nome: item.categoria, total: item.total, color: colorOf(item.categoria) }));
  if (agrupa) {
    slices.push({
      key: DEMAIS_KEY,
      nome: "Demais",
      total: data.slice(MAX_DONUT_SLICES - 1).reduce((sum, item) => sum + item.total, 0),
      color: FALLBACK_CATEGORY_COLOR,
    });
  }
  const sliceKeyOf = (categoria: string) =>
    !agrupa || principais.some((item) => item.categoria === categoria) ? categoria : DEMAIS_KEY;

  return (
    <div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="total"
              nameKey="nome"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="var(--color-surface)"
              strokeWidth={2}
              onClick={(_, index) => {
                const slice = slices[index];
                if (onSelectCategoria && slice && slice.key !== DEMAIS_KEY) onSelectCategoria(slice.key);
              }}
            >
              {slices.map((slice) => (
                <Cell
                  key={slice.key}
                  fill={slice.color}
                  opacity={activeSlice === null || activeSlice === slice.key ? 1 : 0.35}
                  onMouseEnter={() => setActiveSlice(slice.key)}
                  onMouseLeave={() => setActiveSlice(null)}
                  style={{
                    transition: "opacity 0.15s ease",
                    cursor: onSelectCategoria && slice.key !== DEMAIS_KEY ? "pointer" : "default",
                  }}
                />
              ))}
            </Pie>
            <DonutCenterLabel value={totalGeral} sub="Total" />
            <Tooltip content={(props) => <ChartTooltip {...props} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-col gap-0.5">
        {data.map((item) => {
          const percent = (item.total / totalGeral) * 100;
          const conteudo = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <span aria-hidden>{iconByCategoria.get(categoryKey(tipo, item.categoria)) ?? FALLBACK_CATEGORY_ICON}</span>
                  <span className="truncate">{item.categoria}</span>
                </span>
                <span className="h-1 w-full overflow-hidden rounded-full bg-bg">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(percent, 2)}%`, backgroundColor: colorOf(item.categoria) }}
                  />
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <MaskedCurrency value={item.total} className="text-sm font-medium" />
                <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  {previousData && (
                    <TrendIndicator
                      current={item.total}
                      previous={previousByCategoria.get(item.categoria) ?? null}
                      invert={tipo === "despesa"}
                    />
                  )}
                  {Math.round(percent)}%
                </span>
              </span>
              {onSelectCategoria && <ChevronRight size={14} className="shrink-0 text-ink-muted/60" />}
            </>
          );
          const className = `flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
            activeSlice === sliceKeyOf(item.categoria) ? "bg-bg" : ""
          }`;
          return (
            <li
              key={item.categoria}
              onMouseEnter={() => setActiveSlice(sliceKeyOf(item.categoria))}
              onMouseLeave={() => setActiveSlice(null)}
            >
              {onSelectCategoria ? (
                <button
                  type="button"
                  onClick={() => onSelectCategoria(item.categoria)}
                  className={`${className} hover:bg-bg active:scale-[0.99]`}
                  aria-label={`Ver transações de ${item.categoria}`}
                >
                  {conteudo}
                </button>
              ) : (
                <div className={className}>{conteudo}</div>
              )}
            </li>
          );
        })}
      </ul>
      {previousData && (
        <p className="mt-2 text-center text-[11px] text-ink-muted">Setinhas comparam com o {previousLabel}.</p>
      )}
    </div>
  );
}

/** Pizza + legenda genéricas pra qualquer breakdown simples (ex: composição da carteira). */
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
  // Cor pela posição FIXA do item na lista original (não na filtrada) — um
  // item que zera e some não pode repintar os outros.
  const colorByLabel = new Map(data.map((item, index) => [item.label, CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]]));

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
              stroke="var(--color-surface)"
              strokeWidth={2}
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
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: colorByLabel.get(item.label) }} />
              {item.label}
            </span>
            <span className="flex items-center gap-2">
              <MaskedCurrency value={item.total} />
              <span className="text-xs text-ink-muted">{Math.round((item.total / totalGeral) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha/área genérica pra qualquer evolução mensal de um único valor (ex: aportes acumulados). */
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
  const formatAxis = useAxisMoneyFormatter();
  if (data.length < 2) {
    return <EmptyState icon={Icon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.14} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
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
          <YAxis width={44} tick={TICK_STYLE} tickFormatter={formatAxis} axisLine={false} tickLine={false} />
          <Tooltip
            content={(props) => <ChartTooltip {...props} />}
            labelFormatter={(monthLabel) => formatMonthLabel(String(monthLabel))}
          />
          <Area
            type="monotone"
            dataKey="total"
            name={label}
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            activeDot={{ r: 4, stroke: "var(--color-surface)", strokeWidth: 2 }}
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
  return (
    <PeriodBarChart
      data={data.map((item) => ({ label: formatMonthLabel(item.monthKey).slice(0, 3), tooltipLabel: formatMonthLabel(item.monthKey), total: item.total }))}
      seriesName={label}
      color={color}
      emptyIcon={Icon}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  );
}

/** Barras de um único valor ao longo de fatias (dias da semana/mês, meses do ano...). */
export function PeriodBarChart({
  data,
  seriesName,
  color,
  emptyIcon = TrendingUp,
  emptyTitle,
  emptyDescription,
  heightClass = "h-52",
}: {
  data: { label: string; tooltipLabel?: string; total: number }[];
  seriesName: string;
  color: string;
  emptyIcon?: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  heightClass?: string;
}) {
  const formatAxis = useAxisMoneyFormatter();
  if (!data.some((item) => item.total !== 0)) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }
  const tooltipLabels = new Map(data.map((item) => [item.label, item.tooltipLabel ?? item.label]));

  return (
    <div className={heightClass}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} minTickGap={8} />
          <YAxis width={44} tick={TICK_STYLE} tickFormatter={formatAxis} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--color-bg)" }}
            content={(props) => <ChartTooltip {...props} />}
            labelFormatter={(label) => tooltipLabels.get(String(label)) ?? String(label)}
          />
          <Bar dataKey="total" name={seriesName} fill={color} radius={[4, 4, 0, 0]} maxBarSize={MAX_BAR_SIZE} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Acumulado do período atual (linha principal) contra o anterior na mesma
 * posição (linha cinza de contexto) — responde "estou gastando mais rápido
 * que no mês passado?". A linha atual termina em hoje.
 */
export function CumulativeComparisonChart({
  data,
  atualLabel,
  anteriorLabel,
  color,
  tooltipLabelPrefix = "",
}: {
  data: { label: string; atual: number | null; anterior: number | null }[];
  atualLabel: string;
  anteriorLabel: string;
  color: string;
  tooltipLabelPrefix?: string;
}) {
  const formatAxis = useAxisMoneyFormatter();
  if (!data.some((item) => (item.atual ?? 0) !== 0 || (item.anterior ?? 0) !== 0)) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Nada pra comparar ainda"
        description="Assim que houver lançamentos neste período ou no anterior, o ritmo dos dois aparece aqui."
      />
    );
  }

  return (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} minTickGap={8} />
            <YAxis width={44} tick={TICK_STYLE} tickFormatter={formatAxis} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: GRID_COLOR }}
              content={(props) => <ChartTooltip {...props} />}
              labelFormatter={(label) => `${tooltipLabelPrefix}${String(label)}`}
            />
            <Line
              type="monotone"
              dataKey="anterior"
              name={anteriorLabel}
              stroke="var(--color-chart-muted)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--color-surface)", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="atual"
              name={atualLabel}
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, stroke: "var(--color-surface)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend
        items={[
          { label: atualLabel, color, shape: "line" },
          { label: anteriorLabel, color: "var(--color-chart-muted)", shape: "line" },
        ]}
      />
    </div>
  );
}

/** Receitas x despesas por período — cada barra é independente, não um saldo acumulado. */
export function FlowTrendChart({
  data,
}: {
  data: { label: string; receitas: number; despesas: number }[];
}) {
  const formatAxis = useAxisMoneyFormatter();
  if (!data.some((item) => item.receitas !== 0 || item.despesas !== 0)) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sem histórico ainda"
        description="Receitas e despesas dos últimos períodos aparecem aqui, lado a lado."
      />
    );
  }

  return (
    <div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={CHART_MARGIN} barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="label" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis width={44} tick={TICK_STYLE} tickFormatter={formatAxis} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "var(--color-bg)" }} content={(props) => <ChartTooltip {...props} />} />
            <Bar dataKey="receitas" name="Receitas" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={MAX_BAR_SIZE} />
            <Bar dataKey="despesas" name="Despesas" fill="var(--color-negative)" radius={[4, 4, 0, 0]} maxBarSize={MAX_BAR_SIZE} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend
        items={[
          { label: "Receitas", color: "var(--color-accent)", shape: "bar" },
          { label: "Despesas", color: "var(--color-negative)", shape: "bar" },
        ]}
      />
    </div>
  );
}
