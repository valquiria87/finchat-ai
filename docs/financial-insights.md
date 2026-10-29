# Insights financeiros explicáveis

## Objetivo

A melhoria adiciona ao chat do Nexora Finance uma análise de gastos baseada nas transações disponíveis no provedor ativo. O objetivo é mostrar observações verificáveis sem inventar números nem misturar valores de moedas diferentes.

## O que a análise apresenta

- Quantidade de movimentações, despesas e entradas analisadas.
- Total de despesas separado por moeda.
- Categoria com maior concentração de despesas e sua participação percentual dentro da mesma moeda.
- Maior despesa individual registrada, com descrição, data e valor.
- Um ponto de revisão formulado como hipótese, sem afirmar que uma despesa é excessiva apenas pelo seu valor.

## Precisão e limites

- Despesas e entradas seguem a convenção do projeto: valor positivo é despesa; valor negativo é entrada.
- Valores em moedas diferentes não são somados nem convertidos.
- A análise só considera as transações carregadas no momento; a cobertura depende do período sincronizado pela instituição.
- Sem transações, o chat informa que não há base suficiente para produzir insights.
- O mecanismo atual é determinístico e explicável. Ele **não chama um modelo generativo**. Essa separação permite validar os cálculos antes de acrescentar uma camada de IA que redija explicações com base nesses resultados.
- A análise é informativa; não é previsão nem aconselhamento financeiro.

## Como testar

No chat, pergunte: **“Analise meus gastos e identifique oportunidades de economia.”**

Os testes automatizados em `src/test/financial-insights.test.ts` cobrem a identificação da categoria e da maior despesa, o caso sem transações e a separação de BRL e USD.

Execute os testes com `bun run test`; valide também com `bun run build` e `bun run lint`.
