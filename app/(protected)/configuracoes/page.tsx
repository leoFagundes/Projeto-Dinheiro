"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Landmark, LogOut, Pencil, PiggyBank, Plus, Tags, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { usePockets } from "@/lib/use-pockets";
import { formatCurrency } from "@/lib/format";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { PageFade } from "@/app/_components/PageFade";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { EmojiPickerSheet } from "@/app/_components/EmojiPickerSheet";
import { BottomSheet } from "@/app/_components/BottomSheet";
import type { Bank, TransactionType } from "@/lib/types";

export default function ConfiguracoesPage() {
  return (
    <PageFade>
      <div className="flex flex-col gap-8 pb-8">
        <h1 className="text-lg font-semibold">Configurações</h1>
        <CategoriasSection />
        <BancosSection />
        <CaixinhasSection />
        <ContaSection />
      </div>
    </PageFade>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Icon size={16} />
        {title}
      </h2>
      <div className="rounded-card bg-surface p-4">{children}</div>
    </section>
  );
}

function CategoriasSection() {
  const { categories, addCategory, removeCategory } = useCategories();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TransactionType>("despesa");
  const [icone, setIcone] = useState(FALLBACK_CATEGORY_ICON);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);

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

  const despesas = categories.filter((c) => c.tipo === "despesa");
  const receitas = categories.filter((c) => c.tipo === "receita");

  return (
    <SectionCard icon={Tags} title="Categorias">
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
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
        <select
          value={tipo}
          onChange={(event) => setTipo(event.target.value as TransactionType)}
          className="rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        >
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
        <button
          type="submit"
          className="flex items-center justify-center rounded-2xl bg-accent px-3 text-white transition-transform active:scale-95 hover:bg-accent-strong"
          aria-label="Adicionar categoria"
        >
          <Plus size={18} />
        </button>
      </form>

      <EmojiPickerSheet
        open={pickingIcon}
        onClose={() => setPickingIcon(false)}
        onSelect={setIcone}
      />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-2 text-xs text-ink-muted">Despesas</p>
          <ul className="flex flex-col gap-1.5">
            {despesas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-bg px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span>{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  {c.nome}
                </span>
                <button
                  onClick={() => setRemoving({ id: c.id, nome: c.nome })}
                  className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                  aria-label="Remover categoria"
                >
                  <Trash2 size={14} />
                </button>
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
                className="flex items-center justify-between rounded-xl bg-bg px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span>{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  {c.nome}
                </span>
                <button
                  onClick={() => setRemoving({ id: c.id, nome: c.nome })}
                  className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                  aria-label="Remover categoria"
                >
                  <Trash2 size={14} />
                </button>
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
          toast.success("Categoria removida.");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </SectionCard>
  );
}

function BancosSection() {
  const { banks, addBank, updateBank, removeBank } = useBanks();
  const [nome, setNome] = useState("");
  const [saldoDevedor, setSaldoDevedor] = useState("");
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Bank | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para o banco.");
      return;
    }
    await addBank(nome.trim(), Number(saldoDevedor.replace(",", ".")) || 0);
    toast.success("Banco criado.");
    setNome("");
    setSaldoDevedor("");
  }

  return (
    <SectionCard icon={Landmark} title="Bancos">
      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Nome do banco"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="Saldo anterior"
          value={saldoDevedor}
          onChange={(event) => setSaldoDevedor(event.target.value)}
          className="w-32 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          className="flex items-center justify-center rounded-2xl bg-accent px-3 text-white transition-transform active:scale-95 hover:bg-accent-strong"
          aria-label="Adicionar banco"
        >
          <Plus size={18} />
        </button>
      </form>

      {banks.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {banks.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5"
            >
              <span>{b.nome}</span>
              <span className="flex items-center gap-3">
                {b.saldoDevedor > 0 && (
                  <span className="text-xs text-negative">
                    saldo anterior: {formatCurrency(b.saldoDevedor)}
                  </span>
                )}
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
            </li>
          ))}
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
  onSave: (id: string, input: { nome: string; saldoDevedor: number }) => Promise<void>;
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
  onSave: (id: string, input: { nome: string; saldoDevedor: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(banco.nome);
  const [saldoDevedor, setSaldoDevedor] = useState(String(banco.saldoDevedor));
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
        saldoDevedor: Number(saldoDevedor.replace(",", ".")) || 0,
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
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="Saldo anterior"
          value={saldoDevedor}
          onChange={(event) => setSaldoDevedor(event.target.value)}
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

function CaixinhasSection() {
  const { pockets, addPocket, removePocket } = usePockets();
  const [nome, setNome] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para a caixinha.");
      return;
    }
    await addPocket(nome.trim(), Number(saldoInicial.replace(",", ".")) || 0);
    toast.success("Caixinha criada.");
    setNome("");
    setSaldoInicial("");
  }

  return (
    <SectionCard icon={PiggyBank} title="Caixinhas">
      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Nome (ex: Reserva, Viagem)"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="Saldo inicial"
          value={saldoInicial}
          onChange={(event) => setSaldoInicial(event.target.value)}
          className="w-32 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          className="flex items-center justify-center rounded-2xl bg-accent px-3 text-white transition-transform active:scale-95 hover:bg-accent-strong"
          aria-label="Adicionar caixinha"
        >
          <Plus size={18} />
        </button>
      </form>

      {pockets.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {pockets.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5"
            >
              <span>{p.nome}</span>
              <span className="flex items-center gap-3">
                <span className="text-accent-strong">{formatCurrency(p.saldo)}</span>
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
    </SectionCard>
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
