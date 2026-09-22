import Link from "next/link";
import { CalendarClock, Repeat } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { Money } from "@/app/_components/Money";
import { categoryKey, FALLBACK_CATEGORY_COLOR, FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { CalendarEvent } from "@/lib/derived";

export function UpcomingEvents({
  events,
  colorByCategoria,
  iconByCategoria,
  bankNameById,
}: {
  events: CalendarEvent[];
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  bankNameById: Map<string, string>;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nada previsto pros próximos dias"
        description="Assinaturas, salário e outras recorrências aparecem aqui quando estiverem próximas."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {events.map((event) => {
          const signedValue = event.tipo === "receita" ? event.valor : -event.valor;
          const categoriaKey = categoryKey(event.tipo, event.categoria);
          const categoriaColor = colorByCategoria.get(categoriaKey) ?? FALLBACK_CATEGORY_COLOR;
          const categoriaIcon = iconByCategoria.get(categoriaKey) ?? FALLBACK_CATEGORY_ICON;
          const bancoNome = event.bancoId ? bankNameById.get(event.bancoId) : undefined;
          return (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 rounded-card bg-surface shadow-card px-4 py-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: `${categoriaColor}22` }}
                >
                  {categoriaIcon}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate font-medium">
                    {event.recorrente && (
                      <Repeat size={12} className="shrink-0 text-ink-muted" aria-label="Recorrente" />
                    )}
                    <span className="truncate">{event.descricao}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                    {event.categoria} · {formatDate(event.data)}
                    {event.origem === "recorrencia" ? " · previsto" : ""}
                    {event.parcelaTotal
                      ? ` · parcela ${event.parcelaAtual}/${event.parcelaTotal}`
                      : ""}
                    {bancoNome && (
                      <span className="rounded-full bg-bg px-1.5 py-0.5 text-[11px]">
                        {bancoNome}
                        {event.formaPagamento === "debito" ? " · débito" : ""}
                      </span>
                    )}
                  </span>
                </span>
              </span>
              <Money value={signedValue} className="shrink-0 font-medium" />
            </li>
          );
        })}
      </ul>

      <Link
        href="/calendario"
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        Ver calendário completo
      </Link>
    </div>
  );
}
