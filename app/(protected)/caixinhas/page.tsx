"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { usePockets } from "@/lib/use-pockets";
import { usePocketMovements } from "@/lib/use-pocket-movements";
import { useBanks } from "@/lib/use-banks";
import { computePocketRendimento } from "@/lib/derived";
import { formatDate, todayIsoDate } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { MaskedCurrency } from "@/app/_components/Money";
import { INPUT_CLASS, INPUT_CLASS_COMPACT, SAVE_BUTTON_CLASS, RowActionButtons } from "@/app/_components/SettingsFormKit";
import type { Bank, Pocket, PocketMovement } from "@/lib/types";

export default function CaixinhasPage() {
  const {
    pockets,
    addPocket,
    updatePocket,
    removePocket,
    setPocketOculto,
    adjustSaldo,
    moveFunds,
    registrarRendimento,
    deletePocketMovement,
    transferBetweenPockets,
  } = usePockets();
  const { movements } = usePocketMovements();
  const { banks } = useBanks();

  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [metaValor, setMetaValor] = useState(0);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Pocket | null>(null);
  const [adjusting, setAdjusting] = useState<Pocket | null>(null);
  const [transferring, setTransferring] = useState(false);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para a caixinha.");
      return;
    }
    await addPocket(nome.trim(), saldoInicial, metaValor || undefined);
    toast.success("Caixinha criada.");
    setNome("");
    setSaldoInicial(0);
    setMetaValor(0);
    setAdding(false);
  }

  return (
    <PageFade>
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <PiggyBank size={20} className="text-accent-strong" />
            Caixinhas
          </h1>
          <button
            onClick={() => setAdding((v) => !v)}
            aria-label="Adicionar caixinha"
            className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
          >
            <Plus size={20} />
          </button>
        </div>

        {pockets.length > 0 && (
          <div className="rounded-card bg-surface shadow-card p-4">
            <p className="text-xs text-ink-muted">Total guardado</p>
            <p className="mt-1 text-lg font-semibold text-accent-strong">
              <MaskedCurrency value={pockets.reduce((sum, p) => sum + p.saldo, 0)} />
            </p>
          </div>
        )}

        {adding && (
          <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-card bg-surface shadow-card p-4">
            <input
              type="text"
              placeholder="Nome (ex: Reserva, Viagem)"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className={INPUT_CLASS_COMPACT}
            />
            <div className="flex gap-2">
              <CurrencyInput
                value={saldoInicial}
                onChange={setSaldoInicial}
                placeholder="Saldo inicial"
                className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
              />
              <CurrencyInput
                value={metaValor}
                onChange={setMetaValor}
                placeholder="Meta (opcional)"
                className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
              />
            </div>
            <button type="submit" className={SAVE_BUTTON_CLASS}>
              Criar caixinha
            </button>
          </form>
        )}

        {pockets.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Nenhuma caixinha ainda"
            description="Crie uma caixinha pra separar dinheiro guardado por objetivo."
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {pockets.map((pocket) => {
                const percent = pocket.metaValor
                  ? Math.min((pocket.saldo / pocket.metaValor) * 100, 100)
                  : null;
                const rendimento = computePocketRendimento(pocket, movements);
                return (
                  <li
                    key={pocket.id}
                    className={`rounded-card bg-surface shadow-card p-4 ${pocket.oculto ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {pocket.nome}
                        {pocket.oculto && <span className="ml-1.5 text-xs text-ink-muted">(oculta)</span>}
                      </span>
                      <RowActionButtons
                        hiddenState={{
                          hidden: pocket.oculto ?? false,
                          onToggle: () => setPocketOculto(pocket.id, !pocket.oculto),
                          showLabel: "Mostrar caixinha",
                          hideLabel: "Ocultar caixinha",
                        }}
                        onEdit={() => setEditing(pocket)}
                        onRemove={() => setRemoving({ id: pocket.id, nome: pocket.nome })}
                        editLabel="Editar caixinha"
                        removeLabel="Remover caixinha"
                      />
                    </div>

                    <button
                      onClick={() => setAdjusting(pocket)}
                      className="mt-1 block w-full text-left transition-transform active:scale-[0.98]"
                    >
                      <p className="text-lg font-semibold text-accent-strong">
                        <MaskedCurrency value={pocket.saldo} />
                      </p>
                      {rendimento !== 0 && (
                        <p className={`text-[11px] ${rendimento > 0 ? "text-accent-strong" : "text-negative"}`}>
                          {rendimento > 0 ? "rendeu +" : "rendeu "}
                          <MaskedCurrency value={rendimento} />
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
                            meta: <MaskedCurrency value={pocket.metaValor!} />
                          </p>
                        </>
                      )}
                      <span className="mt-1 block text-[11px] text-accent-strong">
                        toque pra adicionar, retirar ou registrar rendimento
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {pockets.length > 1 && (
              <button
                onClick={() => setTransferring(true)}
                className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
              >
                Transferir entre caixinhas
              </button>
            )}

            {pockets.some((p) => p.oculto) && (
              <p className="text-[11px] text-ink-muted">
                Ocultar (ícone de olho) só tira a caixinha do facilitador na tela inicial — ela continua
                contando no patrimônio e disponível pra escolher em depósitos/retiradas.
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remover caixinha?"
        description={`"${removing?.nome}" será removida, junto com o valor guardado nela.`}
        confirmLabel="Remover"
        danger
        onConfirm={async () => {
          if (!removing) return;
          await removePocket(removing.id);
          toast.success("Caixinha removida.");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <EditPocketSheet pocket={editing} onSave={updatePocket} onClose={() => setEditing(null)} />

      <AdjustPocketSheet
        pocket={adjusting}
        banks={banks}
        movements={movements}
        onAdjust={adjustSaldo}
        onMoveFunds={moveFunds}
        onRegistrarRendimento={registrarRendimento}
        onDeleteMovement={deletePocketMovement}
        onClose={() => setAdjusting(null)}
      />

      <TransferSheet
        open={transferring}
        pockets={pockets}
        onTransfer={transferBetweenPockets}
        onClose={() => setTransferring(false)}
      />
    </PageFade>
  );
}

function EditPocketSheet({
  pocket,
  onSave,
  onClose,
}: {
  pocket: Pocket | null;
  onSave: (id: string, input: { nome: string; saldo: number; metaValor?: number }) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={pocket !== null} onClose={onClose}>
      {pocket && <EditPocketFields key={pocket.id} pocket={pocket} onSave={onSave} onClose={onClose} />}
    </BottomSheet>
  );
}

function EditPocketFields({
  pocket,
  onSave,
  onClose,
}: {
  pocket: Pocket;
  onSave: (id: string, input: { nome: string; saldo: number; metaValor?: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(pocket.nome);
  const [saldo, setSaldo] = useState(pocket.saldo);
  const [metaValor, setMetaValor] = useState(pocket.metaValor ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("Dê um nome para a caixinha.");
      return;
    }
    setSaving(true);
    try {
      await onSave(pocket.id, { nome: nome.trim(), saldo, metaValor: metaValor || undefined });
      toast.success("Caixinha atualizada.");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar a caixinha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-4 font-medium">Editar caixinha</p>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className={INPUT_CLASS}
        />
        <CurrencyInput value={saldo} onChange={setSaldo} placeholder="Saldo atual" className={INPUT_CLASS} />
        <CurrencyInput
          value={metaValor}
          onChange={setMetaValor}
          placeholder="Meta (opcional)"
          className={INPUT_CLASS}
        />
        <button onClick={handleSave} disabled={saving} className={SAVE_BUTTON_CLASS}>
          Salvar
        </button>
      </div>
    </>
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
        await onMoveFunds(pocket.id, bancoId, modo === "adicionar" ? "deposito" : "retirada", valor, data);
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
          Total aportado: <MaskedCurrency value={pocket.saldo - rendimento} /> · Rendeu:{" "}
          {rendimento > 0 ? "+" : ""}
          <MaskedCurrency value={rendimento} />
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setModo("adicionar")}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "adicionar" ? "border-accent bg-accent-soft text-accent-strong" : "border-border text-ink-muted"
          }`}
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => setModo("retirar")}
          className={`rounded-2xl border px-3 py-2.5 text-xs font-medium transition-colors ${
            modo === "retirar" ? "border-negative bg-negative-soft text-negative" : "border-border text-ink-muted"
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
            modo === "rendimento" ? "border-accent bg-accent-soft text-accent-strong" : "border-border text-ink-muted"
          }`}
        >
          Rendimento
        </button>
      </div>

      {modo === "rendimento" ? (
        <>
          <p className="mt-3 text-xs text-ink-muted">
            Informe o saldo atual real dessa caixinha (depois de render). A diferença vira rendimento, sem
            contar como novo depósito.
          </p>
          <CurrencyInput
            value={saldoInformado}
            onChange={setSaldoInformado}
            className={`mt-2 w-full ${INPUT_CLASS}`}
          />
        </>
      ) : (
        <>
          <CurrencyInput value={valor} onChange={setValor} className={`mt-3 w-full ${INPUT_CLASS}`} />

          {banks.length > 0 && (
            <select
              value={bancoId}
              onChange={(event) => setBancoId(event.target.value)}
              className={`mt-2 w-full ${INPUT_CLASS}`}
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
              className={`mt-2 w-full ${INPUT_CLASS}`}
            />
          )}
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
                movimento.tipo === "retirada" || (movimento.tipo === "rendimento" && movimento.valor < 0);
              const label =
                movimento.tipo === "deposito" ? "Adicionado" : movimento.tipo === "retirada" ? "Retirado" : "Rendimento";
              return (
                <li key={movimento.id} className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 text-xs">
                  <span>
                    {formatDate(movimento.data)} · {label}
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
        description="Desfaz exatamente o que esse movimento alterou no saldo da caixinha."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDeleteMovement}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}

function TransferSheet({
  open,
  pockets,
  onTransfer,
  onClose,
}: {
  open: boolean;
  pockets: Pocket[];
  onTransfer: (fromId: string, toId: string, valor: number, data?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [fromId, setFromId] = useState(pockets[0]?.id ?? "");
  const [toId, setToId] = useState(pockets[1]?.id ?? "");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(todayIsoDate());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Escolha duas caixinhas diferentes.");
      return;
    }
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      await onTransfer(fromId, toId, valor, data);
      toast.success("Transferência feita.");
      setValor(0);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transferir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="mb-4 font-medium">Transferir entre caixinhas</p>
      <div className="flex flex-col gap-3">
        <select value={fromId} onChange={(event) => setFromId(event.target.value)} className={INPUT_CLASS}>
          {pockets.map((p) => (
            <option key={p.id} value={p.id}>
              De: {p.nome}
            </option>
          ))}
        </select>
        <select value={toId} onChange={(event) => setToId(event.target.value)} className={INPUT_CLASS}>
          {pockets.map((p) => (
            <option key={p.id} value={p.id}>
              Para: {p.nome}
            </option>
          ))}
        </select>
        <CurrencyInput value={valor} onChange={setValor} className={INPUT_CLASS} />
        <input
          type="date"
          value={data}
          onChange={(event) => setData(event.target.value)}
          className={INPUT_CLASS}
        />
        <button onClick={handleSave} disabled={saving} className={SAVE_BUTTON_CLASS}>
          Transferir
        </button>
      </div>
    </BottomSheet>
  );
}
