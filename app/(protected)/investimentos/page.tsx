"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronUp, Plus, Trash2, TrendingUp } from "lucide-react";
import { useInvestments } from "@/lib/use-investments";
import { useInvestmentMovements } from "@/lib/use-investment-movements";
import { useInvestmentGoals } from "@/lib/use-investment-goals";
import { useBanks } from "@/lib/use-banks";
import {
  computeCumulativeContributions,
  computeInvestmentComposition,
  computeInvestmentYearLedger,
  computeInvestmentYears,
  computeYearlyContributions,
  investmentTypeLabel,
} from "@/lib/derived";
import { currentYear, formatDate, formatMonthLabel, formatPercent, todayIsoDate } from "@/lib/format";
import type {
  Bank,
  Investment,
  InvestmentGoal,
  InvestmentMovement,
  InvestmentSubtipo,
  InvestmentType,
} from "@/lib/types";
import { Money, MaskedCurrency } from "@/app/_components/Money";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { EmptyState } from "@/app/_components/EmptyState";
import { PageFade } from "@/app/_components/PageFade";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import {
  INPUT_CLASS,
  INPUT_CLASS_COMPACT,
  SAVE_BUTTON_CLASS,
  RowActionButtons,
} from "@/app/_components/SettingsFormKit";
import { AreaTrendChart, BreakdownChart, SingleSeriesBarChart } from "../_components/Charts";

