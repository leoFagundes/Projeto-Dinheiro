"use client";

import { useEffect, useRef } from "react";

/**
 * Fecha um modal/sheet ao pressionar Esc ou o botão "voltar" do navegador
 * (importante no PWA instalado, onde o gesto/botão de voltar do Android é o
 * caminho natural para fechar algo em vez de sair do app).
 */
export function useDismissable(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    function handlePopState() {
      pushedRef.current = false;
      onCloseRef.current();
    }

    window.history.pushState({ dismissable: true }, "");
    pushedRef.current = true;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [open]);
}
