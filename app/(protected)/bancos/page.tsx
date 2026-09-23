"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeftRight, Landmark, Receipt } from "lucide-react";
import { useBanks } from "@/lib/use-banks";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { usePocketMovements } from "@/lib/use-pocket-movements";
import { useBankPayments } from "@/lib/use-bank-payments";
import { useBankTransfers } from "@/lib/use-bank-transfers";
import { useInvestmentMovements } from "@/lib/use-investment-movements";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import {
  computeBankFaturaAjustada,
  computeBankFaturaTransactions,
  computeBankSaldoConta,
  computeOriginDateById,
} from "@/lib/derived";
import { addMonthsToKey, currentMonthKey, formatCurrency, formatMonthLabel, todayIsoDate } from "@/lib/format";
import { useValuesVisibility } from "@/lib/visibility-context";
import { PageFade } from "@/app/_components/PageFade";
import { EmptyState } from "@/app/_components/EmptyState";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { MonthFilter } from "@/app/_components/MonthFilter";
import { TransactionListItem } from "@/app/_components/TransactionListItem";
import { MaskedCurrency } from "@/app/_components/Money";
import {
  INPUT_CLASS,
  INPUT_CLASS_COMPACT,
  SAVE_BUTTON_CLASS,
  RowActionButtons,
  ToggleAddButton,
} from "@/app/_components/SettingsFormKit";
import type { Bank, BankPayment, Transaction } from "@/lib/types";

