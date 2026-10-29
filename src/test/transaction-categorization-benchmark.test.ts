import { describe, expect, it } from "vitest";
import { categorizeTransaction } from "@/lib/transaction-categorizer";

const groups: Array<{ category: string; descriptions: string[] }> = [
  {
    category: "Alimentação",
    descriptions: [
      "Supermercado Bom Preço",
      "Padaria Pão Quente",
      "Restaurante Sabor Caseiro",
      "iFood pedido 8831",
      "Açougue Central",
      "Hortifruti da Praça",
      "Lanchonete Avenida",
      "Cafeteria Grão Especial",
      "Pizzaria do Bairro",
      "PAG*F8K21",
    ],
  },
  {
    category: "Transporte",
    descriptions: [
      "Uber trip 2038",
      "99 corrida 731",
      "Posto Avenida gasolina",
      "Combustível Auto Posto",
      "Estacionamento Centro",
      "Pedágio rodovia BR",
      "Passagem de ônibus intermunicipal",
      "Bilhete metrô",
      "Oficina mecânica",
      "PGTO*TRP802",
    ],
  },
  {
    category: "Moradia",
    descriptions: [
      "Aluguel apartamento outubro",
      "Condomínio residencial",
      "Conta de luz energia",
      "Conta de água Saneamento",
      "Gás encanado",
      "IPTU parcela",
      "Serviço de encanador",
      "Material de construção",
      "Seguro residencial anual",
      "PG*HOME419",
    ],
  },
  {
    category: "Saúde",
    descriptions: [
      "Farmácia Popular",
      "Drogaria São João",
      "Consulta clínica geral",
      "Clínica médica",
      "Laboratório exame sangue",
      "Dentista consulta",
      "Hospital atendimento",
      "Plano de saúde mensal",
      "Exame de imagem",
      "MED*H2Q711",
    ],
  },
  {
    category: "Serviços",
    descriptions: [
      "Internet fibra mensal",
      "Telefone celular plano",
      "Conta de celular",
      "Assinatura software gestão",
      "Software produtividade",
      "Tarifa bancária mensal",
      "Seguro auto parcela",
      "Cloud hosting mensal",
      "Contador honorários",
      "SV*XK5502",
    ],
  },
  {
    category: "Compras",
    descriptions: [
      "Loja de roupa feminina",
      "Amazon pedido 884",
      "Mercado Livre compra 552",
      "Tênis esportivo loja",
      "Eletrônicos acessórios",
      "Magazine móveis",
      "Móveis para sala",
      "Perfumaria fragrância",
      "Papelaria caderno",
      "BUY*Q9W013",
    ],
  },
  {
    category: "Educação",
    descriptions: [
      "Mensalidade escola",
      "Faculdade mensalidade",
      "Curso de inglês",
      "Udemy curso online",
      "Coursera assinatura educacional",
      "Livro didático",
      "Material escolar",
      "Inscrição concurso",
      "Treinamento profissional",
      "EDU*R4P010",
    ],
  },
  {
    category: "Lazer",
    descriptions: [
      "Cinema ingresso",
      "Teatro peça",
      "Show musical ingresso",
      "Parque de diversões",
      "Hotel reserva viagem",
      "Game digital",
      "Bar música ao vivo",
      "Ingresso jogo futebol",
      "Museu visita",
      "FUN*Z5L011",
    ],
  },
  {
    category: "Renda",
    descriptions: [
      "Salário empresa outubro",
      "Aposentadoria INSS",
      "Benefício recebido",
      "Rendimento poupança",
      "Juros recebidos investimento",
      "Cashback cartão",
      "Comissão de vendas",
      "Honorários recebidos",
      "Pagamento recebido cliente",
      "INC*P7M022",
    ],
  },
  {
    category: "Transferência",
    descriptions: [
      "Pix enviado João",
      "Pix recebido",
      "TED para outra conta",
      "DOC transferência",
      "Transferência entre contas",
      "Valor transferido",
      "Depósito em conta",
      "Saque caixa eletrônico",
      "Transferencia agendada",
      "TRF*B3N019",
    ],
  },
];

const dataset = groups.flatMap(({ category, descriptions }) =>
  descriptions.map((description) => ({ description, expected: category })),
);

describe("benchmark sintético de categorização de transações", () => {
  it("avalia 100 descrições rotuladas e calcula acurácia e métricas por categoria", () => {
    const predictions = dataset.map((sample) => ({
      ...sample,
      predicted: categorizeTransaction(sample.description),
    }));
    const correct = predictions.filter((sample) => sample.expected === sample.predicted).length;
    const accuracy = correct / predictions.length;
    const perCategory = groups.map(({ category }) => {
      const samples = predictions.filter((sample) => sample.expected === category);
      const hits = samples.filter((sample) => sample.predicted === category).length;
      return { category, count: samples.length, correct: hits, accuracy: hits / samples.length };
    });

    console.info(
      JSON.stringify({
        benchmark: "synthetic-transaction-categorization",
        total: dataset.length,
        correct,
        accuracy,
        perCategory,
        mismatches: predictions.filter((sample) => sample.expected !== sample.predicted),
      }),
    );
    expect(dataset).toHaveLength(100);
    expect(new Set(dataset.map((sample) => sample.description)).size).toBe(100);
    expect(accuracy).toBe(0.88);
    expect(perCategory.reduce((sum, metric) => sum + metric.correct, 0)).toBe(88);
  });
});
