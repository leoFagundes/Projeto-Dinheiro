"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import { motion, useAnimationControls } from "motion/react";
import {
  Bell,
  Database,
  Delete,
  Fingerprint,
  Gamepad2,
  LogOut,
  MessageSquareText,
  Monitor,
  Moon,
  Plus,
  ShieldCheck,
  Smartphone,
  Sun,
  Tags,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/use-categories";
import { useCategoryGoals } from "@/lib/use-category-goals";
import { useAccountPreferences } from "@/lib/use-account-preferences";
import { useFeedback } from "@/lib/use-feedback";
import { useTheme, type ThemePreference } from "@/lib/use-theme";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import {
  disableAppLock,
  hasBiometricCredential,
  isAppLockEnabled,
  registerBiometric,
  setAppLockPin,
  supportsBiometric,
} from "@/lib/app-lock";
import { buildBackup, deleteAllUserData, downloadBackup, importBackup, type BackupData } from "@/lib/backup";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { BirdIcon } from "@/app/_components/BirdIcon";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { PageFade } from "@/app/_components/PageFade";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { EmojiPickerSheet } from "@/app/_components/EmojiPickerSheet";
import { BottomSheet } from "@/app/_components/BottomSheet";
import {
  INPUT_CLASS,
  INPUT_CLASS_COMPACT,
  SAVE_BUTTON_CLASS,
  SectionCard,
  RowActionButtons,
  ToggleSwitch,
} from "@/app/_components/SettingsFormKit";
import type { Category, FeedbackTipo, TransactionType } from "@/lib/types";

export default function ConfiguracoesPage() {
  return (
    <PageFade>
      <div className="flex flex-col gap-8 pb-8">
        <h1 className="text-lg font-semibold">Ajustes</h1>
        <CategoriasSection />
        <OrcamentoSection />
        <NotificacoesSection />
        <AparenciaSection />
        <InstalarAppSection />
        <DadosSection />
        <SegurancaSection />
        <FeedbackSection />
        <EasterEggSection />
        <ContaSection />
      </div>
    </PageFade>
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
    const nomeNormalizado = nome.trim();
    if (!nomeNormalizado) {
      toast.error("Dê um nome para a categoria.");
      return;
    }
    const duplicada = categories.some(
      (c) => c.tipo === tipo && c.nome.toLowerCase() === nomeNormalizado.toLowerCase(),
    );
    if (duplicada) {
      toast.error(`Já existe uma categoria de ${tipo} com esse nome.`);
      return;
    }
    await addCategory(nomeNormalizado, tipo, icone);
    toast.success("Categoria criada.");
    setNome("");
    setIcone(FALLBACK_CATEGORY_ICON);
  }

  async function handleUpdateCategory(id: string, input: { nome: string; icone: string }) {
    const original = categories.find((c) => c.id === id);
    if (!original) return;
    const duplicada = categories.some(
      (c) =>
        c.id !== id &&
        c.tipo === original.tipo &&
        c.nome.toLowerCase() === input.nome.trim().toLowerCase(),
    );
    if (duplicada) {
      throw new Error(`Já existe uma categoria de ${original.tipo} com esse nome.`);
    }
    await updateCategory(id, input);
    // Metas de gasto valem só pra despesas, então renomear uma categoria de
    // receita nunca deve mexer numa meta — mesmo que exista uma despesa com
    // o mesmo nome (ex.: "Outros" existe nos dois tipos por padrão).
    if (original.tipo === "despesa" && original.nome !== input.nome) {
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
            className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
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

      <EmojiPickerSheet open={pickingIcon} onClose={() => setPickingIcon(false)} onSelect={setIcone} />

      <div className="flex flex-col gap-4 text-sm">
        <div>
          <p className="mb-2 text-xs text-ink-muted">Despesas</p>
          <ul className="flex flex-col gap-1.5">
            {despesas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  <span className="truncate">{c.nome}</span>
                </span>
                <RowActionButtons
                  onEdit={() => setEditing(c)}
                  onRemove={() => setRemoving({ id: c.id, nome: c.nome })}
                  editLabel="Editar categoria"
                  removeLabel="Remover categoria"
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs text-ink-muted">Receitas</p>
          <ul className="flex flex-col gap-1.5">
            {receitas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  <span className="truncate">{c.nome}</span>
                </span>
                <RowActionButtons
                  onEdit={() => setEditing(c)}
                  onRemove={() => setRemoving({ id: c.id, nome: c.nome })}
                  editLabel="Editar categoria"
                  removeLabel="Remover categoria"
                />
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
            overrides.filter((o) => o.categoria === removing.nome).map((o) => removeGoalOverride(o.id)),
          );
          toast.success("Categoria removida.");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <EditCategorySheet categoria={editing} onSave={handleUpdateCategory} onClose={() => setEditing(null)} />
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
        <EditCategoryFields key={categoria.id} categoria={categoria} onSave={onSave} onClose={onClose} />
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a categoria.");
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
          className={`min-w-0 flex-1 ${INPUT_CLASS}`}
        />
      </div>
      <button onClick={handleSave} disabled={saving} className={`mt-3 w-full ${SAVE_BUTTON_CLASS}`}>
        Salvar
      </button>

      <EmojiPickerSheet open={pickingIcon} onClose={() => setPickingIcon(false)} onSelect={setIcone} />
    </>
  );
}

/** Teto único pro mês inteiro (diferente dos limites por categoria) — usa `key` pra recarregar o form só quando o valor salvo de verdade muda, sem precisar de useEffect. */
function OrcamentoSection() {
  const { orcamentoMensal, loading, setOrcamentoMensal } = useAccountPreferences();

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Wallet size={16} />
        Orçamento mensal
      </h2>
      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="mb-3 text-xs text-ink-muted">
          Um teto único pra tudo que você gasta no mês, além dos limites por categoria.
        </p>
        {!loading && <OrcamentoForm valorAtual={orcamentoMensal} onSave={setOrcamentoMensal} />}
      </div>
    </section>
  );
}

function OrcamentoForm({
  valorAtual,
  onSave,
}: {
  valorAtual?: number;
  onSave: (valor: number) => Promise<void>;
}) {
  const [valor, setValor] = useState(valorAtual ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(valor);
      toast.success(valor > 0 ? "Orçamento mensal salvo." : "Orçamento mensal removido.");
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2">
      <CurrencyInput
        value={valor}
        onChange={setValor}
        placeholder="Sem teto definido"
        className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="shrink-0 rounded-2xl bg-accent px-4 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-50"
      >
        Salvar
      </button>
    </div>
  );
}

function NotificacoesSection() {
  const { notificacoesFatura, setNotificacoesFatura } = useAccountPreferences();
  const [requesting, setRequesting] = useState(false);

  async function handleToggle() {
    if (!notificacoesFatura) {
      if (typeof Notification === "undefined") {
        toast.error("Seu navegador não suporta notificações.");
        return;
      }
      setRequesting(true);
      const permission = await Notification.requestPermission();
      setRequesting(false);
      if (permission !== "granted") {
        toast.error("Permissão de notificação negada pelo navegador.");
        return;
      }
    }
    await setNotificacoesFatura(!notificacoesFatura);
    toast.success(!notificacoesFatura ? "Avisos ativados." : "Avisos desativados.");
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Bell size={16} />
        Notificações
      </h2>
      <div className="flex items-center justify-between gap-3 rounded-card bg-surface shadow-card p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Avisar sobre cobranças próximas</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Assinaturas e parcelas de empréstimo que vencem nos próximos 3 dias, ao abrir o app.
          </p>
        </div>
        <ToggleSwitch checked={notificacoesFatura} onChange={handleToggle} disabled={requesting} />
      </div>
    </section>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function AparenciaSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-ink-muted">Aparência</h2>
      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="mb-3 text-xs text-ink-muted">
          Vale pra essa conta em qualquer aparelho que você entrar, não só neste.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-xs font-medium transition-colors ${
                theme === value
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-ink-muted"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstalarAppSection() {
  const { canInstall, isStandalone, isIos, promptInstall } = useInstallPrompt();

  if (isStandalone) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Smartphone size={16} />
        Instalar app
      </h2>
      <div className="rounded-card bg-surface shadow-card p-4">
        {canInstall ? (
          <>
            <p className="mb-3 text-xs text-ink-muted">
              Instale o Projeto Dinheiro na tela inicial pra abrir direto, sem navegador.
            </p>
            <button onClick={promptInstall} className={SAVE_BUTTON_CLASS}>
              Instalar
            </button>
          </>
        ) : isIos ? (
          <p className="text-xs text-ink-muted">
            No Safari, toque no ícone de compartilhar e escolha &ldquo;Adicionar à Tela de
            Início&rdquo;.
          </p>
        ) : (
          <p className="text-xs text-ink-muted">
            Seu navegador ainda não ofereceu a instalação. Procure &ldquo;Instalar app&rdquo; ou
            &ldquo;Adicionar à tela inicial&rdquo; no menu dele.
          </p>
        )}
      </div>
    </section>
  );
}

function DadosSection() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      const data = await buildBackup(user.uid);
      downloadBackup(data);
      toast.success("Backup baixado.");
    } catch {
      toast.error("Não foi possível gerar o backup.");
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      if (data.version !== 1 || !data.collections) {
        throw new Error("Esse arquivo não parece um backup do Projeto Dinheiro.");
      }
      const { total } = await importBackup(user.uid, data);
      toast.success(`${total} itens importados.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o arquivo.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Database size={16} />
        Dados
      </h2>
      <div className="flex flex-col gap-4 rounded-card bg-surface shadow-card p-4">
        <div>
          <p className="text-sm font-medium">Baixar backup</p>
          <p className="mb-2 mt-0.5 text-xs text-ink-muted">
            Um arquivo com tudo — transações, bancos, caixinhas, investimentos e mais.
          </p>
          <button onClick={handleExport} disabled={exporting} className={SAVE_BUTTON_CLASS}>
            {exporting ? "Gerando…" : "Baixar backup"}
          </button>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium">Importar backup</p>
          <p className="mb-2 mt-0.5 text-xs text-ink-muted">
            Adiciona os dados de um arquivo à sua conta atual — não substitui nada, então evite
            importar o mesmo arquivo duas vezes.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-2xl border border-border px-4 py-3 text-sm font-medium text-ink-muted transition-transform active:scale-95 hover:bg-bg disabled:opacity-50"
          >
            {importing ? "Importando…" : "Escolher arquivo…"}
          </button>
        </div>
      </div>
    </section>
  );
}

function SegurancaSection() {
  const { user, hasPasswordProvider, resetPassword } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);

  async function handleResetPassword() {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await resetPassword(user.email);
      toast.success("E-mail enviado — confira sua caixa de entrada.");
    } catch {
      toast.error("Não foi possível enviar o e-mail.");
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <ShieldCheck size={16} />
        Segurança
      </h2>
      <div className="flex flex-col gap-4 rounded-card bg-surface shadow-card p-4">
        <div>
          <p className="text-sm font-medium">Senha</p>
          {hasPasswordProvider ? (
            <>
              <p className="mb-2 mt-0.5 text-xs text-ink-muted">
                Enviamos um link de redefinição para {user?.email}.
              </p>
              <button
                onClick={handleResetPassword}
                disabled={sendingReset}
                className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-ink-muted transition-transform active:scale-95 hover:bg-bg disabled:opacity-50"
              >
                {sendingReset ? "Enviando…" : "Enviar e-mail para trocar senha"}
              </button>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-ink-muted">
              Você entra com o Google — não tem senha própria pra trocar aqui.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <AppLockSettings />
        </div>
      </div>
    </section>
  );
}

function AppLockSettings() {
  const { user } = useAuth();
  // Seguro ler o uid aqui (sem efeito) porque este componente só é montado
  // dentro do layout protegido, que já garante `user` resolvido antes de
  // renderizar a página de Ajustes.
  const [enabled, setEnabled] = useState(() => (user ? isAppLockEnabled(user.uid) : false));
  const [hasBio, setHasBio] = useState(() => (user ? hasBiometricCredential(user.uid) : false));
  const [settingPin, setSettingPin] = useState(false);
  const bioAvailable = supportsBiometric();

  if (!user) return null;
  const uid = user.uid;
  const email = user.email;

  function handleToggle() {
    if (enabled) {
      disableAppLock(uid);
      setEnabled(false);
      setHasBio(false);
      toast.success("Bloqueio desativado.");
    } else {
      setSettingPin(true);
    }
  }

  async function handlePinSet(pin: string) {
    await setAppLockPin(uid, pin);
    setEnabled(true);
    setSettingPin(false);
    toast.success("Bloqueio ativado.");
  }

  async function handleEnableBiometric() {
    const ok = await registerBiometric(uid, email ?? "usuário");
    if (ok) {
      setHasBio(true);
      toast.success("Biometria ativada.");
    } else {
      toast.error("Não foi possível ativar a biometria neste aparelho.");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Bloqueio do app</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Pede um PIN (e biometria, se quiser) pra abrir o app neste aparelho. É uma trava
            rápida, não uma senha de conta.
          </p>
        </div>
        <ToggleSwitch checked={enabled} onChange={handleToggle} />
      </div>

      {enabled && bioAvailable && (
        <button
          type="button"
          onClick={handleEnableBiometric}
          disabled={hasBio}
          className="mt-3 flex items-center gap-2 text-sm font-medium text-accent-strong transition-transform active:scale-95 disabled:text-ink-muted"
        >
          <Fingerprint size={16} />
          {hasBio ? "Biometria ativada" : "Ativar biometria também"}
        </button>
      )}

      <SetPinSheet open={settingPin} onConfirm={handlePinSet} onClose={() => setSettingPin(false)} />
    </>
  );
}

function SetPinSheet({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: (pin: string) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {open && <SetPinFields key={String(open)} onConfirm={onConfirm} onClose={onClose} />}
    </BottomSheet>
  );
}

const PIN_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function SetPinFields({
  onConfirm,
  onClose,
}: {
  onConfirm: (pin: string) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"criar" | "confirmar">("criar");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleDigit(d: string) {
    setError(false);
    if (step === "criar") {
      if (pin.length >= 4) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 4) setStep("confirmar");
      return;
    }
    if (confirmPin.length >= 4) return;
    const next = confirmPin + d;
    setConfirmPin(next);
    if (next.length === 4) {
      if (next === pin) {
        void save(next);
      } else {
        setError(true);
        setConfirmPin("");
      }
    }
  }

  async function save(finalPin: string) {
    setSaving(true);
    try {
      await onConfirm(finalPin);
    } finally {
      setSaving(false);
    }
  }

  function handleBackspace() {
    if (step === "criar") setPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  }

  const current = step === "criar" ? pin : confirmPin;

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <p className="text-sm font-medium">
        {step === "criar" ? "Crie um PIN de 4 dígitos" : "Digite de novo pra confirmar"}
      </p>
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={`size-3.5 rounded-full border transition-colors ${
              error ? "border-negative bg-negative" : i < current.length ? "border-accent bg-accent" : "border-border"
            }`}
          />
        ))}
      </div>
      {error && <p className="text-xs text-negative">Os PINs não bateram, tenta de novo</p>}

      <div className="grid grid-cols-3 gap-4">
        {PIN_DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            disabled={saving}
            className="flex size-14 items-center justify-center rounded-full text-xl font-medium text-ink transition-transform active:scale-90 hover:bg-bg"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => handleDigit("0")}
          disabled={saving}
          className="flex size-14 items-center justify-center rounded-full text-xl font-medium text-ink transition-transform active:scale-90 hover:bg-bg"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          disabled={saving}
          aria-label="Apagar"
          className="flex size-14 items-center justify-center rounded-full text-ink-muted transition-transform active:scale-90 hover:bg-bg"
        >
          <Delete size={18} />
        </button>
      </div>

      <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:underline">
        Cancelar
      </button>
    </div>
  );
}

const FEEDBACK_TIPO_OPTIONS: { value: FeedbackTipo; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "sugestao", label: "Sugestão" },
  { value: "elogio", label: "Elogio" },
  { value: "outro", label: "Outro" },
];

function FeedbackSection() {
  const { sendFeedback } = useFeedback();
  const [tipo, setTipo] = useState<FeedbackTipo>("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!mensagem.trim()) {
      toast.error("Escreva sua mensagem antes de enviar.");
      return;
    }
    setSending(true);
    try {
      await sendFeedback(tipo, mensagem.trim());
      toast.success("Feedback enviado. Obrigado!");
      setMensagem("");
      setTipo("sugestao");
    } catch {
      toast.error("Não foi possível enviar. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <MessageSquareText size={16} />
        Feedback
      </h2>
      <div className="flex flex-col gap-3 rounded-card bg-surface shadow-card p-4">
        <p className="text-xs text-ink-muted">
          Achou um bug, tem uma sugestão ou só quer mandar um elogio? Vai direto pra administração.
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {FEEDBACK_TIPO_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipo(value)}
              className={`rounded-2xl border px-2 py-2 text-[11px] font-medium transition-colors ${
                tipo === value
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={mensagem}
          onChange={(event) => setMensagem(event.target.value)}
          placeholder="Conte com detalhes o que aconteceu ou o que você gostaria de ver..."
          rows={4}
          className={`${INPUT_CLASS} resize-none`}
        />
        <button onClick={handleSend} disabled={sending} className={SAVE_BUTTON_CLASS}>
          {sending ? "Enviando…" : "Enviar feedback"}
        </button>
      </div>
    </section>
  );
}

/**
 * Só aparece depois que a conta descobre o easter egg pela primeira vez
 * (jogoDesbloqueado) — antes disso, o único jeito de achar é o "?" escondido
 * no fim da seção Conta. Uma vez descoberto, não faz mais sentido escondê-lo.
 */
function EasterEggSection() {
  const router = useRouter();
  const { jogoDesbloqueado, jogoAtalhoMenu, setJogoAtalhoMenu } = useAccountPreferences();

  if (!jogoDesbloqueado) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Gamepad2 size={16} />
        Cifrão Voador
      </h2>
      <div className="rounded-card bg-surface shadow-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <BirdIcon size={26} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Aquele joguinho escondido</p>
            <p className="text-xs text-ink-muted">Você já descobriu — jogue quando quiser.</p>
          </div>
        </div>

        <button
          onClick={() => router.push("/jogo")}
          className={`mt-3 w-full ${SAVE_BUTTON_CLASS}`}
        >
          Jogar
        </button>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="min-w-0 pr-3">
            <p className="text-sm text-ink">Atalho no menu lateral</p>
            <p className="text-xs text-ink-muted">Adiciona &ldquo;Jogo&rdquo; na navegação, do lado do resto.</p>
          </div>
          <ToggleSwitch checked={jogoAtalhoMenu} onChange={() => setJogoAtalhoMenu(!jogoAtalhoMenu)} />
        </div>
      </div>
    </section>
  );
}

function ContaSection() {
  const { user, nickname, signOut, updateNickname } = useAuth();
  const [apelido, setApelido] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveApelido() {
    setSaving(true);
    try {
      await updateNickname(apelido);
      toast.success("Apelido atualizado.");
    } catch {
      toast.error("Não foi possível salvar o apelido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-ink-muted">Conta</h2>
      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="mb-3 truncate text-sm text-ink-muted">{user?.email}</p>

        <label className="mb-3 flex flex-col gap-1 text-xs text-ink-muted">
          Apelido (aparece no topo da tela)
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Como quer ser chamado"
              value={apelido}
              onChange={(event) => setApelido(event.target.value)}
              className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT} text-ink`}
            />
            <button
              onClick={handleSaveApelido}
              disabled={saving || apelido.trim() === (nickname ?? "")}
              className="shrink-0 rounded-2xl bg-accent px-4 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </label>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm font-medium text-negative transition-transform active:scale-95"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>

      <div className="mt-3 rounded-card border border-negative bg-negative-soft p-4">
        <p className="text-sm font-medium text-negative">Zona de perigo</p>
        <p className="mb-3 mt-0.5 text-xs text-ink-muted">
          Exclui sua conta e todos os seus dados — bancos, transações, investimentos, tudo. Não
          tem como desfazer.
        </p>
        <button
          onClick={() => setDeleting(true)}
          className="rounded-2xl border border-negative px-4 py-2.5 text-sm font-medium text-negative transition-transform active:scale-95 hover:bg-negative-soft"
        >
          Excluir conta
        </button>
      </div>

      <SecretGameTrigger />

      <DeleteAccountSheet open={deleting} onClose={() => setDeleting(false)} />
    </section>
  );
}

const RAPID_CLICK_WINDOW_MS = 900;
const RAPID_CLICKS_NEEDED = 5;

/**
 * Easter egg: "?" quase invisível no fim de Ajustes. 5 cliques dentro de uma
 * janela de 600ms (contados a partir do clique mais recente, então cliques
 * lentos não acumulam) abrem o jogo escondido em /jogo. Cada clique dá um
 * leve pulso de escala/opacidade, mesmo sem completar a sequência.
 */
function SecretGameTrigger() {
  const router = useRouter();
  const { jogoDesbloqueado } = useAccountPreferences();
  const clicksRef = useRef<number[]>([]);
  const controls = useAnimationControls();

  // Depois que a conta acha o jogo uma vez, o "?" escondido não faz mais
  // sentido — a EasterEggSection (logo abaixo do Feedback) assume o posto.
  if (jogoDesbloqueado) return null;

  function handleClick() {
    const now = Date.now();
    const recent = [...clicksRef.current, now].filter((t) => now - t < RAPID_CLICK_WINDOW_MS);
    clicksRef.current = recent;
    controls.start(
      { scale: [1, 1.4, 1], opacity: [0.35, 0.8, 0.35] },
      { duration: 0.4, ease: "easeOut" },
    );
    if (recent.length >= RAPID_CLICKS_NEEDED) {
      clicksRef.current = [];
      router.push("/jogo");
    }
  }

  return (
    <div className="mt-6 flex justify-center pb-2">
      <motion.button
        type="button"
        onClick={handleClick}
        animate={controls}
        initial={{ opacity: 0.35, scale: 1 }}
        aria-hidden="true"
        tabIndex={-1}
        className="select-none p-3 text-base text-ink-muted"
      >
        ?
      </motion.button>
    </div>
  );
}

function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {open && <DeleteAccountFields onClose={onClose} />}
    </BottomSheet>
  );
}

function DeleteAccountFields({ onClose }: { onClose: () => void }) {
  const { user, hasPasswordProvider, reauthenticateWithPassword, reauthenticateWithGoogle, deleteAccount } =
    useAuth();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const dataDeletedRef = useRef(false);

  const canConfirm = confirmText.trim().toLowerCase() === "excluir";

  async function finishDeletion() {
    if (!user) return;
    setDeleting(true);
    try {
      if (!dataDeletedRef.current) {
        await deleteAllUserData(user.uid);
        dataDeletedRef.current = true;
      }
      await deleteAccount();
      toast.success("Conta excluída.");
      router.replace("/login");
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "auth/requires-recent-login") {
        setNeedsReauth(true);
      } else {
        toast.error("Não foi possível excluir a conta. Tente novamente.");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleReauthAndDelete() {
    setDeleting(true);
    try {
      if (hasPasswordProvider) {
        await reauthenticateWithPassword(reauthPassword);
      } else {
        await reauthenticateWithGoogle();
      }
      setNeedsReauth(false);
      await finishDeletion();
    } catch {
      toast.error("Não foi possível confirmar sua identidade.");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-negative">Excluir conta permanentemente</p>
      <p className="text-xs text-ink-muted">
        Isso apaga tudo — transações, bancos, caixinhas, investimentos, assinaturas — e encerra
        seu login. Se quiser guardar seus dados antes, baixe um backup em Ajustes → Dados.
      </p>

      {!needsReauth ? (
        <>
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            Digite &ldquo;excluir&rdquo; para confirmar
            <input
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="excluir"
              className={INPUT_CLASS}
            />
          </label>
          <button
            onClick={finishDeletion}
            disabled={!canConfirm || deleting}
            className="rounded-2xl bg-negative px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? "Excluindo…" : "Excluir conta permanentemente"}
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl bg-bg p-3">
          <p className="text-xs text-ink-muted">
            Por segurança, confirme sua identidade de novo antes de excluir.
          </p>
          {hasPasswordProvider ? (
            <>
              <input
                type="password"
                placeholder="Sua senha"
                value={reauthPassword}
                onChange={(event) => setReauthPassword(event.target.value)}
                className={INPUT_CLASS}
              />
              <button
                onClick={handleReauthAndDelete}
                disabled={deleting || !reauthPassword}
                className="rounded-2xl bg-negative px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
              >
                Confirmar e excluir
              </button>
            </>
          ) : (
            <button
              onClick={handleReauthAndDelete}
              disabled={deleting}
              className="rounded-2xl bg-negative px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
            >
              Confirmar com Google e excluir
            </button>
          )}
        </div>
      )}

      <button onClick={onClose} className="text-sm text-ink-muted hover:underline">
        Cancelar
      </button>
    </div>
  );
}
