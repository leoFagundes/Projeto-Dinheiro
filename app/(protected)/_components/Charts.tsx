"use client";

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
import { Landmark, PieChart as PieChartIcon, TrendingUp, Wallet } from "lucide-react";
import type { TransactionType } from "@/lib/types";

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
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {data.map((item) => (
          <li
            key={item.categoria}
            className="flex items-center justify-between text-sm"
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
                <Cell key={item.label} fill={colorByLabel.get(item.label)} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-2 flex flex-col gap-2">
        {filtered.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-sm">
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

/** Evolução do patrimônio total mês a mês, a partir dos retratos salvos. */
export function PatrimonioTrendChart({
  data,
}: {
  data: { monthKey: string; total: number }[];
}) {
  if (data.length < 2) {
    return (
      <EmptyState
        icon={Landmark}
        title="Ainda não há histórico suficiente"
        description="O app passou a guardar um retrato do seu patrimônio a cada mês — volte aqui com o tempo pra ver a evolução."
      />
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e4df" />
          <XAxis
            dataKey="monthKey"
            tickFormatter={(key: string) => formatMonthLabel(key).slice(0, 3)}
            tick={{ fill: "#79716b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Patrimônio"]}
            labelFormatter={(label) => formatMonthLabel(String(label))}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#2a78d6"
            fill="#2a78d6"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
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
            <CartesianGrid vertical={false} stroke="#e7e4df" />
            <XAxis
              dataKey="monthKey"
              tickFormatter={(key: string) => formatMonthLabel(key).slice(0, 3)}
              tick={{ fill: "#79716b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "receitas" ? "Receitas" : "Despesas",
              ]}
              labelFormatter={(label) => formatMonthLabel(String(label))}
            />
            <Bar dataKey="receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" fill="#e05252" radius={[4, 4, 0, 0]} />
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
