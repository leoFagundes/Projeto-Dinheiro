/** Peças dos modais de resumo (transação e demais movimentações do Histórico). */

export function DetailSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      {title && <p className="mb-2 text-xs font-medium text-ink-muted">{title}</p>}
      <dl className="divide-y divide-border rounded-2xl bg-bg">{children}</dl>
    </section>
  );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-right font-medium">{children}</dd>
    </div>
  );
}

/** Selo de situação ("Pago", "A receber"…) logo abaixo do valor. */
export function StatusPill({ tone, children }: { tone: "done" | "pending" | "neutral"; children: React.ReactNode }) {
  const toneClass =
    tone === "done"
      ? "bg-accent-soft text-accent-strong"
      : tone === "pending"
        ? "bg-warning-soft text-warning-strong"
        : "bg-bg text-ink-muted";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>{children}</span>;
}
