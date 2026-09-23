"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useDismissable } from "@/lib/use-dismissable";

type HelpSection = {
  titulo: string;
  texto: string;
  imagem: string;
};

type HelpTab = {
  id: string;
  label: string;
  sections: HelpSection[];
};

const TABS: HelpTab[] = [
  {
    id: "visao-geral",
    label: "Visão geral",
    sections: [
      {
        titulo: "O painel principal",
        texto:
          'O Patrimônio é tudo que você tem (contas + caixinhas + investimentos) menos o que você deve (fatura + saldo anterior). "Livres depois de pagar as faturas" é só o dinheiro em conta descontando as faturas — o que sobra de verdade pra gastar. "Saldo projetado do mês" soma o que já entrou/saiu com o que ainda está previsto até o fim do mês. Logo abaixo, "Próximos 7 dias" e "Últimas transações" dividem o mesmo espaço em abas — toque pra trocar. Se você tiver algum empréstimo ativo, uma seção "Empréstimos" aparece automaticamente entre Bancos e Análises.',
        imagem: "/images/examples/tutorial-01-dashboard.png",
      },
    ],
  },
  {
    id: "transacoes",
    label: "Transações e assinaturas",
    sections: [
      {
        titulo: "Criando uma transação",
        texto:
          'Toque no + pra lançar uma despesa ou receita. Vincular um banco e marcar crédito faz o valor entrar na fatura (cobrado depois); débito tira na hora do saldo em conta. Marcar "Repetir" transforma essa transação numa assinatura, mensal ou anual.',
        imagem: "/images/examples/tutorial-02-nova-transacao.png",
      },
      {
        titulo: "Parcelando uma compra",
        texto:
          'Compras no crédito vinculadas a um banco podem ser parceladas — o app já lança todas as parcelas nos meses seguintes. Se a compra já estava em andamento (ex: você já pagou 3 das 10 parcelas em outro controle), use "a partir da parcela" pra começar do número certo.',
        imagem: "/images/examples/tutorial-03-parcelar.png",
      },
      {
        titulo: "Gerenciando assinaturas",
        texto:
          "Em Configurações → Assinaturas você vê tudo que se repete, quanto está comprometido por mês/ano, e pode Ajustar (muda o valor só dali pra frente, sem mexer no que já passou), Parar (fica pausada, dá pra reativar depois) ou Excluir (remove de vez).",
        imagem: "/images/examples/tutorial-04-assinaturas.png",
      },
    ],
  },
  {
    id: "bancos",
    label: "Bancos",
    sections: [
      {
        titulo: "Bancos no Dashboard",
        texto:
          "Cada banco mostra o saldo em conta (o que tem disponível) e a fatura do mês (o que já foi gasto no crédito e ainda não foi pago). Use as setinhas pra ver a fatura de meses passados ou futuros — útil pra conferir compras parceladas que ainda vão chegar. Toque no valor da fatura pra abrir todos os itens dela num modal — dá pra editar ou excluir qualquer um ali mesmo, sem sair da tela.",
        imagem: "/images/examples/tutorial-05-bancos-dashboard.png",
      },
      {
        titulo: "Corrigindo saldo e fatura na mão",
        texto:
          'Se o app não bateu com a realidade, edite o banco em Configurações e digite o valor que está certo HOJE nesses três campos. O app calcula a diferença sozinho e ajusta por trás — nunca duplica nem apaga nada do que já foi rastreado. O campo "Dia de fechamento da fatura" (opcional) faz compras no crédito feitas depois desse dia caírem automaticamente na fatura do mês seguinte, em vez do mês corrente — inclusive pra compras já lançadas antes de configurar.',
        imagem: "/images/examples/tutorial-06-banco-editar.png",
      },
    ],
  },
  {
    id: "emprestimos",
    label: "Empréstimos",
    sections: [
      {
        titulo: "Registrando um empréstimo",
        texto:
          'Ao criar uma transação, a aba "Empréstimo" (ao lado de Despesa/Receita) pede o valor que você vai receber, a data em que ele cai na conta, o valor total a pagar (com juros, se houver), em quantas vezes e a data da 1ª parcela. O app lança a receita do valor recebido e todas as parcelas de uma vez — sempre no débito, pra cada uma só sair da conta no dia dela.',
        imagem: "/images/examples/tutorial-13-emprestimo-criar.png",
      },
      {
        titulo: "Acompanhando e pagando parcelas",
        texto:
          'Se você tem algum empréstimo, uma seção "Empréstimos" aparece na tela inicial com o progresso de cada um. Toque pra abrir todas as parcelas e pagar qualquer uma, em qualquer ordem — se pagar antes do combinado pode sair mais barato, se pagar depois pode vir com multa/juros, então o valor e a data são editáveis na hora de confirmar o pagamento. Dá pra desfazer um pagamento registrado errado a qualquer momento.',
        imagem: "/images/examples/tutorial-14-emprestimos-dashboard.png",
      },
    ],
  },
  {
    id: "caixinhas",
    label: "Caixinhas",
    sections: [
      {
        titulo: "Guardando e rendendo",
        texto:
          "Toque numa caixinha pra Adicionar ou Retirar (pode vincular a um banco, pra sair/voltar do saldo em conta) ou registrar Rendimento. Rendimento não é um novo depósito — é você informando o saldo real de hoje (depois de render juros), e o app calcula a diferença.",
        imagem: "/images/examples/tutorial-07-caixinha.png",
      },
    ],
  },
  {
    id: "investimentos",
    label: "Investimentos",
    sections: [
      {
        titulo: "Sua carteira",
        texto:
          "A aba Investimentos (ícone na barra de baixo) mostra o resumo completo: valor investido, valor atual, composição por tipo (ações, FIIs, renda fixa), aportes por mês e a evolução acumulada ao longo do tempo.",
        imagem: "/images/examples/tutorial-08-investimentos-pagina.png",
      },
      {
        titulo: "Metas da carteira",
        texto:
          "Defina quantas metas quiser pro valor total da carteira (ex: R$5.000, R$10.000...). Assim que o valor atual alcança uma meta, ela fica destacada como concluída — sem deixar de contar as outras que ainda faltam.",
        imagem: "/images/examples/tutorial-09-investimento-metas.png",
      },
    ],
  },
  {
    id: "historico",
    label: "Histórico e Calendário",
    sections: [
      {
        titulo: "Filtrando e buscando",
        texto:
          "Use os chips pra filtrar por tipo (receita, despesa, transferência, fatura...) e os seletores de categoria/forma de pagamento pra refinar ainda mais. A busca ignora o mês selecionado e procura em tudo. Navegando pros próximos meses, você já vê as cobranças previstas das suas assinaturas.",
        imagem: "/images/examples/tutorial-10-historico.png",
      },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações e privacidade",
    sections: [
      {
        titulo: "Ocultando itens",
        texto:
          "O ícone de olho ao lado de um banco, caixinha ou investimento tira ele da tela inicial pra deixar tudo mais enxuto — mas continua contando no patrimônio normalmente e disponível pra escolher em transações.",
        imagem: "/images/examples/tutorial-11-config-ocultar.png",
      },
      {
        titulo: "O cabeçalho do app",
        texto:
          "No topo: seu apelido (edite em Configurações → Conta), o olho pra esconder valores em dinheiro na tela (bom pra usar em público), este ícone de ajuda, e o botão de sair.",
        imagem: "/images/examples/tutorial-12-header.png",
      },
    ],
  },
];

export function HelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tabId, setTabId] = useState(TABS[0].id);
  useDismissable(open, onClose);

  const activeTab = TABS.find((t) => t.id === tabId) ?? TABS[0];

  // HelpModal só é montado depois que o layout resolve a autenticação (o
  // ProtectedLayout retorna null até lá), então essa renderização nunca
  // acontece no servidor — não precisa de um efeito "montei no cliente" só
  // pra evitar acessar `document` durante SSR.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center overflow-hidden bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            className="flex h-dvh w-full max-w-md min-w-0 flex-col overflow-hidden bg-surface"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <p className="font-semibold">Como funciona o app</p>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex shrink-0 gap-2 overflow-x-auto px-5 py-3 scrollbar-none">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTabId(t.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-transform active:scale-95 ${
                    tabId === t.id
                      ? "border-accent bg-accent-soft text-accent-strong"
                      : "border-border bg-bg text-ink-muted hover:bg-surface"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-border px-5 py-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tabId}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex min-w-0 flex-col gap-6"
                >
                  {activeTab.sections.map((section) => (
                    <div key={section.titulo}>
                      <p className="mb-1.5 font-medium">{section.titulo}</p>
                      <p className="mb-3 text-sm text-ink-muted">{section.texto}</p>
                      <div className="w-full overflow-hidden rounded-2xl border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element -- capturas
                        de tela do usuário com tamanho/proporção variável; next/image com
                        largura desconhecida (width=0) renderiza no tamanho nativo do
                        arquivo antes do CSS entrar, estourando a largura no mobile. */}
                        <img
                          src={section.imagem}
                          alt={section.titulo}
                          className="block h-auto max-w-full"
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
