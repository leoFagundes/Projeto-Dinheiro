import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        <Icon size={22} />
      </div>
      <p className="font-medium">{title}</p>
      <p className="max-w-xs text-sm text-ink-muted">{description}</p>
    </div>
  );
}
