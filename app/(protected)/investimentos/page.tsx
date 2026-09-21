"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronUp, Plus, Trash2, TrendingUp } from "lucide-react";
import { useInvestments } from "@/lib/use-investments";
import { useInvestmentMovements } from "@/lib/use-investment-movements";
import { useInvestmentGoals } from "@/lib/use-investment-goals";
import {
  computeCumulativeContributions,
  computeInvestmentComposition,
  computeInvestmentYearLedger,
  computeInvestmentYears,
  computeYearlyContributions,
  investmentTypeLabel,
} from "@/lib/derived";
import { currentYear, formatMonthLabel } from "@/lib/format";
import type { Investment, InvestmentGoal, InvestmentMovement } from "@/lib/types";
import { Money, MaskedCurrency } from "@/app/_components/Money";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { EmptyState } from "@/app/_components/EmptyState";
import { PageFade } from "@/app/_components/PageFade";
import { AreaTrendChart, BreakdownChart, SingleSeriesBarChart } from "../_components/Charts";

export default function InvestimentosPage() {
  const { investments } = useInvestments();
  const { movements } = useInvestmentMovements();
  const { goals, addGoal, removeGoal } = useInvestmentGoals();

  const anos = computeInvestmentYears(movements);
  const [ano, setAno] = useState(anos[0]);

  const totalInvestido = investments.reduce((sum, i) => sum + i.valorInvestido, 0);
  const valorAtual = investments.reduce((sum, i) => sum + (i.saldoAtual ?? i.valorInvestido), 0);
  const rendimento = valorAtual - totalInvestido;

  const composicao = computeInvestmentComposition(investments);
  const composicaoData = [
    { label: "Ações", total: composicao.acoes },
    { label: "FIIs", total: composicao.fiis },
    { label: "Renda variável (outros)", total: composicao.rendaVariavelOutros },
    { label: "Renda fixa", total: composicao.rendaFixa },
  ];

  const aportesDoAno = computeYearlyContributions(movements, ano);
  const acumulado = computeCumulativeContributions(movements);

  if (investments.length === 0) {
    return (
      <PageFade>
        <div className="flex flex-col gap-4 pb-8">
          <h1 className="text-lg font-semibold">Investimentos</h1>
          <EmptyState
            icon={TrendingUp}
            title="Nenhum investimento ainda"
            description="Cadastre um investimento em Configurações pra começar a acompanhar aqui."
          />
        </div>
      </PageFade>
    );
  }

  return (
    <PageFade>
      <div className="flex flex-col gap-6 pb-8">
        <h1 className="text-lg font-semibold">Investimentos</h1>

        <div className="rounded-card bg-surface p-5">
          <p className="text-sm text-ink-muted">Valor atual</p>
          <p className="mt-1 text-3xl font-semibold">
            <Money value={valorAtual} />
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
            <span>
              Investido: <MaskedCurrency value={totalInvestido} />
            </span>
            {rendimento !== 0 && (
              <span className={rendimento > 0 ? "text-accent-strong" : "text-negative"}>
                Rendimento: {rendimento > 0 ? "+" : ""}
                <MaskedCurrency value={rendimento} />
              </span>
            )}
          </div>
        </div>

        <MetasCarteira
          valorAtual={valorAtual}
          goals={goals}
          onAddGoal={addGoal}
          onRemoveGoal={removeGoal}
        />

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Composição da carteira</h2>
          <div className="rounded-card bg-surface p-4">
            <BreakdownChart
              data={composicaoData}
              emptyTitle="Nenhum investimento com valor ainda"
              emptyDescription="Assim que você aportar, a composição por tipo aparece aqui."
            />
          </div>
        </section>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none">
          {anos.map((year) => (
            <button
              key={year}
              onClick={() => setAno(year)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-transform active:scale-95 ${
                ano === year
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border bg-surface text-ink-muted hover:bg-bg"
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Aportes por mês em {ano}</h2>
          <div className="rounded-card bg-surface p-4">
            <SingleSeriesBarChart
              data={aportesDoAno}
              label="Aportado"
              icon={TrendingUp}
              emptyTitle="Nenhum aporte nesse ano"
              emptyDescription="Os aportes feitos em cada mês aparecem aqui."
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Evolução acumulada</h2>
          <div className="rounded-card bg-surface p-4">
            <AreaTrendChart
              data={acumulado}
              label="Total aportado"
              icon={TrendingUp}
              emptyTitle="Ainda não há histórico suficiente"
              emptyDescription="Assim que você tiver aportes em pelo menos dois meses, a evolução aparece aqui."
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-muted">Ficha por ativo — {ano}</h2>
          <ul className="flex flex-col gap-2">
            {investments.map((investimento) => (
              <AtivoFicha key={investimento.id} investimento={investimento} movements={movements} year={ano} />
            ))}
          </ul>
        </section>
      </div>
    </PageFade>
  );
}

function MetasCarteira({
  valorAtual,
  goals,
  onAddGoal,
  onRemoveGoal,
}: {
  valorAtual: number;
  goals: InvestmentGoal[];
  onAddGoal: (metaValor: number, nome?: string) => Promise<void>;
  onRemoveGoal: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      await onAddGoal(valor, nome.trim() || undefined);
      toast.success("Meta criada.");
      setNome("");
      setValor(0);
      setAdding(false);
    } catch {
      toast.error("Não foi possível criar a meta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await onRemoveGoal(id);
      toast.success("Meta removida.");
    } catch {
      toast.error("Não foi possível remover a meta.");
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-muted">Metas da carteira</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
          aria-label="Nova meta"
        >
          <Plus size={16} />
        </button>
      </div>

      {adding && (
        <div className="mb-2 flex flex-col gap-2 rounded-card bg-surface p-4">
          <input
            type="text"
            placeholder="Rótulo (opcional, ex: Reserva de emergência)"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className="rounded-2xl border border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <div className="flex gap-2">
            <CurrencyInput
              value={valor}
              onChange={setValor}
              className="min-w-0 flex-1 rounded-2xl border border-border px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={saving}
              className="shrink-0 rounded-2xl bg-accent px-4 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="rounded-card bg-surface p-4 text-xs text-ink-muted">
          Defina valores-alvo pra carteira toda — cada um vira um marco, marcado como concluído
          assim que você chegar lá.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {goals.map((goal) => {
            const atingida = valorAtual >= goal.metaValor;
            const percent = Math.min((valorAtual / goal.metaValor) * 100, 100);
            return (
              <li
                key={goal.id}
                className={`rounded-card p-4 ${
                  atingida ? "border border-accent bg-accent-soft" : "bg-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    {goal.nome && (
                      <span className="block truncate text-xs text-ink-muted">{goal.nome}</span>
                    )}
                    <span className="flex items-center gap-1.5">
                      {atingida && <Check size={14} className="shrink-0 text-accent-strong" />}
                      <span className={`text-sm font-medium ${atingida ? "text-accent-strong" : ""}`}>
                        <MaskedCurrency value={goal.metaValor} />
                      </span>
                    </span>
                  </span>
                  <button
                    onClick={() => handleRemove(goal.id)}
                    aria-label="Remover meta"
                    className="shrink-0 text-ink-muted transition-transform active:scale-90 hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {atingida ? (
                  <p className="mt-1.5 text-xs text-accent-strong">Concluída 🎉</p>
                ) : (
                  <>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{percent.toFixed(0)}%</p>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function AtivoFicha({
  investimento,
  movements,
  year,
}: {
  investimento: Investment;
  movements: InvestmentMovement[];
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const ledger = computeInvestmentYearLedger(investimento.id, movements, year);
  const mesesAtivos = ledger.filter((m) => m.valorAportado > 0);
  const cotasFinal = ledger[ledger.length - 1]?.cotasAcumuladas ?? 0;

  return (
    <li className="rounded-card bg-surface px-4 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 truncate font-medium">
            {investimento.nome}
            <span className="rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-normal text-ink-muted">
              {investmentTypeLabel(investimento)}
            </span>
          </span>
          {investimento.descricao && (
            <span className="block truncate text-xs font-normal text-ink-muted">
              {investimento.descricao}
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp size={16} className="shrink-0 text-ink-muted" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-ink-muted" />
        )}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-1.5">
          {mesesAtivos.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhum aporte em {year}.</p>
          ) : (
            mesesAtivos.map((mes) => (
              <div
                key={mes.monthKey}
                className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-xs"
              >
                <span>{formatMonthLabel(mes.monthKey)}</span>
                <span className="text-right">
                  <MaskedCurrency value={mes.valorAportado} className="font-medium" />
                  {investimento.tipo === "rendaVariavel" && mes.cotas > 0 && (
                    <span className="ml-1.5 text-ink-muted">
                      · {mes.cotas} cotas · méd. <MaskedCurrency value={mes.precoMedio ?? 0} />
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
          {investimento.tipo === "rendaVariavel" && cotasFinal > 0 && (
            <p className="mt-1 text-xs text-ink-muted">
              Total acumulado {year === currentYear() ? "até agora" : `até dez/${year}`}: {cotasFinal}{" "}
              cotas
            </p>
          )}
        </div>
      )}
    </li>
  );
}
