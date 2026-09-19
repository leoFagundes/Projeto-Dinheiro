"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/lib/use-categories";
import { formatCurrency } from "@/lib/format";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import type { CategoryGoal } from "@/lib/types";

export function CategoryGoals({
  goals,
  gastosPorCategoria,
  iconByCategoria,
  onSetGoal,
}: {
  goals: CategoryGoal[];
  gastosPorCategoria: Map<string, number>;
  iconByCategoria: Map<string, string>;
  onSetGoal: (categoria: string, limiteMensal: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta definida"
          description="Defina um limite mensal por categoria para acompanhar seus gastos."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => {
            const gasto = gastosPorCategoria.get(goal.categoria) ?? 0;
            const percent = Math.min((gasto / goal.limiteMensal) * 100, 100);
            const over = gasto > goal.limiteMensal;
            return (
              <li key={goal.id} className="rounded-card bg-surface p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span>{iconByCategoria.get(goal.categoria) ?? FALLBACK_CATEGORY_ICON}</span>
                    {goal.categoria}
                  </span>
                  <span className={over ? "text-negative" : "text-ink-muted"}>
                    {formatCurrency(gasto)} / {formatCurrency(goal.limiteMensal)}
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
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => setEditing(true)}
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        {goals.length === 0 ? "Definir metas" : "Editar metas"}
      </button>

      <GoalsEditor
        open={editing}
        onSetGoal={onSetGoal}
        goals={goals}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}

function GoalsEditor({
  open,
  goals,
  onSetGoal,
  onClose,
}: {
  open: boolean;
  goals: CategoryGoal[];
  onSetGoal: (categoria: string, limiteMensal: number) => Promise<void>;
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
        if (valor > 0) {
          await onSetGoal(categoria.nome, valor);
        }
      }
      toast.success("Metas atualizadas.");
      onClose();
    } catch {
      toast.error("Não foi possível salvar as metas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="mb-4 font-medium">Metas mensais por categoria</p>
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
