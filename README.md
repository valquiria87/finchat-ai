![Testes](https://github.com/valquiria87/finchat-ai/actions/workflows/main.yml/badge.svg)

# FinChat AI — Assistente Financeiro Conversacional

Aplicação web desenvolvida como entrega do desafio DIO Bradesco. O FinChat AI demonstra como uma interface conversacional pode apresentar informações financeiras de forma clara, com regras que mantêm saldo bancário, dívida de cartão e crédito disponível separados.

> **Demonstração:** todos os dados financeiros são fictícios e locais. O aplicativo não está conectado a bancos, ao Plaid ou ao Pluggy.

## Objetivo e cenário de uso

A pessoa usuária pode explorar um painel financeiro de exemplo e fazer perguntas em português sobre contas, dinheiro disponível, dívida e crédito de cartões, movimentações, gastos por categoria e resumo financeiro. O projeto é uma demonstração educacional de interface e lógica de negócio; não deve ser usado para consultar ou tomar decisões sobre finanças reais.

## Aplicação publicada

[https://pocketwise-finance-chat.lovable.app](https://pocketwise-finance-chat.lovable.app)

## Funcionalidades atuais

- Chat em português com sugestões de perguntas e respostas para intenções previstas no código.
- Painel com saldo disponível, dívida de cartões, gastos por categoria, contas de exemplo e movimentações recentes.
- Histórico de conversas e criação de novas conversas, armazenados no `localStorage` do navegador.
- Tratamento de perguntas sem resposta disponível e aviso de que as respostas usam dados simulados.
- Layout responsivo para telas menores.
- Regras para não somar dívida ou limite de cartão ao dinheiro disponível. O saldo disponível considera apenas contas corrente e poupança.

### Limites da demonstração

O chat usa correspondência de padrões e regras locais; não é um modelo de linguagem conectado a uma API. Responde somente às intenções codificadas. As quatro contas e oito movimentações são exemplos estáticos em USD; as movimentações são um recorte ilustrativo de outubro de 2026, não um extrato completo nem uma base para reconciliar saldos. Não há login, banco de dados, sincronização, conexão bancária ou dados pessoais reais. O histórico fica apenas no armazenamento local do navegador.

## Dados e regras financeiras

Os dados vêm de `DEMO_ACCOUNTS` e `DEMO_TRANSACTIONS` em `src/lib/finance.ts`, por meio do `demoProvider`. As contas de exemplo são Plaid Checking, Plaid Saving, Plaid Credit Card e Plaid Business Credit Card; os nomes Plaid são rótulos dos dados fictícios, não evidência de conexão com o Plaid.

As movimentações usam a convenção implementada no projeto: valor positivo representa despesa/saída e valor negativo representa entrada. O painel e as respostas calculam gastos usando somente despesas. As transações não atualizam nem determinam os saldos das contas. Valores ausentes, como limite total de cartão, são apresentados como não informados em vez de estimados.

## Tecnologias

- React 19 e TypeScript
- TanStack Start e TanStack Router
- Vite
- Tailwind CSS v4
- Vitest, Testing Library e jsdom para testes
- Bun para instalação e execução conforme o `bun.lock`
- Lucide React para ícones

## Arquitetura atual

| Arquivo | Responsabilidade |
|---|---|
| `src/routes/index.tsx` | Tela do chat, estado da conversa, histórico no navegador e alternância entre chat e painel. Chama `answer()` para responder. |
| `src/components/finchat/ChatMessage.tsx` | Apresentação de mensagens. |
| `src/components/finchat/Dashboard.tsx` | Painel de contas e movimentações; usa `demoProvider` e os helpers financeiros compartilhados. |
| `src/lib/finance.ts` | Dados locais, `demoProvider`, cálculos, identificação de intenção e função `answer()`. É o ponto isolado para futura substituição da origem das respostas. |
| `src/lib/plaid/types.ts`, `mappers.ts`, `sync.ts` | Tipos, mapeadores puros e lógica de paginação preparatória para Plaid. Não realizam requisições de rede nem alimentam a interface atual. |
| `src/lib/plaid/config.server.ts`, `plaid.functions.ts` | Leitura server-side da presença de variáveis de configuração e indicação de que a integração não foi implementada. Não expõem os segredos nem chamam a API do Plaid. |
| `src/test/` | Testes de lógica financeira, mapeadores/paginação Plaid, painel e rota inicial. |

O estado financeiro exibido pela aplicação vem do provedor local de demonstração. O `localStorage` guarda somente conversas no navegador. Não existe backend de dados financeiros conectado.

## Instalar e executar localmente

Requisito: [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

O servidor de desenvolvimento informa no terminal o endereço local. Para executar os testes existentes:

```bash
bun run test
```

Para gerar e visualizar a build de produção:

```bash
bun run build
bun run preview
```

A demonstração não exige credenciais nem variáveis de ambiente.

## Testes

Os testes automatizados existentes estão em `src/test/` e são executados com Vitest pelo comando `bun run test`. A execução validada nesta revisão aprovou 45 testes em 4 arquivos.

## Evidências

Não há capturas de tela (`.png`, `.jpg`, `.jpeg`, `.webp` ou `.gif`) no repositório neste momento.

## Próximos passos para uma integração futura com MCP/Plaid

1. Usar o Pluggy MCP, se necessário, como apoio para consultar documentação e planejar a integração; isso não conecta o aplicativo a contas bancárias.
2. Definir e implementar uma integração Plaid no servidor, começando pelo Sandbox e mantendo credenciais fora do frontend e de variáveis `VITE_*`.
3. Implementar autenticação, fluxo Plaid Link, troca segura de tokens e persistência protegida por usuário.
4. Implementar chamadas server-side para contas e sincronização de transações, aproveitando e validando os mapeadores e a paginação já preparados.
5. Criar um provedor real que substitua a origem dos dados de demonstração sem transferir credenciais ou lógica de integração para os componentes de UI; validar consentimento, erros, atualização e reconciliação dos dados.

Esses itens são possibilidades futuras. Nem Pluggy MCP, Plaid Sandbox nem uma API bancária real estão integrados ao aplicativo atual.
