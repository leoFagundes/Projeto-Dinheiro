/** Selinho discreto de "novo" — canto do elemento pai, que precisa de `relative`. */
export function NewBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1 size-2.5 rounded-full bg-negative ring-2 ring-surface"
    />
  );
}