export default function InvestimentosPage() {
  const {
    investments,
    error,
    addInvestment,
    updateInvestment,
    removeInvestment,
    setInvestmentOculto,
    moveInvestment,
    registrarRendimento,
    deleteInvestmentMovement,
  } = useInvestments();
  const { movements } = useInvestmentMovements();
  const { goals, addGoal, removeGoal } = useInvestmentGoals();
  const { banks } = useBanks();

  const anos = computeInvestmentYears(movements);
  const [ano, setAno] = useState(anos[0]);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [moving, setMoving] = useState<Investment | null>(null);

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

  return (
    <PageFade>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Investimentos</h1>
          <button
            onClick={() => setAdding((v) => !v)}
            aria-label="Adicionar investimento"
            className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
          >
            <Plus size={20} />
          </button>
        </div>

        {adding && (
          <AddInvestmentForm onAdd={addInvestment} onDone={() => setAdding(false)} />
        )}

        {error && (
          <p className="rounded-2xl bg-negative-soft px-3 py-2 text-xs text-negative">
            Não deu pra carregar seus investimentos ({error}). Seus dados provavelmente continuam salvos
            — tente recarregar a página; se persistir, pode ser preciso reaplicar as regras de segurança
            do Firestore.
          </p>
        )}

        {investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Nenhum investimento ainda"
            description="Cadastre um investimento pra começar a acompanhar sua carteira aqui."
          />
        ) : (
          <>
            <div className="rounded-card bg-surface shadow-card p-5">
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

            <MetasCarteira valorAtual={valorAtual} goals={goals} onAddGoal={addGoal} onRemoveGoal={removeGoal} />

            <section>
              <h2 className="mb-3 text-sm font-medium text-ink-muted">Composição da carteira</h2>
              <div className="rounded-card bg-surface shadow-card p-4">
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
              <div className="rounded-card bg-surface shadow-card p-4">
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
              <div className="rounded-card bg-surface shadow-card p-4">
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
              <h2 className="mb-3 text-sm font-medium text-ink-muted">Seus ativos — {ano}</h2>
              <ul className="flex flex-col gap-2">
                {investments.map((investimento) => (
                  <AtivoFicha
                    key={investimento.id}
                    investimento={investimento}
                    movements={movements}
                    year={ano}
                    onToggleOculto={() => setInvestmentOculto(investimento.id, !investimento.oculto)}
                    onEdit={() => setEditing(investimento)}
                    onRemove={() => setRemoving({ id: investimento.id, nome: investimento.nome })}
                    onMove={() => setMoving(investimento)}
                  />
                ))}
              </ul>
              {investments.some((inv) => inv.oculto) && (
                <p className="mt-2 text-[11px] text-ink-muted">
                  Ocultar (ícone de olho) só tira o investimento do facilitador na tela inicial — ele
                  continua contando no patrimônio.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remover investimento?"
        description={`"${removing?.nome}" será removido, junto com o histórico de aportes.`}
        confirmLabel="Remover"
        danger
        onConfirm={async () => {
          if (!removing) return;
          await removeInvestment(removing.id);
          toast.success("Investimento removido.");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <EditInvestmentSheet investment={editing} onSave={updateInvestment} onClose={() => setEditing(null)} />

      <MoveInvestmentSheet
        investment={moving}
        movements={movements}
        banks={banks}
        onMove={moveInvestment}
        onRegistrarRendimento={registrarRendimento}
        onDeleteMovement={deleteInvestmentMovement}
        onClose={() => setMoving(null)}
      />
    </PageFade>
  );
}

function AddInvestmentForm({
  onAdd,
  onDone,
}: {
  onAdd: (nome: string, tipo: InvestmentType, descricao?: string, subtipo?: InvestmentSubtipo) => Promise<void>;
  onDone: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<InvestmentType>("rendaFixa");
  const [subtipo, setSubtipo] = useState<InvestmentSubtipo | "">("");

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para o investimento.");
      return;
    }
    await onAdd(nome.trim(), tipo, descricao.trim() || undefined, subtipo || undefined);
    toast.success("Investimento criado.");
    setNome("");
    setDescricao("");
    setTipo("rendaFixa");
    setSubtipo("");
    onDone();
  }

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-card bg-surface shadow-card p-4">
      <input
        type="text"
        placeholder="Nome (ex: Tesouro Selic, PETR4)"
        value={nome}
        onChange={(event) => setNome(event.target.value)}
        className={INPUT_CLASS_COMPACT}
      />
      <input
        type="text"
        placeholder="Descrição (opcional)"
        value={descricao}
        onChange={(event) => setDescricao(event.target.value)}
        className={INPUT_CLASS_COMPACT}
      />
      <select
        value={tipo}
        onChange={(event) => {
          setTipo(event.target.value as InvestmentType);
          setSubtipo("");
        }}
        className={INPUT_CLASS_COMPACT}
      >
        <option value="rendaFixa">Renda fixa</option>
        <option value="rendaVariavel">Renda variável</option>
      </select>
      {tipo === "rendaVariavel" && (
        <select
          value={subtipo}
          onChange={(event) => setSubtipo(event.target.value as InvestmentSubtipo | "")}
          className={INPUT_CLASS_COMPACT}
        >
          <option value="">Não classificado</option>
          <option value="acao">Ação</option>
          <option value="fii">FII</option>
        </select>
      )}
      <button type="submit" className={SAVE_BUTTON_CLASS}>
        Criar investimento
      </button>
    </form>
  );
}

function EditInvestmentSheet({
  investment,
  onSave,
  onClose,
}: {
  investment: Investment | null;
  onSave: (
    id: string,
    input: { nome: string; tipo: InvestmentType; descricao?: string; subtipo?: InvestmentSubtipo },
  ) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={investment !== null} onClose={onClose}>
      {investment && (
        <EditInvestmentFields key={investment.id} investment={investment} onSave={onSave} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function EditInvestmentFields({
  investment,
  onSave,
  onClose,
}: {
  investment: Investment;
  onSave: (
    id: string,
    input: { nome: string; tipo: InvestmentType; descricao?: string; subtipo?: InvestmentSubtipo },
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(investment.nome);
  const [descricao, setDescricao] = useState(investment.descricao ?? "");
  const [tipo, setTipo] = useState<InvestmentType>(investment.tipo);
  const [subtipo, setSubtipo] = useState<InvestmentSubtipo | "">(investment.subtipo ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("Dê um nome para o investimento.");
      return;
    }
    setSaving(true);
    try {
      await onSave(investment.id, {
        nome: nome.trim(),
        tipo,
        descricao: descricao.trim() || undefined,
        subtipo: subtipo || undefined,
      });
      toast.success("Investimento atualizado.");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar o investimento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-4 font-medium">Editar investimento</p>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className={INPUT_CLASS}
        />
        <input
          type="text"
          placeholder="Descrição (opcional)"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          className={INPUT_CLASS}
        />
        <select
          value={tipo}
          onChange={(event) => {
            setTipo(event.target.value as InvestmentType);
            setSubtipo("");
          }}
          className={INPUT_CLASS}
        >
          <option value="rendaFixa">Renda fixa</option>
          <option value="rendaVariavel">Renda variável</option>
        </select>
        {tipo === "rendaVariavel" && (
          <select
            value={subtipo}
            onChange={(event) => setSubtipo(event.target.value as InvestmentSubtipo | "")}
            className={INPUT_CLASS}
          >
            <option value="">Não classificado</option>
            <option value="acao">Ação</option>
            <option value="fii">FII</option>
          </select>
        )}
        <button onClick={handleSave} disabled={saving} className={SAVE_BUTTON_CLASS}>
          Salvar
        </button>
      </div>
    </>
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
        <div className="mb-2 flex flex-col gap-2 rounded-card bg-surface shadow-card p-4">
          <input
            type="text"
            placeholder="Rótulo (opcional, ex: Reserva de emergência)"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className={INPUT_CLASS_COMPACT}
          />
          <div className="flex gap-2">
            <CurrencyInput
              value={valor}
              onChange={setValor}
              className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
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
        <p className="rounded-card bg-surface shadow-card p-4 text-xs text-ink-muted">
          Defina valores-alvo pra carteira toda — cada um vira um marco, marcado como concluído assim
          que você chegar lá.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {goals.map((goal) => {
            const atingida = valorAtual >= goal.metaValor;
            const percent = Math.min((valorAtual / goal.metaValor) * 100, 100);
            return (
              <li
                key={goal.id}
                className={`rounded-card p-4 ${atingida ? "border border-accent bg-accent-soft" : "bg-surface"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    {goal.nome && <span className="block truncate text-xs text-ink-muted">{goal.nome}</span>}
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
                    <p className="mt-1 text-xs text-ink-muted">{formatPercent(percent)}</p>
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
  onToggleOculto,
  onEdit,
  onRemove,
  onMove,
}: {
  investimento: Investment;
  movements: InvestmentMovement[];
  year: number;
  onToggleOculto: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onMove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ledger = computeInvestmentYearLedger(investimento.id, movements, year);
  const mesesAtivos = ledger.filter((m) => m.valorAportado > 0);
  const cotasFinal = ledger[ledger.length - 1]?.cotasAcumuladas ?? 0;
  const valorAtual = investimento.saldoAtual ?? investimento.valorInvestido;
  const rendimento = valorAtual - investimento.valorInvestido;

  return (
    <li className={`rounded-card bg-surface shadow-card px-4 py-3 ${investimento.oculto ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 truncate text-sm font-medium">
            {investimento.nome}
            <span className="rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-normal text-ink-muted">
              {investmentTypeLabel(investimento)}
            </span>
            {investimento.oculto && <span className="text-xs font-normal text-ink-muted">(oculto)</span>}
          </span>
          {investimento.descricao && (
            <span className="block truncate text-xs text-ink-muted">{investimento.descricao}</span>
          )}
        </span>
        <RowActionButtons
          hiddenState={{
            hidden: investimento.oculto ?? false,
            onToggle: onToggleOculto,
            showLabel: "Mostrar investimento",
            hideLabel: "Ocultar investimento",
          }}
          onEdit={onEdit}
          onRemove={onRemove}
          editLabel="Editar investimento"
          removeLabel="Remover investimento"
        />
      </div>

      <button onClick={onMove} className="mt-1 block w-full text-left transition-transform active:scale-[0.98]">
        <p className="text-lg font-semibold text-accent-strong">
          <MaskedCurrency value={valorAtual} />
        </p>
        {rendimento !== 0 && (
          <p className={`text-[11px] ${rendimento > 0 ? "text-accent-strong" : "text-negative"}`}>
            {rendimento > 0 ? "rendeu +" : "rendeu "}
            <MaskedCurrency value={rendimento} />
          </p>
        )}
        <span className="mt-1 block text-[11px] text-accent-strong">
          toque pra aportar, resgatar ou registrar rendimento
        </span>
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex w-full items-center justify-between gap-2 text-left text-xs text-ink-muted"
      >
        Ficha em {year}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {mesesAtivos.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhum aporte em {year}.</p>
          ) : (
            mesesAtivos.map((mes) => (
              <div key={mes.monthKey} className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-xs">
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
              Total acumulado {year === currentYear() ? "até agora" : `até dez/${year}`}: {cotasFinal} cotas
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function MoveInvestmentSheet({
  investment,
  movements,
  banks,
  onMove,
  onRegistrarRendimento,
  onDeleteMovement,
  onClose,
}: {
  investment: Investment | null;
  movements: InvestmentMovement[];
  banks: Bank[];
  onMove: (
    id: string,
    tipo: "aporte" | "resgate",
    valor: number,
    cotas?: number,
    bancoId?: string,
    data?: string,
  ) => Promise<void>;
  onRegistrarRendimento: (investimentoId: string, novoSaldoAtual: number) => Promise<void>;
  onDeleteMovement: (movement: InvestmentMovement) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={investment !== null} onClose={onClose}>
      {investment && (
        <MoveInvestmentFields
          key={investment.id}
          investment={investment}
          movements={movements.filter((m) => m.investimentoId === investment.id)}
          banks={banks}
          onMove={onMove}
          onRegistrarRendimento={onRegistrarRendimento}
          onDeleteMovement={onDeleteMovement}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function MoveInvestmentFields({
  investment,
  movements,
  banks,
  onMove,
  onRegistrarRendimento,
  onDeleteMovement,
  onClose,
}: {
  investment: Investment;
  movements: InvestmentMovement[];
  banks: Bank[];
  onMove: (
    id: string,
    tipo: "aporte" | "resgate",
    valor: number,
    cotas?: number,
    bancoId?: string,
    data?: string,
  ) => Promise<void>;
  onRegistrarRendimento: (investimentoId: string, novoSaldoAtual: number) => Promise<void>;
  onDeleteMovement: (movement: InvestmentMovement) => Promise<void>;
  onClose: () => void;
}) {
  const isVariavel = investment.tipo === "rendaVariavel";
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  const valorAtual = investment.saldoAtual ?? investment.valorInvestido;
  const rendimento = valorAtual - investment.valorInvestido;
  const [modo, setModo] = useState<"aporte" | "resgate" | "rendimento">("aporte");
  const [valor, setValor] = useState(0);
  const [cotas, setCotas] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [data, setData] = useState(todayIsoDate());
  const [saldoInformado, setSaldoInformado] = useState(valorAtual);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<InvestmentMovement | null>(null);

  async function handleSave() {
    if (modo === "rendimento") {
      if (saldoInformado < 0) {
        toast.error("Informe um valor válido.");
        return;
      }
      setSaving(true);
      try {
        await onRegistrarRendimento(investment.id, saldoInformado);
        toast.success("Rendimento atualizado.");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (modo === "resgate" && valor > valorAtual) {
      toast.error("Valor maior que o saldo atual do investimento.");
      return;
    }

    setSaving(true);
    try {
      const cotasNum = isVariavel && cotas ? Number(cotas) : undefined;
      await onMove(investment.id, modo, valor, cotasNum, bancoId || undefined, data);
      toast.success(modo === "aporte" ? "Aporte registrado." : "Resgate registrado.");
      setValor(0);
      setCotas("");
      setModo("aporte");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMovement() {
    if (!removing) return;
    try {
      await onDeleteMovement(removing);
      toast.success("Movimento excluído.");
    } catch {
      toast.error("Não foi possível excluir o movimento.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <p className="font-medium">{investment.nome}</p>
      {investment.descricao && <p className="text-xs text-ink-muted">{investment.descricao}</p>}
      <p className="mb-4 text-xs text-ink-muted">
        Total investido: <MaskedCurrency value={investment.valorInvestido} />
        {isVariavel && investment.totalCotas ? ` · ${investment.totalCotas} cotas` : ""}
        {rendimento !== 0 && (
          <>
            {" · "}
            <span className={rendimento > 0 ? "text-accent-strong" : "text-negative"}>
              rendeu {rendimento > 0 ? "+" : ""}
              <MaskedCurrency value={rendimento} />
            </span>
          </>
        )}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setModo("aporte")}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "aporte" ? "border-accent bg-accent-soft text-accent-strong" : "border-border text-ink-muted"
          }`}
        >
          Aportar
        </button>
        <button
          type="button"
          onClick={() => setModo("resgate")}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "resgate" ? "border-negative bg-negative-soft text-negative" : "border-border text-ink-muted"
          }`}
        >
          Resgatar
        </button>
        <button
          type="button"
          onClick={() => {
            setModo("rendimento");
            setSaldoInformado(valorAtual);
          }}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "rendimento" ? "border-accent bg-accent-soft text-accent-strong" : "border-border text-ink-muted"
          }`}
        >
          Rendimento
        </button>
      </div>

      {modo === "rendimento" ? (
        <>
          <p className="mt-3 text-xs text-ink-muted">
            Informe o valor atual real desse investimento (cotação/saldo do banco). A diferença vira
            rendimento, sem contar como novo aporte.
          </p>
          <CurrencyInput
            value={saldoInformado}
            onChange={setSaldoInformado}
            className={`mt-2 w-full ${INPUT_CLASS}`}
          />
        </>
      ) : (
        <>
          <CurrencyInput
            value={valor}
            onChange={setValor}
            placeholder={isVariavel ? "Valor total pago pelas cotas" : "Valor"}
            className={`mt-3 w-full ${INPUT_CLASS}`}
          />

          {isVariavel && (
            <input
              type="number"
              min="0"
              step="0.000001"
              placeholder="Quantidade de cotas/ações"
              value={cotas}
              onChange={(event) => setCotas(event.target.value)}
              className={`mt-2 w-full ${INPUT_CLASS}`}
            />
          )}

          {banks.length > 0 && (
            <select
              value={bancoId}
              onChange={(event) => setBancoId(event.target.value)}
              className={`mt-2 w-full ${INPUT_CLASS}`}
            >
              <option value="">Sem banco vinculado</option>
              {banks.map((banco) => (
                <option key={banco.id} value={banco.id}>
                  {modo === "aporte" ? `Sai de: ${banco.nome}` : `Vai para: ${banco.nome}`}
                </option>
              ))}
            </select>
          )}

          <input
            type="date"
            value={data}
            onChange={(event) => setData(event.target.value)}
            className={`mt-2 w-full ${INPUT_CLASS}`}
          />
        </>
      )}

      <button onClick={handleSave} disabled={saving} className={`mt-3 w-full ${SAVE_BUTTON_CLASS}`}>
        Confirmar
      </button>

      {movements.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-ink-muted">Histórico</p>
          <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {movements.map((movimento) => {
              const isNegative =
                movimento.tipo === "resgate" || (movimento.tipo === "rendimento" && movimento.valor < 0);
              const label =
                movimento.tipo === "aporte" ? "Aporte" : movimento.tipo === "resgate" ? "Resgate" : "Rendimento";
              return (
                <li key={movimento.id} className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-xs">
                  <span>
                    {formatDate(movimento.data)} · {label}
                    {movimento.cotas ? ` · ${movimento.cotas} cotas` : ""}
                    {movimento.bancoId && bankNameById.get(movimento.bancoId)
                      ? ` · ${bankNameById.get(movimento.bancoId)}`
                      : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={isNegative ? "text-negative" : "text-accent-strong"}>
                      {movimento.tipo === "rendimento" && movimento.valor >= 0 ? "+" : ""}
                      <MaskedCurrency value={movimento.valor} />
                    </span>
                    <button
                      onClick={() => setRemoving(movimento)}
                      aria-label="Excluir movimento"
                      className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Excluir movimento?"
        description="Desfaz exatamente o que esse movimento alterou no investimento (e no banco vinculado, se houver)."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDeleteMovement}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
