"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Landmark,
  LogOut,
  Pencil,
  PiggyBank,
  Plus,
  Tags,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/use-categories";
import { useCategoryGoals } from "@/lib/use-category-goals";
import { useBanks } from "@/lib/use-banks";
import { usePockets } from "@/lib/use-pockets";
import { useTransactions } from "@/lib/use-transactions";
import { usePocketMovements } from "@/lib/use-pocket-movements";
import { useBankPayments } from "@/lib/use-bank-payments";
import { useBankTransfers } from "@/lib/use-bank-transfers";
import { useInvestments } from "@/lib/use-investments";
import { useInvestmentMovements } from "@/lib/use-investment-movements";
import { computeBankSaldoConta } from "@/lib/derived";
import { formatCurrency } from "@/lib/format";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { PageFade } from "@/app/_components/PageFade";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { EmojiPickerSheet } from "@/app/_components/EmojiPickerSheet";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import type { Bank, Category, Investment, InvestmentType, Pocket, TransactionType } from "@/lib/types";

export default function ConfiguracoesPage() {
  return (
    <PageFade>
      <div className="flex flex-col gap-8 pb-8">
        <h1 className="text-lg font-semibold">Configurações</h1>
        <CategoriasSection />
        <BancosSection />
        <CaixinhasSection />
        <InvestimentosSection />
        <ContaSection />
      </div>
    </PageFade>
  );
}

function SectionCard({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Icon size={16} />
        {title}
      </h2>
      <div className="rounded-card bg-surface p-4">{children}</div>
    </section>
  );
}

function CategoriasSection() {
  const { categories, addCategory, removeCategory, updateCategory } = useCategories();
  const { goals, overrides, removeGoal, removeGoalOverride, renameGoalCategoria } =
    useCategoryGoals();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TransactionType>("despesa");
  const [icone, setIcone] = useState(FALLBACK_CATEGORY_ICON);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para a categoria.");
      return;
    }
    await addCategory(nome.trim(), tipo, icone);
    toast.success("Categoria criada.");
    setNome("");
    setIcone(FALLBACK_CATEGORY_ICON);
  }

  async function handleUpdateCategory(id: string, input: { nome: string; icone: string }) {
    const original = categories.find((c) => c.id === id);
    await updateCategory(id, input);
    if (original && original.nome !== input.nome) {
      await renameGoalCategoria(original.nome, input.nome);
    }
  }

  const despesas = categories.filter((c) => c.tipo === "despesa");
  const receitas = categories.filter((c) => c.tipo === "receita");

  return (
    <SectionCard icon={Tags} title="Categorias">
      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPickingIcon(true)}
            aria-label="Escolher ícone"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-bg text-lg transition-transform active:scale-95"
          >
            {icone}
          </button>
          <input
            type="text"
            placeholder="Nova categoria"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value as TransactionType)}
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <button
            type="submit"
            className="flex shrink-0 items-center justify-center rounded-2xl bg-accent px-4 text-white transition-transform active:scale-95 hover:bg-accent-strong"
            aria-label="Adicionar categoria"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      <EmojiPickerSheet
        open={pickingIcon}
        onClose={() => setPickingIcon(false)}
        onSelect={setIcone}
      />

      <div className="flex flex-col gap-4 text-sm">
        <div>
          <p className="mb-2 text-xs text-ink-muted">Despesas</p>
          <ul className="flex flex-col gap-1.5">
            {despesas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  <span className="truncate">{c.nome}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
                    aria-label="Editar categoria"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setRemoving({ id: c.id, nome: c.nome })}
                    className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                    aria-label="Remover categoria"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs text-ink-muted">Receitas</p>
          <ul className="flex flex-col gap-1.5">
            {receitas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  <span className="truncate">{c.nome}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
                    aria-label="Editar categoria"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setRemoving({ id: c.id, nome: c.nome })}
                    className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                    aria-label="Remover categoria"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remover categoria?"
        description={`"${removing?.nome}" será removida. Transações já lançadas mantêm o nome antigo.`}
        confirmLabel="Remover"
        danger
        onConfirm={async () => {
          if (!removing) return;
          await removeCategory(removing.id);
          const orphanGoal = goals.find((g) => g.categoria === removing.nome);
          if (orphanGoal) await removeGoal(orphanGoal.id);
          await Promise.all(
            overrides
              .filter((o) => o.categoria === removing.nome)
              .map((o) => removeGoalOverride(o.id)),
          );
          toast.success("Categoria removida.");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <EditCategorySheet
        categoria={editing}
        onSave={handleUpdateCategory}
        onClose={() => setEditing(null)}
      />
    </SectionCard>
  );
}

