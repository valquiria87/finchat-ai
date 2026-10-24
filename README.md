# FinChat AI — Assistente Financeiro Conversacional

Assistente financeiro conversacional desenvolvido como projeto prático de estudo em Inteligência Artificial, integração de dados e desenvolvimento de aplicações web.

O FinChat AI permite consultar informações financeiras demonstrativas em português, distinguindo saldo disponível, dívidas de cartões e crédito disponível.

> **Aviso:** esta versão utiliza dados fictícios locais. Não está conectada a contas bancárias reais.

## Objetivo do projeto

Demonstrar como uma interface conversacional pode apresentar informações financeiras de forma clara, respeitando regras de negócio e evitando conclusões que não sejam sustentadas pelos dados disponíveis.

## Funcionalidades

- Interface de chat em português do Brasil.
- Consulta demonstrativa de contas e saldos.
- Distinção entre dinheiro disponível, dívida de cartão e crédito disponível.
- Perguntas sugeridas para facilitar a interação.
- Histórico de conversas salvo no navegador.
- Criação de novas conversas.
- Tratamento de perguntas cujas informações não estão disponíveis.
- Interface responsiva para computador e dispositivos móveis.

## Tecnologias utilizadas

- React
- TypeScript
- Tailwind CSS
- TanStack Start
- Lovable

## Regras de negócio e confiabilidade

O assistente segue regras para evitar interpretações financeiras incorretas:

- Dívidas de cartão não são somadas ao dinheiro disponível.
- Crédito disponível não é tratado como dinheiro próprio.
- Valores ausentes são identificados como não informados.
- A moeda USD é preservada na demonstração.
- Informações não presentes nos dados não devem ser inventadas.
- As respostas devem deixar claro quando os dados disponíveis não permitem uma conclusão.

## Dados demonstrativos

A versão inicial utiliza quatro contas fictícias:

- Plaid Checking
- Plaid Saving
- Plaid Credit Card
- Plaid Business Credit Card

Essas contas servem apenas para testar a interface e as regras de negócio. Não representam contas bancárias reais.

## Arquitetura e próximos passos

O projeto foi preparado como uma primeira versão demonstrativa. As próximas evoluções previstas incluem:

1. Consultar a documentação do Pluggy por meio do MCP.
2. Integrar
