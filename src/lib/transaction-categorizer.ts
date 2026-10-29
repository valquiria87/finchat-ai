function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Conservative fallback for transactions with no category from the data provider.
 * It deliberately returns "Outros" when the description does not contain a reliable signal.
 */
export function categorizeTransaction(description: string): string {
  const text = normalize(description);

  const rules: Array<[string, RegExp]> = [
    [
      "Transferência",
      /\b(pix|ted|doc|transferencia|transferido|deposito|saque)\b/,
    ],
    [
      "Renda",
      /\b(salario|aposentadoria|beneficio|rendimento|juros recebidos|cashback|comissao|honorarios recebidos|pagamento recebido|venda recebida)\b/,
    ],
    [
      "Compras",
      /\b(mercado livre|loja|amazon|tenis|eletronicos?|magazine|moveis|perfumaria|papelaria|roupa|compra)\b/,
    ],
    [
      "Alimentação",
      /\b(supermercado|mercado|padaria|restaurante|ifood|acougue|hortifruti|lanchonete|cafeteria|pizzaria|delivery|alimentacao)\b/,
    ],
    [
      "Transporte",
      /\b(uber|99\b|gasolina|combustivel|posto|estacionamento|pedagio|onibus|metro|passagem|oficina|transporte)\b/,
    ],
    [
      "Moradia",
      /\b(aluguel|condominio|energia|conta de luz|agua|gas|iptu|encanador|material de construcao|seguro residencial|moradia)\b/,
    ],
    [
      "Saúde",
      /\b(farmacia|drogaria|consulta|clinica|laboratorio|dentista|hospital|plano de saude|exame|fisioterapia|saude)\b/,
    ],
    [
      "Educação",
      /\b(escola|faculdade|curso|udemy|coursera|livro didatico|material escolar|inscricao|treinamento|ensino|educacao)\b/,
    ],
    [
      "Lazer",
      /\b(cinema|teatro|show|parque|hotel|game|bar|ingresso|museu|viagem|lazer|streaming)\b/,
    ],
    [
      "Serviços",
      /\b(internet|telefone|celular|assinatura|software|tarifa bancaria|seguro auto|cloud|contador|limpeza|manutencao|servico)\b/,
    ],
  ];

  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Outros";
}
