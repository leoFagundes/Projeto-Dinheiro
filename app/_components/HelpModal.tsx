"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useDismissable } from "@/lib/use-dismissable";

type HelpSection = {
  titulo: string;
  texto: string;
};

type HelpTab = {
  id: string;
  label: string;
  sections: HelpSection[];
};

const TABS: HelpTab[] = [
  {
    id: "navegacao",
    label: "Navegação",
    sections: [
      {
        titulo: "Menu e sidebar",
        texto:
          "No celular, toque no ícone de menu (☰) no topo pra abrir a navegação lateral. Em telas largas, ela já fica fixa na esquerda. As abas são: Dashboard, Análises, Histórico, Investir, Caixinhas, Agenda, Assinaturas e Ajustes. Tocar na logo/nome do app sempre leva pro Dashboard.",
      },
      {
        titulo: "Tema claro e escuro",
        texto:
          "Em Ajustes → Aparência você escolhe entre Claro, Escuro ou Sistema (segue o tema do seu aparelho). A escolha fica salva na sua conta, então vale em qualquer aparelho que você entrar.",
      },
      {
        titulo: "Ocultar valores",
        texto:
          "O ícone de olho no topo esconde todos os valores em dinheiro da tela (útil em público) sem afetar nada nos seus dados — é só uma máscara visual.",
      },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    sections: [
      {
        titulo: "O painel principal",
        texto:
          'No topo, "Recebido no mês" e "Gasto no mês" mostram o que já entrou e saiu até hoje. Logo abaixo de cada um aparece o que ainda vai cair ou vencer até o fim do mês ("a receber"/"a pagar"). A setinha compara o gasto com o mesmo período do mês passado.',
      },
      {
        titulo: "Atividade e empréstimos",
        texto:
          '"Próximos 7 dias" e "Últimas transações" dividem o mesmo espaço em abas — toque pra trocar. Se você tiver algum empréstimo ativo, uma seção "Empréstimos" aparece logo abaixo.',
      },
      {
        titulo: "Análises e limites por categoria",
        texto:
          'Mais embaixo ficam os gastos do mês por categoria e a seção de limites mensais, mostrando quanto já foi usado e quanto ainda resta de cada um — a barra fica amarela quando passa de 85% ("perto do limite") e vermelha quando estoura. Toque numa categoria (no gráfico ou num limite) pra ver todas as transações dela no mês e editar ou excluir qualquer uma ali mesmo.',
      },
    ],
  },
  {
    id: "analises",
    label: "Análises",
    sections: [
      {
        titulo: "Semana, mês ou ano",
        texto:
          'Na aba Análises, escolha Semana, Mês ou Ano no topo e use as setas pra navegar entre períodos ("voltar para este mês" leva de volta pro atual). Tudo na tela segue o período escolhido.',
      },
      {
        titulo: "O que cada gráfico mostra",
        texto:
          'Os cards do topo mostram quanto entrou, quanto saiu, o saldo e o gasto médio por dia, com a comparação contra o mesmo ponto do período anterior. "Ritmo de gastos" compara o acumulado do período com o anterior, pra ver se você está gastando mais rápido. Depois vêm os gastos por dia (ou por mês, no ano), receitas x despesas dos últimos períodos e os maiores gastos.',
      },
      {
        titulo: "Detalhe de uma categoria",
        texto:
          "Toque em qualquer categoria (na lista ou na fatia do gráfico) pra abrir o detalhe: total no período, comparação com o anterior, os últimos períodos num gráfico e todas as transações dela — dá pra editar ou excluir direto por lá.",
      },
    ],
  },
  {
    id: "transacoes",
    label: "Transações",
    sections: [
      {
        titulo: "Criando uma transação",
        texto:
          'Toque no botão + (flutuante, no canto da tela) pra lançar uma despesa ou receita e escolha a categoria tocando nela. Não achou a categoria? Toque em "+ Nova" pra criar uma ali mesmo — ela já fica selecionada. Marcar "Repetir" transforma essa transação numa assinatura, mensal ou anual.',
      },
      {
        titulo: "Rascunho automático",
        texto:
          'Se você fechar o formulário no meio (ou até fechar o app), o que já estava preenchido continua lá quando você abrir de novo. Pra começar do zero, toque em "Limpar" no topo do formulário. Salvar a transação apaga o rascunho.',
      },
      {
        titulo: "Parcelando uma compra",
        texto:
          'Qualquer despesa nova pode ser parcelada — o app já lança todas as parcelas nos meses seguintes. Se a compra já estava em andamento (ex: você já pagou 3 das 10 parcelas em outro controle), use "a partir da parcela" pra começar do número certo.',
      },
      {
        titulo: "Excluindo uma transação",
        texto:
          'Transações simples (sem parcelamento, empréstimo ou recorrência) somem na hora e mostram um aviso com "Desfazer" por alguns segundos — dá tempo de arrepender. Transações mais complexas (parcelas, assinaturas, empréstimos) pedem confirmação antes, já que a exclusão pode afetar outras parcelas/lançamentos ligados a ela.',
      },
    ],
  },
  {
    id: "assinaturas",
    label: "Assinaturas",
    sections: [
      {
        titulo: "Gerenciando assinaturas",
        texto:
          "Na aba Assinaturas você vê tudo que se repete, quanto está comprometido por mês/ano, e pode Ajustar (muda o valor só dali pra frente, sem mexer no que já passou), Parar (fica pausada, dá pra reativar depois) ou Excluir (remove de vez).",
      },
      {
        titulo: "Aviso de vencimento",
        texto:
          "Se você ativar os avisos em Ajustes → Notificações, o app manda uma notificação quando uma assinatura (ou parcela de empréstimo) está prestes a vencer, nos próximos dias.",
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
          'Ao criar uma transação, a aba "Empréstimo" (ao lado de Despesa/Receita) pede o valor que você vai receber, a data em que recebeu, o valor total a pagar (com juros, se houver), em quantas vezes e a data da 1ª parcela. O app lança a receita do valor recebido e todas as parcelas mensais de uma vez.',
      },
      {
        titulo: "Acompanhando e pagando parcelas",
        texto:
          'Se você tem algum empréstimo, uma seção "Empréstimos" aparece na tela inicial com o progresso de cada um. Toque pra abrir todas as parcelas e pagar qualquer uma, em qualquer ordem — se pagar antes do combinado pode sair mais barato, se pagar depois pode vir com multa/juros, então o valor e a data são editáveis na hora de confirmar o pagamento. Dá pra desfazer um pagamento registrado errado a qualquer momento. Quitar o empréstimo inteiro vem com uma comemoração.',
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
          "Toque numa caixinha pra Adicionar, Retirar ou registrar Rendimento — tudo fica no histórico dela. Rendimento não é um novo depósito — é você informando o saldo real de hoje (depois de render juros), e o app calcula a diferença. O total guardado em todas as caixinhas aparece resumido no topo da aba.",
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
          "A aba Investir mostra o resumo completo: valor investido, valor atual, composição por tipo (ações, FIIs, renda fixa), aportes por mês e a evolução acumulada ao longo do tempo.",
      },
      {
        titulo: "Metas da carteira",
        texto:
          "Defina quantas metas quiser pro valor total da carteira (ex: R$5.000, R$10.000...). Assim que o valor atual alcança uma meta, ela fica destacada como concluída — sem deixar de contar as outras que ainda faltam.",
      },
    ],
  },
  {
    id: "historico",
    label: "Histórico e Agenda",
    sections: [
      {
        titulo: "Filtrando e buscando",
        texto:
          "A lista vem agrupada por dia, com o saldo de cada dia. Use os chips pra filtrar por tipo (receita, despesa, caixinha, investimento...) e o seletor de categoria pra refinar ainda mais. A busca ignora o mês selecionado e procura em tudo.",
      },
      {
        titulo: "Agenda",
        texto:
          "A aba Agenda mostra suas transações e cobranças previstas num calendário mensal. Navegando pros próximos meses, você já vê as cobranças previstas das suas assinaturas e parcelas futuras.",
      },
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    sections: [
      {
        titulo: "Categorias e orçamento",
        texto:
          "Em Ajustes você cria e edita categorias de receita/despesa (com ícone), define limites mensais por categoria e um orçamento mensal total — um teto único pra tudo que você gasta no mês, além dos limites individuais.",
      },
      {
        titulo: "Notificações e instalar o app",
        texto:
          "Ative os avisos de assinatura/parcela próxima do vencimento (pede permissão de notificação do navegador). Se seu navegador suportar, também dá pra instalar o app na tela inicial do aparelho — funciona offline como um app nativo.",
      },
      {
        titulo: "Backup, exportar e importar",
        texto:
          "Baixe um backup completo dos seus dados (transações, caixinhas, investimentos e mais) a qualquer momento em Ajustes → Dados. O mesmo arquivo pode ser importado depois — a importação sempre adiciona dados novos, nunca substitui ou deduplica, então evite importar o mesmo arquivo duas vezes.",
      },
      {
        titulo: "Segurança: senha, PIN e biometria",
        texto:
          "Troque sua senha (se você entrou com e-mail/senha) ou ative um bloqueio rápido do app neste aparelho com PIN de 4 dígitos e, se o aparelho suportar, digital/Face ID/Windows Hello. Esse bloqueio é local — fica só neste aparelho, não é a segurança da sua conta.",
      },
      {
        titulo: "Feedback",
        texto:
          "Encontrou um bug, tem uma sugestão ou quer mandar um elogio? Em Ajustes → Feedback dá pra enviar direto pra administração do app.",
      },
      {
        titulo: "Conta",
        texto:
          "Edite seu apelido, saia da conta (também disponível no rodapé do menu/sidebar) ou exclua sua conta permanentemente — a exclusão apaga todos os seus dados e pede que você digite \"excluir\" pra confirmar.",
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
                  className="flex min-w-0 flex-col gap-5"
                >
                  {activeTab.sections.map((section) => (
                    <div key={section.titulo}>
                      <p className="mb-1.5 font-medium">{section.titulo}</p>
                      <p className="text-sm text-ink-muted">{section.texto}</p>
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
