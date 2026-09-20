"use client";

import { useEffect, useRef } from "react";

/**
 * Fecha um modal/sheet ao pressionar Esc ou o botão "voltar" do navegador
 * (importante no PWA instalado, onde o gesto/botão de voltar do Android é o
 * caminho natural para fechar algo em vez de sair do app).
 */
let dismissableSeq = 0;

export function useDismissable(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    // Sheets aninhados (ex: emoji picker dentro de um form de edição) empilham
    // vários pushState — sem checar se o estado atual ainda é o nosso, o
    // popstate disparado pelo fechamento de UM deles fecharia todos os outros
    // que também estão escutando.
    function handlePopState() {
      if (window.history.state?.dismissableId === idRef.current) return;
      pushedRef.current = false;
      onCloseRef.current();
    }

    const id = ++dismissableSeq;
    idRef.current = id;
    window.history.pushState({ dismissable: true, dismissableId: id }, "");
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
