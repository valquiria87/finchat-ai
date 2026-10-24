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

## Arquitetura atual

O FinChat AI é uma aplicação web em TanStack Start (React 19 + Vite), com estilos em Tailwind CSS v4. Nesta versão, todo o chat roda no navegador sobre dados fictícios locais.

| Arquivo | Responsabilidade |
|---|---|
| `src/routes/index.tsx` | Tela do chat: mensagens, sugestões, histórico e aviso “Demonstração · Dados fictícios”. |
| `src/components/finchat/ChatMessage.tsx` | Exibição de cada mensagem do chat. |
| `src/lib/finance.ts` | Contas fictícias, identificação da intenção da pergunta (`detectIntent`) e geração da resposta (`answer`). |

O histórico de conversas é salvo no `localStorage` do navegador. Não há banco de dados nem login.

### Identificação de intenções

`detectIntent` classifica cada pergunta, da mais específica para a mais geral:

1. Uso do cartão de crédito para fazer compras.
2. Crédito disponível dos cartões.
3. Dinheiro disponível nas contas bancárias (soma só o saldo disponível de conta corrente e poupança).
4. Dívida atual dos cartões.
5. Limite total dos cartões.
6. Transações (não existem nos dados de demonstração).
7. Gastos por categoria (não existem nos dados de demonstração).
8. Lista de contas.

Quando a pergunta não se encaixa em nenhuma intenção, o assistente informa que não consegue responder com os dados disponíveis.

## Preparação para o Plaid (integração não implementada)

> **A integração real com o Plaid não foi implementada.** O app não faz nenhuma chamada ao Plaid, não pede credenciais e usa apenas dados fictícios.

Foram criados apenas módulos de preparação, que ainda não são usados pela tela do chat:

| Arquivo | Conteúdo |
|---|---|
| `src/lib/plaid/types.ts` | Tipos separados para contas bancárias (saldo), cartões (dívida, crédito disponível e limite) e transações, além dos formatos de resposta do Plaid. |
| `src/lib/plaid/mappers.ts` | Conversão pura das contas e transações do Plaid para o formato do app. Preserva o sinal do Plaid (positivo = saída, negativo = entrada) e mantém valores ausentes como não informados. |
| `src/lib/plaid/sync.ts` | Paginação de `/transactions/sync`: segue `next_cursor` enquanto `has_more` for verdadeiro e recomeça do cursor original após `TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION`. A busca de páginas é recebida como parâmetro; não há requisição real. |
| `src/lib/plaid/config.server.ts` | Executado apenas no servidor. Verifica se `PLAID_CLIENT_ID` e `PLAID_SECRET` existem, sem nunca devolver os valores. |
| `src/lib/plaid/plaid.functions.ts` | Função de servidor que informa `mode: "demo"` e `integrationImplemented: false`. |

Credenciais nunca devem ir para o frontend nem para variáveis `VITE_*`.

## Testes

Os testes usam Vitest. Na última execução, **32 testes foram aprovados** em 3 arquivos:

| Arquivo | Testes | Cobertura |
|---|---|---|
| `src/test/finance.test.ts` | 22 | Formatação em US$, dinheiro disponível sem dívidas e limites, ausência de transações, respostas sobre cartão, e regressão da identificação de intenções e dos valores (US$ 300,00 disponível, US$ 5.430,00 de dívida, limites não informados). |
| `src/test/plaid.test.ts` | 9 | Conversão de contas, separação entre saldo, crédito disponível e dívida, sinais das transações e paginação de `/transactions/sync`. |
| `src/test/app-routing.test.tsx` | 1 | Carregamento da página inicial. |

## Instalação e execução local

Requisitos: [Bun](https://bun.sh) (o projeto usa `bun.lock`).

```bash
bun install      # instala as dependências
bun run dev      # inicia o servidor de desenvolvimento
bun run test     # executa todos os testes
bun run build    # gera a versão de produção
bun run lint     # verifica o código
```

Nenhuma credencial ou variável de ambiente é necessária para rodar a demonstração.

## Próximos passos

1. Consultar a documentação do Pluggy por meio do MCP.
2. Ativar login e banco de dados para guardar com segurança o token de acesso e o cursor de sincronização.
3. Implementar no servidor as chamadas ao Plaid Sandbox (criação do Link token, troca do public token, consulta de contas e `/transactions/sync`), usando os módulos de preparação.
4. Substituir os dados fictícios de `answer()` por dados reais, mantendo as mesmas regras de negócio.
