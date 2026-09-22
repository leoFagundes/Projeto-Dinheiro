"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

/** Anima um número até o valor alvo (count-up/down) em vez de trocar de uma vez. */
export function useAnimatedNumber(target: number, duration = 0.6): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    if (displayRef.current === target) return;
    const controls = animate(displayRef.current, target, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        displayRef.current = latest;
        setDisplay(latest);
      },
    });
    return () => controls.stop();
  }, [target, duration]);

  return display;
}
