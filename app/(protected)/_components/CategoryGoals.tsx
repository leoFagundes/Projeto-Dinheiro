"use client";

import { useState } from "react";
import { Pencil, Target } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/lib/use-categories";
import { computeCategoryBreakdown } from "@/lib/derived";
import { currentMonthKey, formatCurrency, formatMonthLabel } from "@/lib/format";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { MonthFilter } from "@/app/_components/MonthFilter";
import type { CategoryGoal, CategoryGoalOverride, Transaction } from "@/lib/types";

export function CategoryGoals({
  goals,
  overrides,
  transactions,
  iconByCategoria,
  onSetGoal,
  onRemoveGoal,
  onSetGoalOverride,
  onRemoveGoalOverride,
}: {
  goals: CategoryGoal[];
  overrides: CategoryGoalOverride[];
  transactions: Transaction[];
  iconByCategoria: Map<string, string>;
  onSetGoal: (categoria: string, limiteMensal: number) => Promise<void>;
  onRemoveGoal: (id: string) => Promise<void>;
  onSetGoalOverride: (categoria: string, monthKey: string, limiteMensal: number) => Promise<void>;
  onRemoveGoalOverride: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [overriding, setOverriding] = useState<CategoryGoal | null>(null);
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const gastosPorCategoria = new Map(
    computeCategoryBreakdown(transactions, monthKey).map((item) => [item.categoria, item.total]),
  );

  const overridingExisting = overriding
    ? (overrides.find((o) => o.categoria === overriding.categoria && o.monthKey === monthKey) ??
      null)
    : null;

  return (
    <div className="flex flex-col gap-3">
      {goals.length > 0 && (
        <MonthFilter monthKey={monthKey} onChange={setMonthKey} className="bg-surface" />
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhum limite definido"
          description="Defina um teto de gastos por categoria e acompanhe quando estiver perto de estourar."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => {
            const override = overrides.find(
              (o) => o.categoria === goal.categoria && o.monthKey === monthKey,
            );
            const limiteEfetivo = override?.limiteMensal ?? goal.limiteMensal;
            const gasto = gastosPorCategoria.get(goal.categoria) ?? 0;
            const percent = Math.min((gasto / limiteEfetivo) * 100, 100);
            const over = gasto > limiteEfetivo;
            return (
              <li key={goal.id} className="rounded-card bg-surface p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium">
                    <span className="shrink-0">
                      {iconByCategoria.get(goal.categoria) ?? FALLBACK_CATEGORY_ICON}
                    </span>
                    <span className="truncate">{goal.categoria}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={over ? "text-negative" : "text-ink-muted"}>
                      {formatCurrency(gasto)} / {formatCurrency(limiteEfetivo)}
                    </span>
                    <button
                      onClick={() => setOverriding(goal)}
                      aria-label={`Ajustar limite de ${goal.categoria} neste mês`}
                      className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
                    >
                      <Pencil size={13} />
                    </button>
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      over ? "bg-negative" : "bg-accent"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {override && (
                  <p className="mt-1.5 text-[11px] text-accent-strong">
                    limite personalizado pra {formatMonthLabel(monthKey).toLowerCase()}
                  </p>
                )}
                {over && (
                  <p className="mt-1.5 text-xs text-negative">
                    {formatCurrency(gasto - limiteEfetivo)} acima do limite
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => setEditing(true)}
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        {goals.length === 0 ? "Definir limites" : "Editar limites"}
      </button>

      <GoalsEditor
        open={editing}
        onSetGoal={onSetGoal}
        onRemoveGoal={onRemoveGoal}
        goals={goals}
        onClose={() => setEditing(false)}
      />

      <MonthOverrideSheet
        goal={overriding}
        monthKey={monthKey}
        existingOverride={overridingExisting}
        onSetGoalOverride={onSetGoalOverride}
        onRemoveGoalOverride={onRemoveGoalOverride}
        onClose={() => setOverriding(null)}
      />
    </div>
  );
}

function MonthOverrideSheet({
  goal,
  monthKey,
  existingOverride,
  onSetGoalOverride,
  onRemoveGoalOverride,
  onClose,
}: {
  goal: CategoryGoal | null;
  monthKey: string;
  existingOverride: CategoryGoalOverride | null;
  onSetGoalOverride: (categoria: string, monthKey: string, limiteMensal: number) => Promise<void>;
  onRemoveGoalOverride: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={goal !== null} onClose={onClose}>
      {goal && (
        <MonthOverrideFields
          key={`${goal.id}-${monthKey}`}
          goal={goal}
          monthKey={monthKey}
          existingOverride={existingOverride}
          onSetGoalOverride={onSetGoalOverride}
          onRemoveGoalOverride={onRemoveGoalOverride}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function MonthOverrideFields({
  goal,
  monthKey,
  existingOverride,
  onSetGoalOverride,
  onRemoveGoalOverride,
  onClose,
}: {
  goal: CategoryGoal;
  monthKey: string;
  existingOverride: CategoryGoalOverride | null;
  onSetGoalOverride: (categoria: string, monthKey: string, limiteMensal: number) => Promise<void>;
  onRemoveGoalOverride: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const monthLabel = formatMonthLabel(monthKey);
  const [valor, setValor] = useState(existingOverride?.limiteMensal ?? goal.limiteMensal);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      await onSetGoalOverride(goal.categoria, monthKey, valor);
      toast.success("Limite personalizado salvo.");
      onClose();
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!existingOverride) return;
    setSaving(true);
    try {
      await onRemoveGoalOverride(existingOverride.id);
      toast.success("Voltou a usar o limite geral.");
      onClose();
    } catch {
      toast.error("Não foi possível remover.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="font-medium">
        {goal.categoria} — {monthLabel}
      </p>
      <p className="mb-4 text-xs text-ink-muted">
        Esse valor substitui o limite geral ({formatCurrency(goal.limiteMensal)}) só em{" "}
        {monthLabel.toLowerCase()}. Os outros meses continuam com o limite geral, mesmo os que já
        passaram.
      </p>

      <CurrencyInput
        value={valor}
        onChange={setValor}
        className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
      >
        Salvar só para {monthLabel.toLowerCase()}
      </button>

      {existingOverride && (
        <button
          onClick={handleRemove}
          disabled={saving}
          className="mt-2 w-full text-center text-sm text-ink-muted transition-transform active:scale-95 hover:text-negative"
        >
          Remover personalização e voltar ao limite geral
        </button>
      )}
    </>
  );
}

function GoalsEditor({
  open,
  goals,
  onSetGoal,
  onRemoveGoal,
  onClose,
}: {
  open: boolean;
  goals: CategoryGoal[];
  onSetGoal: (categoria: string, limiteMensal: number) => Promise<void>;
  onRemoveGoal: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const { byType } = useCategories();
  const despesaCategorias = byType("despesa");
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const categoria of despesaCategorias) {
      const existing = goals.find((g) => g.categoria === categoria.nome);
      initial[categoria.nome] = existing?.limiteMensal ?? 0;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      for (const categoria of despesaCategorias) {
        const valor = values[categoria.nome];
        const existing = goals.find((g) => g.categoria === categoria.nome);
        if (valor > 0) {
          await onSetGoal(categoria.nome, valor);
        } else if (existing) {
          await onRemoveGoal(existing.id);
        }
      }
      toast.success("Limites atualizados.");
      onClose();
    } catch {
      toast.error("Não foi possível salvar os limites.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="font-medium">Limite mensal de gastos por categoria</p>
      <p className="mb-4 text-xs text-ink-muted">
        Cada limite vale todo mês, automaticamente. Pra um mês específico ser diferente do geral
        sem mudar os outros, use o lápis ao lado do limite na tela anterior.
      </p>
      <div className="flex flex-col gap-3">
        {despesaCategorias.map((categoria) => (
          <label key={categoria.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm text-ink-muted">
              <span>{categoria.icone ?? FALLBACK_CATEGORY_ICON}</span>
              {categoria.nome}
            </span>
            <CurrencyInput
              value={values[categoria.nome] ?? 0}
              onChange={(valor) =>
                setValues((prev) => ({ ...prev, [categoria.nome]: valor }))
              }
              placeholder="Sem limite"
              className="w-32 rounded-2xl border border-border px-3 py-2 text-right text-sm outline-none transition-colors focus:border-accent"
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm text-ink-muted transition-transform active:scale-95 hover:bg-bg"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-60"
        >
          Salvar
        </button>
      </div>
    </BottomSheet>
  );
}
