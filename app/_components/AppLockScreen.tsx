"use client";

import { useState } from "react";
import { Delete, Fingerprint, Lock } from "lucide-react";
import { hasBiometricCredential, verifyAppLockPin, verifyBiometric } from "@/lib/app-lock";

const PIN_LENGTH = 4;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function AppLockScreen({ uid, onUnlock }: { uid: string; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(false);

  async function submitPin(value: string) {
    const ok = await verifyAppLockPin(uid, value);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
    }
  }

  function handleDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return;
    setError(false);
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      submitPin(next);
    }
  }

  async function tryBiometric() {
    setCheckingBiometric(true);
    const ok = await verifyBiometric(uid);
    setCheckingBiometric(false);
    if (ok) onUnlock();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-bg px-6">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Lock size={24} />
        </span>
        <p className="text-sm text-ink-muted">Digite o PIN pra abrir o app</p>
        <div className="flex gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={`size-3.5 rounded-full border transition-colors ${
                error
                  ? "border-negative bg-negative"
                  : i < pin.length
                    ? "border-accent bg-accent"
                    : "border-border"
              }`}
            />
          ))}
        </div>
        {error && <p className="text-xs text-negative">PIN incorreto</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="flex size-14 items-center justify-center rounded-full text-xl font-medium text-ink transition-transform active:scale-90 hover:bg-surface"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => handleDigit("0")}
          className="flex size-14 items-center justify-center rounded-full text-xl font-medium text-ink transition-transform active:scale-90 hover:bg-surface"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setPin((p) => p.slice(0, -1))}
          aria-label="Apagar"
          className="flex size-14 items-center justify-center rounded-full text-ink-muted transition-transform active:scale-90 hover:bg-surface"
        >
          <Delete size={20} />
        </button>
      </div>

      {hasBiometricCredential(uid) && (
        <button
          type="button"
          onClick={tryBiometric}
          disabled={checkingBiometric}
          className="flex items-center gap-2 text-sm font-medium text-accent-strong transition-transform active:scale-95 disabled:opacity-60"
        >
          <Fingerprint size={18} />
          Usar biometria
        </button>
      )}
    </div>
  );
}
