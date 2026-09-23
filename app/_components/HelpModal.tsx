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
          "No celular, toque no ícone de menu (☰) no topo pra abrir a navegação lateral. Em telas largas, ela já fica fixa na esquerda. As abas são: Dashboard, Histórico, Investir, Caixinhas, Agenda, Bancos, Assinaturas e Ajustes. Tocar na logo/nome do app sempre leva pro Dashboard.",
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
          'O Patrimônio é tudo que você tem (contas + caixinhas + investimentos) menos o que você deve (fatura + saldo anterior). "Livres depois de pagar as faturas" é só o dinheiro em conta descontando as faturas — o que sobra de verdade pra gastar. "Saldo projetado do mês" soma o que já entrou/saiu com o que ainda está previsto até o fim do mês.',
      },
      {
        titulo: "Atividade, bancos e empréstimos",
        texto:
          '"Próximos 7 dias" e "Últimas transações" dividem o mesmo espaço em abas — toque pra trocar. Logo abaixo, um resumo dos seus bancos. Se você tiver algum empréstimo ativo, uma seção "Empréstimos" aparece automaticamente entre Bancos e Análises.',
      },
      {
        titulo: "Análises e limites por categoria",
        texto:
          "Mais embaixo ficam os gráficos de evolução do patrimônio e de gastos por categoria, e a seção de limites mensais por categoria (definidos em Ajustes → Categorias, junto com uma meta), mostrando quanto já foi usado de cada um.",
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
          'Toque no botão + (flutuante, no canto da tela) pra lançar uma despesa ou receita. Vincular um banco e marcar crédito faz o valor entrar na fatura (cobrado depois); débito tira na hora do saldo em conta. Marcar "Repetir" transforma essa transação numa assinatura, mensal ou anual.',
      },
      {
        titulo: "Parcelando uma compra",
        texto:
          'Compras no crédito vinculadas a um banco podem ser parceladas — o app já lança todas as parcelas nos meses seguintes. Se a compra já estava em andamento (ex: você já pagou 3 das 10 parcelas em outro controle), use "a partir da parcela" pra começar do número certo.',
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
    id: "bancos",
    label: "Bancos",
    sections: [
      {
        titulo: "Bancos no Dashboard e na aba Bancos",
        texto:
          "Cada banco mostra o saldo em conta (o que tem disponível) e a fatura do mês (o que já foi gasto no crédito e ainda não foi pago). Use as setinhas pra ver a fatura de meses passados ou futuros — útil pra conferir compras parceladas que ainda vão chegar. Toque no valor da fatura pra abrir todos os itens dela num modal — dá pra editar ou excluir qualquer um ali mesmo, sem sair da tela.",
      },
      {
        titulo: "Corrigindo saldo e fatura na mão",
        texto:
          'Se o app não bateu com a realidade, edite o banco na aba Bancos e digite o valor que está certo HOJE nesses três campos. O app calcula a diferença sozinho e ajusta por trás — nunca duplica nem apaga nada do que já foi rastreado. O campo "Dia de fechamento da fatura" (opcional) faz compras no crédito feitas depois desse dia caírem automaticamente na fatura do mês seguinte, em vez do mês corrente — inclusive pra compras já lançadas antes de configurar.',
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
          "Toque numa caixinha pra Adicionar ou Retirar (pode vincular a um banco, pra sair/voltar do saldo em conta) ou registrar Rendimento. Rendimento não é um novo depósito — é você informando o saldo real de hoje (depois de render juros), e o app calcula a diferença. O total guardado em todas as caixinhas aparece resumido no topo da aba.",
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
          "Use os chips pra filtrar por tipo (receita, despesa, transferência, fatura...) e os seletores de categoria/forma de pagamento pra refinar ainda mais. A busca ignora o mês selecionado e procura em tudo.",
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
          "Ative os avisos de fatura/assinatura próxima do vencimento (pede permissão de notificação do navegador). Se seu navegador suportar, também dá pra instalar o app na tela inicial do aparelho — funciona offline como um app nativo.",
      },
      {
        titulo: "Backup, exportar e importar",
        texto:
          "Baixe um backup completo dos seus dados (transações, bancos, caixinhas, investimentos e mais) a qualquer momento em Ajustes → Dados. O mesmo arquivo pode ser importado depois — a importação sempre adiciona dados novos, nunca substitui ou deduplica, então evite importar o mesmo arquivo duas vezes.",
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