export default function BancosPage() {
  const { banks, addBank, updateBank, removeBank, setBankOculto, setFaturaAjusteManual, payFatura, transferBetweenBanks } =
    useBanks();
  const { transactions, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { movements } = usePocketMovements();
  const { payments: bankPayments } = useBankPayments();
  const { movements: investmentMovements } = useInvestmentMovements();
  const { transfers: bankTransfers } = useBankTransfers();

  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState("");
  const [saldoDevedor, setSaldoDevedor] = useState(0);
  const [saldoContaInicial, setSaldoContaInicial] = useState(0);
  const [diaFechamento, setDiaFechamento] = useState("");
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [paying, setPaying] = useState<Bank | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [faturaDetalhe, setFaturaDetalhe] = useState<Bank | null>(null);
  const [monthKey, setMonthKey] = useState(currentMonthKey());

  const mesAtual = monthKey === currentMonthKey();
  const mesAnterior = addMonthsToKey(currentMonthKey(), -1);
  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  const saldoContaPorBanco = new Map(
    banks.map((b) => [
      b.id,
      computeBankSaldoConta(b, transactions, movements, bankPayments, investmentMovements, bankTransfers),
    ]),
  );
  const totalSaldoConta = Array.from(saldoContaPorBanco.values()).reduce((sum, v) => sum + v, 0);
  const totalFaturaMesAtual = banks.reduce(
    (sum, b) =>
      sum +
      computeBankFaturaAjustada(b.id, transactions, currentMonthKey(), banks, bankPayments) +
      b.saldoDevedor,
    0,
  );

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para o banco.");
      return;
    }
    await addBank(nome.trim(), saldoDevedor, saldoContaInicial, Number(diaFechamento) || undefined);
    toast.success("Banco criado.");
    setNome("");
    setSaldoDevedor(0);
    setSaldoContaInicial(0);
    setDiaFechamento("");
    setAdding(false);
  }

  return (
    <PageFade>
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Landmark size={20} className="text-accent-strong" />
            Bancos
          </h1>
          <ToggleAddButton open={adding} onClick={() => setAdding((v) => !v)} label="Adicionar banco" />
        </div>

        {adding && (
          <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-card bg-surface shadow-card p-4">
            <p className="mb-1 text-sm font-medium">Novo banco</p>
            <input
              type="text"
              placeholder="Nome do banco"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className={INPUT_CLASS_COMPACT}
            />
            <div className="flex gap-2">
              <CurrencyInput
                value={saldoContaInicial}
                onChange={setSaldoContaInicial}
                placeholder="Saldo em conta"
                className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
              />
              <CurrencyInput
                value={saldoDevedor}
                onChange={setSaldoDevedor}
                placeholder="Saldo anterior"
                className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
              />
            </div>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Dia de fechamento da fatura (opcional)"
              value={diaFechamento}
              onChange={(event) => setDiaFechamento(event.target.value)}
              className={INPUT_CLASS_COMPACT}
            />
            <button type="submit" className={SAVE_BUTTON_CLASS}>
              Criar banco
            </button>
          </form>
        )}

        {banks.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-surface shadow-card p-4">
              <p className="text-xs text-ink-muted">Total em contas</p>
              <p className={`mt-1 text-lg font-semibold ${totalSaldoConta < 0 ? "text-negative" : "text-accent-strong"}`}>
                <MaskedCurrency value={totalSaldoConta} />
              </p>
            </div>
            <div className="rounded-card bg-surface shadow-card p-4">
              <p className="text-xs text-ink-muted">Devido este mês</p>
              <p className="mt-1 text-lg font-semibold text-negative">
                <MaskedCurrency value={totalFaturaMesAtual} />
              </p>
            </div>
          </div>
        )}

        {banks.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Nenhum banco cadastrado"
            description="Adicione um banco pra acompanhar saldo em conta e fatura do cartão."
          />
        ) : (
          <>
            <MonthFilter monthKey={monthKey} onChange={setMonthKey} />
            <ul className="flex flex-col gap-2">
              {banks.map((banco) => {
                const fatura = computeBankFaturaAjustada(banco.id, transactions, monthKey, banks, bankPayments);
                const saldoConta = saldoContaPorBanco.get(banco.id) ?? 0;
                const totalDevido = fatura + (mesAtual ? banco.saldoDevedor : 0);
                const faturaMesAnteriorNaoPaga = mesAtual
                  ? computeBankFaturaAjustada(banco.id, transactions, mesAnterior, banks, bankPayments)
                  : 0;
                return (
                  <li
                    key={banco.id}
                    className={`rounded-card bg-surface shadow-card px-4 py-3 ${banco.oculto ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {banco.nome}
                        {banco.oculto && <span className="ml-1.5 text-xs text-ink-muted">(oculto)</span>}
                      </span>
                      <RowActionButtons
                        hiddenState={{
                          hidden: banco.oculto ?? false,
                          onToggle: () => setBankOculto(banco.id, !banco.oculto),
                          showLabel: "Mostrar banco",
                          hideLabel: "Ocultar banco",
                        }}
                        onEdit={() => setEditing(banco)}
                        onRemove={() => setRemoving({ id: banco.id, nome: banco.nome })}
                        editLabel="Editar banco"
                        removeLabel="Remover banco"
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className={`text-xs ${saldoConta < 0 ? "text-negative" : "text-ink-muted"}`}>
                        saldo em conta: <MaskedCurrency value={saldoConta} />
                      </span>
                      <button
                        onClick={() => setFaturaDetalhe(banco)}
                        className="shrink-0 text-right transition-transform active:scale-95"
                      >
                        <span className="block text-sm font-medium text-negative underline decoration-dotted underline-offset-2">
                          <MaskedCurrency value={fatura} />
                        </span>
                        <span className="block text-[11px] text-ink-muted">
                          fatura {mesAtual ? "deste mês" : "do mês"}
                        </span>
                      </button>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                      {mesAtual && banco.saldoDevedor > 0 && (
                        <span>
                          + <MaskedCurrency value={banco.saldoDevedor} /> de saldo anterior
                        </span>
                      )}
                      {banco.diaFechamento && <span>fecha dia {banco.diaFechamento}</span>}
                    </div>

                    {faturaMesAnteriorNaoPaga > 0 && (
                      <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-negative-soft px-3 py-2 text-[11px] text-negative">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        <MaskedCurrency value={faturaMesAnteriorNaoPaga} /> da fatura do mês passado ainda não
                        consta como paga nem está no saldo anterior — pague, ou ajuste na mão editando o banco.
                      </p>
                    )}

                    {mesAtual && totalDevido > 0 && (
                      <button
                        onClick={() => setPaying(banco)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-xs font-medium text-accent-strong transition-transform active:scale-[0.98] hover:bg-accent/20"
                      >
                        <Receipt size={14} />
                        Pagar fatura (<MaskedCurrency value={totalDevido} />)
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {banks.length > 1 && (
              <button
                onClick={() => setTransferring(true)}
                className="flex items-center gap-1.5 self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
              >
                <ArrowLeftRight size={14} />
                Transferir entre bancos
              </button>
            )}

            {banks.some((b) => b.oculto) && (
              <p className="text-[11px] text-ink-muted">
                Ocultar (ícone de olho) só tira o banco do facilitador na tela inicial — ele continua
                contando no patrimônio e disponível pra escolher em transações e transferências.
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remover banco?"
        description={`"${removing?.nome}" será removido. Despesas já vinculadas deixam de mostrar esse banco.`}
        confirmLabel="Remover"
        danger
        onConfirm={async () => {
          if (!removing) return;
          await removeBank(removing.id);
          toast.success("Banco removido.");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <EditBankSheet
        banco={editing}
        onSave={updateBank}
        onSetFaturaAjusteManual={setFaturaAjusteManual}
        saldoContaAtual={
          editing ? computeBankSaldoConta(editing, transactions, movements, bankPayments, investmentMovements, bankTransfers) : 0
        }
        faturaAjustadaAtual={
          editing ? computeBankFaturaAjustada(editing.id, transactions, currentMonthKey(), banks, bankPayments) : 0
        }
        onClose={() => setEditing(null)}
      />

      <PayFaturaSheet
        banco={paying}
        totalDevido={
          paying
            ? computeBankFaturaAjustada(paying.id, transactions, monthKey, banks, bankPayments) + paying.saldoDevedor
            : 0
        }
        onPayFatura={payFatura}
        onClose={() => setPaying(null)}
      />

      <TransferBankSheet
        open={transferring}
        banks={banks}
        saldoContaPorBanco={saldoContaPorBanco}
        onTransfer={transferBetweenBanks}
        onClose={() => setTransferring(false)}
      />

      <FaturaDetalheSheet
        banco={faturaDetalhe}
        monthKey={monthKey}
        transactions={transactions}
        allBanks={banks}
        bankPayments={bankPayments}
        onDeleteTransaction={deleteTransaction}
        colorByCategoria={colorByCategoria}
        iconByCategoria={iconByCategoria}
        bankNameById={bankNameById}
        onClose={() => setFaturaDetalhe(null)}
      />
    </PageFade>
  );
}

function EditBankSheet({
  banco,
  onSave,
  onSetFaturaAjusteManual,
  saldoContaAtual,
  faturaAjustadaAtual,
  onClose,
}: {
  banco: Bank | null;
  onSave: (
    id: string,
    input: { nome: string; saldoDevedor: number; saldoContaInicial?: number; diaFechamento?: number },
  ) => Promise<void>;
  onSetFaturaAjusteManual: (bancoId: string, delta: number) => Promise<void>;
  saldoContaAtual: number;
  faturaAjustadaAtual: number;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={banco !== null} onClose={onClose}>
      {banco && (
        <EditBankFields
          key={banco.id}
          banco={banco}
          onSave={onSave}
          onSetFaturaAjusteManual={onSetFaturaAjusteManual}
          saldoContaAtual={saldoContaAtual}
          faturaAjustadaAtual={faturaAjustadaAtual}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function EditBankFields({
  banco,
  onSave,
  onSetFaturaAjusteManual,
  saldoContaAtual,
  faturaAjustadaAtual,
  onClose,
}: {
  banco: Bank;
  onSave: (
    id: string,
    input: { nome: string; saldoDevedor: number; saldoContaInicial?: number; diaFechamento?: number },
  ) => Promise<void>;
  onSetFaturaAjusteManual: (bancoId: string, delta: number) => Promise<void>;
  saldoContaAtual: number;
  faturaAjustadaAtual: number;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(banco.nome);
  const [saldoDevedor, setSaldoDevedor] = useState(banco.saldoDevedor);
  const [saldoConta, setSaldoConta] = useState(saldoContaAtual);
  const [faturaMes, setFaturaMes] = useState(faturaAjustadaAtual);
  const [diaFechamento, setDiaFechamento] = useState(banco.diaFechamento ? String(banco.diaFechamento) : "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("Dê um nome para o banco.");
      return;
    }
    setSaving(true);
    try {
      const deltaConta = saldoConta - saldoContaAtual;
      const novoSaldoContaInicial = (banco.saldoContaInicial ?? 0) + deltaConta;
      await onSave(banco.id, {
        nome: nome.trim(),
        saldoDevedor,
        saldoContaInicial: novoSaldoContaInicial || undefined,
        diaFechamento: Number(diaFechamento) || undefined,
      });

      const deltaFatura = faturaAjustadaAtual - faturaMes;
      if (deltaFatura !== 0) {
        await onSetFaturaAjusteManual(banco.id, deltaFatura);
      }

      toast.success("Banco atualizado.");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar o banco.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-4 font-medium">Editar banco</p>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nome do banco"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className={INPUT_CLASS}
        />
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Saldo em conta atual
          <CurrencyInput value={saldoConta} onChange={setSaldoConta} className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Fatura deste mês
          <CurrencyInput value={faturaMes} onChange={setFaturaMes} className={INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Saldo anterior (dívida)
          <CurrencyInput value={saldoDevedor} onChange={setSaldoDevedor} className={INPUT_CLASS} />
        </label>
        <p className="text-[11px] text-ink-muted">
          Os três campos acima são o que está de verdade hoje — o site ajusta as contas por trás pra
          bater com o que você informar, sem duplicar nada já rastreado.
        </p>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Dia de fechamento da fatura (opcional)
          <input
            type="number"
            min="1"
            max="31"
            value={diaFechamento}
            onChange={(event) => setDiaFechamento(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <p className="text-[11px] text-ink-muted">
          Compra no crédito depois desse dia entra na fatura do mês seguinte, não do mês corrente. Isso
          vale automaticamente pra compras já lançadas, sem precisar mexer em nada.
        </p>
        <button onClick={handleSave} disabled={saving} className={SAVE_BUTTON_CLASS}>
          Salvar
        </button>
      </div>
    </>
  );
}

function FaturaDetalheSheet({
  banco,
  monthKey,
  transactions,
  allBanks,
  bankPayments,
  onDeleteTransaction,
  colorByCategoria,
  iconByCategoria,
  bankNameById,
  onClose,
}: {
  banco: Bank | null;
  monthKey: string;
  transactions: Transaction[];
  allBanks: Bank[];
  bankPayments: BankPayment[];
  onDeleteTransaction: (id: string) => Promise<void>;
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  bankNameById: Map<string, string>;
  onClose: () => void;
}) {
  const itens = banco ? computeBankFaturaTransactions(transactions, banco.id, monthKey, allBanks) : [];
  const originDateById = computeOriginDateById(transactions);
  const totalLancado = itens.reduce((sum, t) => sum + t.valor, 0);
  const faturaRestante = banco
    ? computeBankFaturaAjustada(banco.id, transactions, monthKey, allBanks, bankPayments)
    : 0;
  const jaPago = Math.max(0, totalLancado - faturaRestante);

  return (
    <BottomSheet open={banco !== null} onClose={onClose}>
      {banco && (
        <>
          <p className="mb-1 font-medium">
            Fatura de {banco.nome} — {formatMonthLabel(monthKey)}
          </p>
          <p className="mb-4 text-xs text-ink-muted">
            Toque num item pra editar ou excluir. Mudanças aqui recalculam a fatura na hora.
          </p>

          {jaPago > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-bg px-4 py-3 text-xs text-ink-muted">
              <span>
                Lançado: <MaskedCurrency value={totalLancado} />
              </span>
              <span className="text-accent-strong">
                Pago: <MaskedCurrency value={jaPago} />
              </span>
              <span className={faturaRestante > 0 ? "text-negative" : "text-accent-strong"}>
                Falta: <MaskedCurrency value={faturaRestante} />
              </span>
            </div>
          )}

          {itens.length === 0 ? (
            <p className="rounded-2xl bg-bg px-4 py-6 text-center text-sm text-ink-muted">
              Nenhum item nessa fatura ainda.
            </p>
          ) : (
            <div className="-mx-1 flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-1">
              {itens.map((transaction) => (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                  onDelete={onDeleteTransaction}
                  colorByCategoria={colorByCategoria}
                  iconByCategoria={iconByCategoria}
                  bankNameById={bankNameById}
                  originDateById={originDateById}
                />
              ))}
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}

function TransferBankSheet({
  open,
  banks,
  saldoContaPorBanco,
  onTransfer,
  onClose,
}: {
  open: boolean;
  banks: Bank[];
  saldoContaPorBanco: Map<string, number>;
  onTransfer: (fromBancoId: string, toBancoId: string, valor: number, data?: string) => Promise<void>;
  onClose: () => void;
}) {
  const { hidden } = useValuesVisibility();
  const [fromId, setFromId] = useState(banks[0]?.id ?? "");
  const [toId, setToId] = useState(banks[1]?.id ?? "");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(todayIsoDate());
  const [saving, setSaving] = useState(false);

  const fromBanco = banks.find((b) => b.id === fromId);
  const toBanco = banks.find((b) => b.id === toId);
  const saldoOrigemAtual = saldoContaPorBanco.get(fromId) ?? 0;
  const saldoDestinoAtual = saldoContaPorBanco.get(toId) ?? 0;

  async function handleSave() {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Escolha dois bancos diferentes.");
      return;
    }
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    const saldoOrigem = saldoContaPorBanco.get(fromId) ?? 0;
    if (valor > saldoOrigem) {
      toast.error("Saldo em conta insuficiente nesse banco.");
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
      <p className="mb-4 font-medium">Transferir entre bancos</p>
      <div className="flex flex-col gap-3">
        <select value={fromId} onChange={(event) => setFromId(event.target.value)} className={INPUT_CLASS}>
          {banks.map((banco) => (
            <option key={banco.id} value={banco.id}>
              De: {banco.nome} ({hidden ? "••••" : formatCurrency(saldoContaPorBanco.get(banco.id) ?? 0)})
            </option>
          ))}
        </select>
        <select value={toId} onChange={(event) => setToId(event.target.value)} className={INPUT_CLASS}>
          {banks.map((banco) => (
            <option key={banco.id} value={banco.id}>
              Para: {banco.nome} ({hidden ? "••••" : formatCurrency(saldoContaPorBanco.get(banco.id) ?? 0)})
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

        {fromBanco && toBanco && fromId !== toId && valor > 0 && (
          <div className="flex flex-col gap-1 rounded-2xl bg-bg px-4 py-3 text-xs text-ink-muted">
            <span className="flex items-center justify-between">
              <span className="truncate">{fromBanco.nome} depois</span>
              <MaskedCurrency
                value={saldoOrigemAtual - valor}
                className={saldoOrigemAtual - valor < 0 ? "font-medium text-negative" : "font-medium text-ink"}
              />
            </span>
            <span className="flex items-center justify-between">
              <span className="truncate">{toBanco.nome} depois</span>
              <MaskedCurrency value={saldoDestinoAtual + valor} className="font-medium text-ink" />
            </span>
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className={SAVE_BUTTON_CLASS}>
          Transferir
        </button>
      </div>
    </BottomSheet>
  );
}

function PayFaturaSheet({
  banco,
  totalDevido,
  onPayFatura,
  onClose,
}: {
  banco: Bank | null;
  totalDevido: number;
  onPayFatura: (id: string, valor: number, data?: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={banco !== null} onClose={onClose}>
      {banco && (
        <PayFaturaFields key={banco.id} banco={banco} totalDevido={totalDevido} onPayFatura={onPayFatura} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function PayFaturaFields({
  banco,
  totalDevido,
  onPayFatura,
  onClose,
}: {
  banco: Bank;
  totalDevido: number;
  onPayFatura: (id: string, valor: number, data?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [valor, setValor] = useState(totalDevido);
  const [data, setData] = useState(todayIsoDate());
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (valor > totalDevido) {
      toast.error("O valor é maior que o total devido.");
      return;
    }

    setSaving(true);
    try {
      await onPayFatura(banco.id, valor, data);
      toast.success("Pagamento registrado — saiu do saldo em conta.");
      onClose();
    } catch {
      toast.error("Não foi possível registrar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-1 font-medium">Pagar fatura — {banco.nome}</p>
      <p className="mb-4 text-xs text-ink-muted">
        Total devido: <MaskedCurrency value={totalDevido} /> (fatura do mês + saldo anterior). Esse valor
        sai do saldo em conta do banco e some da fatura exibida. Pra corrigir algo na mão, use o botão de
        editar acima.
      </p>

      <CurrencyInput value={valor} onChange={setValor} className={`w-full ${INPUT_CLASS}`} />
      <input
        type="date"
        value={data}
        onChange={(event) => setData(event.target.value)}
        className={`mt-2 w-full ${INPUT_CLASS}`}
      />

      <button onClick={handleConfirm} disabled={saving} className={`mt-3 w-full ${SAVE_BUTTON_CLASS}`}>
        Confirmar pagamento
      </button>
    </>
  );
}
