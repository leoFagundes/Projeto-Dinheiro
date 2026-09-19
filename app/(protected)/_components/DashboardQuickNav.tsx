"use client";

const SECTIONS = [
  { id: "bancos", label: "Bancos" },
  { id: "caixinhas", label: "Caixinhas" },
  { id: "investimentos", label: "Investimentos" },
  { id: "analises", label: "Análises" },
  { id: "metas", label: "Limites" },
];

export function DashboardQuickNav() {
  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none">
      {SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollToSection(id)}
          className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-transform active:scale-95 hover:bg-bg hover:text-ink"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
