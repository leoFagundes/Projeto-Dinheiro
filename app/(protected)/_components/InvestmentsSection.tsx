"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { MaskedCurrency } from "@/app/_components/Money";
import { formatDate, todayIsoDate } from "@/lib/format";
import { investmentTypeLabel } from "@/lib/derived";
import type { Bank, Investment, InvestmentMovement } from "@/lib/types";

export function InvestmentsSection({
  investments,
  movements,
  banks,
  onMove,
  onRegistrarRendimento,
  onDeleteMovement,
}: {
  investments: Investment[];
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
}) {
  const [selected, setSelected] = useState<Investment | null>(null);

  if (investments.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Nenhum investimento ainda"
        description="Cadastre em Configurações pra controlar quanto você aportou em renda fixa ou variável."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3">
        {investments.map((investimento) => {
          const valorAtual = investimento.saldoAtual ?? investimento.valorInvestido;
          const rendimento = valorAtual - investimento.valorInvestido;
          return (
            <li key={investimento.id}>
              <button
                onClick={() => setSelected(investimento)}
                aria-label={`Aportar ou resgatar de ${investimento.nome}`}
                className="relative w-full rounded-card bg-surface shadow-card p-4 text-left transition-transform active:scale-[0.98]"
              >
                <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  <Plus size={14} />
                </span>
                <p className="flex items-center gap-1.5 pr-6 text-sm text-ink-muted">
                  <TrendingUp size={14} />
                  {investimento.nome}
                </p>
                <p className="mt-1 text-lg font-semibold text-accent-strong">
                  <MaskedCurrency value={valorAtual} />
                </p>
                {rendimento !== 0 && (
                  <p className={`text-[11px] ${rendimento > 0 ? "text-accent-strong" : "text-negative"}`}>
                    {rendimento > 0 ? "rendeu +" : "rendeu "}
                    <MaskedCurrency value={rendimento} />
                  </p>
                )}
                <p className="mt-1 text-[11px] text-ink-muted">
                  {investmentTypeLabel(investimento)}
                  {investimento.tipo === "rendaVariavel" && investimento.totalCotas
                    ? ` · ${investimento.totalCotas} cotas`
                    : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      <Link
        href="/configuracoes#investimentos"
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        Gerenciar investimentos
      </Link>

      <MoveInvestmentSheet
        investment={selected}
        movements={movements}
        banks={banks}
        onMove={onMove}
        onRegistrarRendimento={onRegistrarRendimento}
        onDeleteMovement={onDeleteMovement}
        onClose={() => setSelected(null)}
      />
    </div>
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
      {investment.descricao && (
        <p className="text-xs text-ink-muted">{investment.descricao}</p>
      )}
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
            modo === "aporte"
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-border text-ink-muted"
          }`}
        >
          Aportar
        </button>
        <button
          type="button"
          onClick={() => setModo("resgate")}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "resgate"
              ? "border-negative bg-negative-soft text-negative"
              : "border-border text-ink-muted"
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
            modo === "rendimento"
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-border text-ink-muted"
          }`}
        >
          Rendimento
        </button>
      </div>

      {modo === "rendimento" ? (
        <>
          <p className="mt-3 text-xs text-ink-muted">
            Informe o valor atual real desse investimento (cotação/saldo do banco). A diferença
            vira rendimento, sem contar como novo aporte.
          </p>
          <CurrencyInput
            value={saldoInformado}
            onChange={setSaldoInformado}
            className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </>
      ) : (
        <>
          <CurrencyInput
            value={valor}
            onChange={setValor}
            placeholder={isVariavel ? "Valor total pago pelas cotas" : "Valor"}
            className="mt-3 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
          />

          {isVariavel && (
            <input
              type="number"
              min="0"
              step="0.000001"
              placeholder="Quantidade de cotas/ações"
              value={cotas}
              onChange={(event) => setCotas(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
            />
          )}

          {banks.length > 0 && (
            <select
              value={bancoId}
              onChange={(event) => setBancoId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
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
            className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
          />
        </>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
      >
        Confirmar
      </button>

      {movements.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-ink-muted">Histórico</p>
          <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {movements.map((movimento) => {
              const isNegative =
                movimento.tipo === "resgate" ||
                (movimento.tipo === "rendimento" && movimento.valor < 0);
              const label =
                movimento.tipo === "aporte"
                  ? "Aporte"
                  : movimento.tipo === "resgate"
                    ? "Resgate"
                    : "Rendimento";
              return (
                <li
                  key={movimento.id}
                  className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-xs"
                >
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