function EditCategorySheet({
  categoria,
  onSave,
  onClose,
}: {
  categoria: Category | null;
  onSave: (id: string, input: { nome: string; icone: string }) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={categoria !== null} onClose={onClose}>
      {categoria && (
        <EditCategoryFields
          key={categoria.id}
          categoria={categoria}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function EditCategoryFields({
  categoria,
  onSave,
  onClose,
}: {
  categoria: Category;
  onSave: (id: string, input: { nome: string; icone: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(categoria.nome);
  const [icone, setIcone] = useState(categoria.icone ?? FALLBACK_CATEGORY_ICON);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("Dê um nome para a categoria.");
      return;
    }
    setSaving(true);
    try {
      await onSave(categoria.id, { nome: nome.trim(), icone });
      toast.success("Categoria atualizada.");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-4 font-medium">Editar categoria</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickingIcon(true)}
          aria-label="Escolher ícone"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-bg text-lg transition-transform active:scale-95"
        >
          {icone}
        </button>
        <input
          type="text"
          placeholder="Nome da categoria"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
      >
        Salvar
      </button>

      <EmojiPickerSheet
        open={pickingIcon}
        onClose={() => setPickingIcon(false)}
        onSelect={setIcone}
      />
    </>
  );
}

function BancosSection() {
  const { banks, addBank, updateBank, removeBank } = useBanks();
  const { transactions } = useTransactions();
  const { movements } = usePocketMovements();
  const { payments } = useBankPayments();
  const { movements: investmentMovements } = useInvestmentMovements();
  const { transfers } = useBankTransfers();
  const [nome, setNome] = useState("");
  const [saldoDevedor, setSaldoDevedor] = useState(0);
  const [saldoContaInicial, setSaldoContaInicial] = useState(0);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Bank | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para o banco.");
      return;
    }
    await addBank(nome.trim(), saldoDevedor, saldoContaInicial);
    toast.success("Banco criado.");
    setNome("");
    setSaldoDevedor(0);
    setSaldoContaInicial(0);
  }

  return (
    <SectionCard icon={Landmark} title="Bancos" id="bancos">
      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Nome do banco"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <div className="flex gap-2">
          <CurrencyInput
            value={saldoContaInicial}
            onChange={setSaldoContaInicial}
            placeholder="Saldo em conta"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <CurrencyInput
            value={saldoDevedor}
            onChange={setSaldoDevedor}
            placeholder="Saldo anterior"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center justify-center rounded-2xl bg-accent px-4 text-white transition-transform active:scale-95 hover:bg-accent-strong"
            aria-label="Adicionar banco"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      {banks.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {banks.map((b) => {
            const saldoConta = computeBankSaldoConta(
              b,
              transactions,
              movements,
              payments,
              investmentMovements,
              transfers,
            );
            return (
              <li key={b.id} className="rounded-xl bg-bg px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{b.nome}</span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    <button
                      onClick={() => setEditing(b)}
                      className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
                      aria-label="Editar banco"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setRemoving({ id: b.id, nome: b.nome })}
                      className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                      aria-label="Remover banco"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                  <span className={saldoConta < 0 ? "text-negative" : "text-accent-strong"}>
                    saldo em conta: {formatCurrency(saldoConta)}
                  </span>
                  {b.saldoDevedor > 0 && (
                    <span className="text-negative">
                      saldo anterior: {formatCurrency(b.saldoDevedor)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

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

      <EditBankSheet banco={editing} onSave={updateBank} onClose={() => setEditing(null)} />
    </SectionCard>
  );
}

function EditBankSheet({
  banco,
  onSave,
  onClose,
}: {
  banco: Bank | null;
  onSave: (
    id: string,
    input: { nome: string; saldoDevedor: number; saldoContaInicial?: number },
  ) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={banco !== null} onClose={onClose}>
      {banco && (
        <EditBankFields key={banco.id} banco={banco} onSave={onSave} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function EditBankFields({
  banco,
  onSave,
  onClose,
}: {
  banco: Bank;
  onSave: (
    id: string,
    input: { nome: string; saldoDevedor: number; saldoContaInicial?: number },
  ) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(banco.nome);
  const [saldoDevedor, setSaldoDevedor] = useState(banco.saldoDevedor);
  const [saldoContaInicial, setSaldoContaInicial] = useState(banco.saldoContaInicial ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("Dê um nome para o banco.");
      return;
    }
    setSaving(true);
    try {
      await onSave(banco.id, {
        nome: nome.trim(),
        saldoDevedor,
        saldoContaInicial: saldoContaInicial || undefined,
      });
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
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Saldo em conta (ajuste manual)
          <CurrencyInput
            value={saldoContaInicial}
            onChange={setSaldoContaInicial}
            className="rounded-2xl border border-border px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Saldo anterior (dívida)
          <CurrencyInput
            value={saldoDevedor}
            onChange={setSaldoDevedor}
            className="rounded-2xl border border-border px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
        >
          Salvar
        </button>
      </div>
    </>
  );
}

function CaixinhasSection() {
  const { pockets, addPocket, updatePocket, removePocket, transferBetweenPockets } =
    usePockets();
  const [nome, setNome] = useState("");
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [metaValor, setMetaValor] = useState(0);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Pocket | null>(null);
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
  }

  return (
    <SectionCard icon={PiggyBank} title="Caixinhas" id="caixinhas">
      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Nome (ex: Reserva, Viagem)"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <div className="flex gap-2">
          <CurrencyInput
            value={saldoInicial}
            onChange={setSaldoInicial}
            placeholder="Saldo inicial"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <CurrencyInput
            value={metaValor}
            onChange={setMetaValor}
            placeholder="Meta (opcional)"
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            className="flex items-center justify-center rounded-2xl bg-accent px-3 text-white transition-transform active:scale-95 hover:bg-accent-strong"
            aria-label="Adicionar caixinha"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      {pockets.length > 0 && (
        <>
          <ul className="flex flex-col gap-1.5 text-sm">
            {pockets.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5"
              >
                <span>{p.nome}</span>
                <span className="flex items-center gap-2.5">
                  <span className="text-accent-strong">
                    {formatCurrency(p.saldo)}
                    {p.metaValor ? (
                      <span className="text-ink-muted"> / {formatCurrency(p.metaValor)}</span>
                    ) : null}
                  </span>
                  <button
                    onClick={() => setEditing(p)}
                    className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
                    aria-label="Editar caixinha"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setRemoving({ id: p.id, nome: p.nome })}
                    className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                    aria-label="Remover caixinha"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {pockets.length > 1 && (
            <button
              onClick={() => setTransferring(true)}
              className="mt-3 flex items-center gap-1.5 text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
            >
              <ArrowLeftRight size={14} />
              Transferir entre caixinhas
            </button>
          )}
        </>
      )}

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
      <TransferSheet
        open={transferring}
        pockets={pockets}
        onTransfer={transferBetweenPockets}
        onClose={() => setTransferring(false)}
      />
    </SectionCard>
  );
}

function EditPocketSheet({
  pocket,
  onSave,
  onClose,
}: {
  pocket: Pocket | null;
  onSave: (
    id: string,
    input: { nome: string; saldo: number; metaValor?: number },
  ) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={pocket !== null} onClose={onClose}>
      {pocket && (
        <EditPocketFields key={pocket.id} pocket={pocket} onSave={onSave} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function EditPocketFields({
  pocket,
  onSave,
  onClose,
}: {
  pocket: Pocket;
  onSave: (
    id: string,
    input: { nome: string; saldo: number; metaValor?: number },
  ) => Promise<void>;
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
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <CurrencyInput
          value={saldo}
          onChange={setSaldo}
          placeholder="Saldo atual"
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <CurrencyInput
          value={metaValor}
          onChange={setMetaValor}
          placeholder="Meta (opcional)"
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
        >
          Salvar
        </button>
      </div>
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
  onTransfer: (fromId: string, toId: string, valor: number) => Promise<void>;
  onClose: () => void;
}) {
  const [fromId, setFromId] = useState(pockets[0]?.id ?? "");
  const [toId, setToId] = useState(pockets[1]?.id ?? "");
  const [valor, setValor] = useState(0);
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
      await onTransfer(fromId, toId, valor);
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
        <select
          value={fromId}
          onChange={(event) => setFromId(event.target.value)}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        >
          {pockets.map((p) => (
            <option key={p.id} value={p.id}>
              De: {p.nome}
            </option>
          ))}
        </select>
        <select
          value={toId}
          onChange={(event) => setToId(event.target.value)}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        >
          {pockets.map((p) => (
            <option key={p.id} value={p.id}>
              Para: {p.nome}
            </option>
          ))}
        </select>
        <CurrencyInput
          value={valor}
          onChange={setValor}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
        >
          Transferir
        </button>
      </div>
    </BottomSheet>
  );
}

function InvestimentosSection() {
  const { investments, addInvestment, updateInvestment, removeInvestment } = useInvestments();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<InvestmentType>("rendaFixa");
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Investment | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para o investimento.");
      return;
    }
    await addInvestment(nome.trim(), tipo);
    toast.success("Investimento criado.");
    setNome("");
    setTipo("rendaFixa");
  }

  return (
    <SectionCard icon={TrendingUp} title="Investimentos" id="investimentos">
      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
        <input
          type="text"
          placeholder="Nome (ex: Tesouro Selic, PETR4)"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <div className="flex gap-2">
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value as InvestmentType)}
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          >
            <option value="rendaFixa">Renda fixa</option>
            <option value="rendaVariavel">Renda variável</option>
          </select>
          <button
            type="submit"
            className="flex shrink-0 items-center justify-center rounded-2xl bg-accent px-4 text-white transition-transform active:scale-95 hover:bg-accent-strong"
            aria-label="Adicionar investimento"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      {investments.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {investments.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate">{inv.nome}</span>
                <span className="text-xs text-ink-muted">
                  {inv.tipo === "rendaVariavel" ? "Renda variável" : "Renda fixa"} ·{" "}
                  {formatCurrency(inv.valorInvestido)}
                  {inv.tipo === "rendaVariavel" && inv.totalCotas
                    ? ` · ${inv.totalCotas} cotas`
                    : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <button
                  onClick={() => setEditing(inv)}
                  className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
                  aria-label="Editar investimento"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setRemoving({ id: inv.id, nome: inv.nome })}
                  className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                  aria-label="Remover investimento"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-ink-muted">
        Aportes e resgates são feitos na aba Início, dentro de cada investimento.
      </p>

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

      <EditInvestmentSheet
        investment={editing}
        onSave={updateInvestment}
        onClose={() => setEditing(null)}
      />
    </SectionCard>
  );
}

function EditInvestmentSheet({
  investment,
  onSave,
  onClose,
}: {
  investment: Investment | null;
  onSave: (id: string, input: { nome: string; tipo: InvestmentType }) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={investment !== null} onClose={onClose}>
      {investment && (
        <EditInvestmentFields
          key={investment.id}
          investment={investment}
          onSave={onSave}
          onClose={onClose}
        />
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
  onSave: (id: string, input: { nome: string; tipo: InvestmentType }) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(investment.nome);
  const [tipo, setTipo] = useState<InvestmentType>(investment.tipo);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("Dê um nome para o investimento.");
      return;
    }
    setSaving(true);
    try {
      await onSave(investment.id, { nome: nome.trim(), tipo });
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
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <select
          value={tipo}
          onChange={(event) => setTipo(event.target.value as InvestmentType)}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        >
          <option value="rendaFixa">Renda fixa</option>
          <option value="rendaVariavel">Renda variável</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
        >
          Salvar
        </button>
      </div>
    </>
  );
}

function ContaSection() {
  const { user, signOut } = useAuth();

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-ink-muted">Conta</h2>
      <div className="rounded-card bg-surface p-4">
        <p className="mb-3 truncate text-sm text-ink-muted">{user?.email}</p>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm font-medium text-negative transition-transform active:scale-95"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>
    </section>
  );
}
