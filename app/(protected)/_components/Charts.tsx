"use client";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { FALLBACK_CATEGORY_COLOR, FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { EmptyState } from "@/app/_components/EmptyState";
import { PieChart as PieChartIcon, TrendingUp } from "lucide-react";

export function CategoryPieChart({
  data,
  colorByCategoria,
  iconByCategoria,
}: {
  data: { categoria: string; total: number }[];
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="Nenhum gasto este mês"
        description="Quando você registrar despesas, elas aparecem aqui divididas por categoria."
      />
    );
  }

  const totalGeral = data.reduce((sum, item) => sum + item.total, 0);

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
                  fill={colorByCategoria.get(item.categoria) ?? FALLBACK_CATEGORY_COLOR}
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
                    colorByCategoria.get(item.categoria) ?? FALLBACK_CATEGORY_COLOR,
                }}
              />
              <span>{iconByCategoria.get(item.categoria) ?? FALLBACK_CATEGORY_ICON}</span>
              {item.categoria}
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

export function BalanceTrendChart({
  data,
}: {
  data: { monthKey: string; saldo: number }[];
}) {
  const hasMovement = data.some((item) => item.saldo !== 0);
  if (!hasMovement) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sem histórico ainda"
        description="A evolução do seu saldo nos últimos meses aparece aqui."
      />
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e4df" />
          <XAxis
            dataKey="monthKey"
            tickFormatter={(key: string) => formatMonthLabel(key).slice(0, 3)}
            tick={{ fill: "#79716b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={0} stroke="#c3c2b7" strokeDasharray="3 3" />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(label) => formatMonthLabel(String(label))}
          />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3, fill: "#16a34a", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
