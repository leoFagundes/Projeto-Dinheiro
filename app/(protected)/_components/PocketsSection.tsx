"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { formatCurrency, formatDate, todayIsoDate } from "@/lib/format";
import { computePocketRendimento } from "@/lib/derived";
import type { Bank, Pocket, PocketMovement } from "@/lib/types";

export function PocketsSection({
  pockets,
  banks,
  movements,
  onAdjust,
  onMoveFunds,
  onRegistrarRendimento,
  onDeleteMovement,
}: {
  pockets: Pocket[];
  banks: Bank[];
  movements: PocketMovement[];
  onAdjust: (id: string, delta: number) => Promise<void>;
  onMoveFunds: (
    pocketId: string,
    bancoId: string,
    tipo: "deposito" | "retirada",
    valor: number,
    data?: string,
  ) => Promise<void>;
  onRegistrarRendimento: (pocketId: string, novoSaldo: number) => Promise<void>;
  onDeleteMovement: (movement: PocketMovement) => Promise<void>;
}) {
  const [adjusting, setAdjusting] = useState<Pocket | null>(null);

  if (pockets.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title="Nenhuma caixinha ainda"
        description="Crie caixinhas em Configurações para separar dinheiro guardado."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3">
        {pockets.map((pocket) => {
          const percent = pocket.metaValor
            ? Math.min((pocket.saldo / pocket.metaValor) * 100, 100)
            : null;
          const rendimento = computePocketRendimento(pocket, movements);
          return (
            <li key={pocket.id}>
              <button
                onClick={() => setAdjusting(pocket)}
                aria-label={`Adicionar ou retirar de ${pocket.nome}`}
                className="relative w-full rounded-card bg-surface p-4 text-left transition-transform active:scale-[0.98]"
              >
                <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  <Plus size={14} />
                </span>
                <p className="flex items-center gap-1.5 pr-6 text-sm text-ink-muted">
                  <PiggyBank size={14} />
                  {pocket.nome}
                </p>
                <p className="mt-1 text-lg font-semibold text-accent-strong">
                  {formatCurrency(pocket.saldo)}
                </p>
                {rendimento !== 0 && (
                  <p className={`text-[11px] ${rendimento > 0 ? "text-accent-strong" : "text-negative"}`}>
                    {rendimento > 0 ? "rendeu +" : "rendeu "}
                    {formatCurrency(rendimento)}
                  </p>
                )}
                {percent !== null && (
                  <>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      meta: {formatCurrency(pocket.metaValor!)}
                    </p>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Link
        href="/configuracoes#caixinhas"
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        Gerenciar caixinhas
      </Link>

      <AdjustPocketSheet
        pocket={adjusting}
        banks={banks}
        movements={movements}
        onAdjust={onAdjust}
        onMoveFunds={onMoveFunds}
        onRegistrarRendimento={onRegistrarRendimento}
        onDeleteMovement={onDeleteMovement}
        onClose={() => setAdjusting(null)}
      />
    </div>
  );
}

function AdjustPocketSheet({
  pocket,
  banks,
  movements,
  onAdjust,
  onMoveFunds,
  onRegistrarRendimento,
  onDeleteMovement,
  onClose,
}: {
  pocket: Pocket | null;
  banks: Bank[];
  movements: PocketMovement[];
  onAdjust: (id: string, delta: number) => Promise<void>;
  onMoveFunds: (
    pocketId: string,
    bancoId: string,
    tipo: "deposito" | "retirada",
    valor: number,
    data?: string,
  ) => Promise<void>;
  onRegistrarRendimento: (pocketId: string, novoSaldo: number) => Promise<void>;
  onDeleteMovement: (movement: PocketMovement) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={pocket !== null} onClose={onClose}>
      {pocket && (
        <AdjustPocketFields
          key={pocket.id}
          pocket={pocket}
          banks={banks}
          movements={movements.filter((m) => m.pocketId === pocket.id)}
          onAdjust={onAdjust}
          onMoveFunds={onMoveFunds}
          onRegistrarRendimento={onRegistrarRendimento}
          onDeleteMovement={onDeleteMovement}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function AdjustPocketFields({
  pocket,
  banks,
  movements,
  onAdjust,
  onMoveFunds,
  onRegistrarRendimento,
  onDeleteMovement,
  onClose,
}: {
  pocket: Pocket;
  banks: Bank[];
  movements: PocketMovement[];
  onAdjust: (id: string, delta: number) => Promise<void>;
  onMoveFunds: (
    pocketId: string,
    bancoId: string,
    tipo: "deposito" | "retirada",
    valor: number,
    data?: string,
  ) => Promise<void>;
  onRegistrarRendimento: (pocketId: string, novoSaldo: number) => Promise<void>;
  onDeleteMovement: (movement: PocketMovement) => Promise<void>;
  onClose: () => void;
}) {
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  const rendimento = computePocketRendimento(pocket, movements);
  const [modo, setModo] = useState<"adicionar" | "retirar" | "rendimento">("adicionar");
  const [bancoId, setBancoId] = useState("");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(todayIsoDate());
  const [saldoInformado, setSaldoInformado] = useState(pocket.saldo);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<PocketMovement | null>(null);

  async function handleSave() {
    if (modo === "rendimento") {
      if (saldoInformado < 0) {
        toast.error("Informe um valor válido.");
        return;
      }
      setSaving(true);
      try {
        await onRegistrarRendimento(pocket.id, saldoInformado);
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
    if (modo === "retirar" && valor > pocket.saldo) {
      toast.error("Saldo insuficiente nessa caixinha.");
      return;
    }

    setSaving(true);
    try {
      if (bancoId) {
        await onMoveFunds(
          pocket.id,
          bancoId,
          modo === "adicionar" ? "deposito" : "retirada",
          valor,
          data,
        );
      } else {
        await onAdjust(pocket.id, modo === "adicionar" ? valor : -valor);
      }
      toast.success(modo === "adicionar" ? "Valor adicionado." : "Valor retirado.");
      setValor(0);
      setModo("adicionar");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a caixinha.");
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
      <p className="font-medium">{pocket.nome}</p>
      {rendimento !== 0 && (
        <p className={`mb-3 text-xs ${rendimento > 0 ? "text-accent-strong" : "text-negative"}`}>
          Total aportado: {formatCurrency(pocket.saldo - rendimento)} · Rendeu:{" "}
          {rendimento > 0 ? "+" : ""}
          {formatCurrency(rendimento)}
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setModo("adicionar")}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "adicionar"
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-border text-ink-muted"
          }`}
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => setModo("retirar")}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "retirar"
              ? "border-negative bg-negative-soft text-negative"
              : "border-border text-ink-muted"
          }`}
        >
          Retirar
        </button>
        <button
          type="button"
          onClick={() => {
            setModo("rendimento");
            setSaldoInformado(pocket.saldo);
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
            Informe o saldo atual real dessa caixinha (depois de render). A diferença vira
            rendimento, sem contar como novo depósito.
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
            className="mt-3 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
          />

          {banks.length > 0 && (
            <select
              value={bancoId}
              onChange={(event) => setBancoId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
            >
              <option value="">Sem banco vinculado</option>
              {banks.map((banco) => (
                <option key={banco.id} value={banco.id}>
                  {modo === "adicionar" ? `Sai de: ${banco.nome}` : `Vai para: ${banco.nome}`}
                </option>
              ))}
            </select>
          )}

          {bancoId && (
            <input
              type="date"
              value={data}
              onChange={(event) => setData(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
            />
          )}
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
                movimento.tipo === "retirada" ||
                (movimento.tipo === "rendimento" && movimento.valor < 0);
              const label =
                movimento.tipo === "deposito"
                  ? "Adicionado"
                  : movimento.tipo === "retirada"
                    ? "Retirado"
                    : "Rendimento";
              return (
                <li
                  key={movimento.id}
                  className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-xs"
                >
                  <span>
                    {formatDate(movimento.data)} · {label}
                    {movimento.bancoId && bankNameById.get(movimento.bancoId)
                      ? ` · ${bankNameById.get(movimento.bancoId)}`
                      : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={isNegative ? "text-negative" : "text-accent-strong"}>
                      {movimento.tipo === "rendimento" && movimento.valor >= 0 ? "+" : ""}
                      {formatCurrency(movimento.valor)}
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
        description="Desfaz exatamente o que esse movimento alterou no saldo da caixinha."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDeleteMovement}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
