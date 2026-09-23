"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { TransactionFormSheet } from "./TransactionFormSheet";

export function AddTransactionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        aria-label="Adicionar transação"
        whileTap={{ scale: 0.92 }}
        className="fixed right-5 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-colors hover:bg-accent-strong"
        style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
      >
        <Plus size={26} />
      </motion.button>

      <TransactionFormSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
