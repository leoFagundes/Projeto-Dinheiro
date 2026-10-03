import type { Transaction } from "./types";

export type OpcaoExclusao = {
  id: string;
  label: string;
  description?: string;
  itens: Transaction[];
  /** Também para a assinatura (o template) — sem apagar o template em si. */
  encerrarAssinaturaId?: string;
};

function porParcela(a: Transaction, b: Transaction): number {
  return (a.parcelaAtual ?? 0) - (b.parcelaAtual ?? 0);
}

/**
 * O que pode ser excluído junto com uma transação: só ela, ou o grupo a que
 * ela pertence (empréstimo, compra parcelada, assinatura). Uma transação
 * avulsa tem uma única opção — e aí exclui direto, sem perguntar.
 */
export function opcoesDeExclusao(t: Transaction, todas: Transaction[]): OpcaoExclusao[] {
  if (t.emprestimoId) {
    const doEmprestimo = todas.filter((x) => x.emprestimoId === t.emprestimoId);
    const opcoes: OpcaoExclusao[] = [
      {
        id: "esta",
        label: t.tipo === "receita" ? "Só o valor recebido" : `Só esta parcela (${t.parcelaAtual}/${t.parcelaTotal})`,
        description: "O resto do empréstimo continua como está.",
        itens: [t],
      },
    ];
    if (doEmprestimo.length > 1) {
      opcoes.push({
        id: "tudo",
        label: "Empréstimo inteiro",
        description: `Apaga todos os ${doEmprestimo.length} lançamentos dele (parcelas e valor recebido).`,
        itens: doEmprestimo,
      });
    }
    return opcoes;
  }

  if (t.compraId && t.parcelaTotal) {
    const daCompra = todas.filter((x) => x.compraId === t.compraId).sort(porParcela);
    const proximas = daCompra.filter((x) => (x.parcelaAtual ?? 0) >= (t.parcelaAtual ?? 0));
    const opcoes: OpcaoExclusao[] = [
      {
        id: "esta",
        label: `Só esta parcela (${t.parcelaAtual}/${t.parcelaTotal})`,
        description: "As outras parcelas continuam.",
        itens: [t],
      },
    ];
    if (proximas.length > 1 && proximas.length < daCompra.length) {
      opcoes.push({
        id: "proximas",
        label: "Esta e as próximas",
        description: `Apaga ${proximas.length} parcelas, a partir desta. As anteriores continuam.`,
        itens: proximas,
      });
    }
    if (daCompra.length > 1) {
      opcoes.push({
        id: "todas",
        label: "Compra inteira",
        description: `Apaga todas as ${daCompra.length} parcelas lançadas dela.`,
        itens: daCompra,
      });
    }
    return opcoes;
  }

  const templateId = t.recorrenteOrigemId ?? (t.recorrente ? t.id : null);
  if (templateId) {
    const template = todas.find((x) => x.id === templateId);
    const daAssinatura = todas.filter((x) => x.id === templateId || x.recorrenteOrigemId === templateId);
    const opcoes: OpcaoExclusao[] = [];
    if (t.id !== templateId) {
      opcoes.push({
        id: "esta",
        label: "Só esta cobrança",
        description: template?.recorrente
          ? "Ela não volta a ser gerada; as próximas continuam normalmente."
          : "As outras cobranças continuam no histórico.",
        itens: [t],
      });
      if (template?.recorrente) {
        opcoes.push({
          id: "encerrar",
          label: "Esta e encerrar a assinatura",
          description: "Apaga esta e não gera mais nenhuma. As anteriores continuam no histórico.",
          itens: [t],
          encerrarAssinaturaId: templateId,
        });
      }
    } else {
      opcoes.push({
        id: "esta",
        label: daAssinatura.length > 1 ? "Só este lançamento" : "Excluir assinatura",
        description:
          daAssinatura.length > 1
            ? "É o primeiro lançamento da assinatura — sem ele, ela para de gerar cobranças. As outras já lançadas continuam no histórico."
            : "A assinatura para de gerar cobranças.",
        itens: [t],
      });
    }
    if (daAssinatura.length > 1) {
      opcoes.push({
        id: "tudo",
        label: "Assinatura inteira",
        description: `Apaga todas as ${daAssinatura.length} cobranças dela, inclusive as anteriores.`,
        itens: daAssinatura,
      });
    }
    return opcoes;
  }

  return [{ id: "esta", label: "Excluir", itens: [t] }];
}
