import { AnimatePresence } from "motion/react";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { TransactionListItem } from "@/app/_components/TransactionListItem";
import type { Transaction } from "@/lib/types";

export function RecentTransactions({
  transactions,
  onDelete,
  colorByCategoria,
  iconByCategoria,
  bankNameById,
  originDateById,
}: {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  bankNameById: Map<string, string>;
  originDateById?: Map<string, string>;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhuma transação ainda"
        description="Toque no botão + para registrar sua primeira receita ou despesa."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {transactions.slice(0, 5).map((transaction) => (
          <TransactionListItem
            key={transaction.id}
            transaction={transaction}
            onDelete={onDelete}
            colorByCategoria={colorByCategoria}
            iconByCategoria={iconByCategoria}
            bankNameById={bankNameById}
            originDateById={originDateById}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
