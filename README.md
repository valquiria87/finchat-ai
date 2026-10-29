![Testes](https://github.com/valquiria87/finchat-ai/actions/workflows/main.yml/badge.svg)

# FinChat AI — Assistente Financeiro Conversacional

Aplicação web desenvolvida para o desafio DIO Bradesco. O projeto demonstra uma interface de chat financeiro em português, acompanhada de um painel com contas, movimentações e gastos por categoria.

**Aplicação publicada:** https://pocketwise-finance-chat.lovable.app  
**Repositório:** https://github.com/valquiria87/finchat-ai

> **Importante:** a aplicação publicada usa somente dados fictícios locais em USD. Ela não está conectada a contas bancárias, ao Pluggy nem ao Plaid. Os MCPs descritos neste README fazem parte do laboratório do desafio; não são integrações da aplicação publicada.

## 1. Cenário de uso

A pessoa usuária entra no chat para consultar um cenário financeiro demonstrativo: contas correntes e poupança, saldo bancário disponível, dívida de cartões, movimentações recentes e despesas por categoria. Pode usar sugestões prontas ou digitar perguntas em português.

A aplicação separa dinheiro disponível, dívida de cartão e crédito disponível. Não estima valores ausentes e informa quando uma pergunta não pode ser respondida com os dados de demonstração.

## 2. Aplicação e tecnologias

- React 19, TypeScript, TanStack Start/Router e Vite.
- Tailwind CSS v4 e Lucide React.
- Vitest, Testing Library e jsdom para testes.
- Bun para instalação e execução.

**Funcionalidades implementadas**
- Chat em português com intenções e respostas previstas no código.
- Painel de contas e movimentações.
- Histórico de conversas no `localStorage` do navegador.
- Gastos por categoria, somando apenas despesas.
- Layout responsivo e avisos sobre dados simulados.

**Limitações:** o chat usa regras locais e correspondência de padrões, não um modelo de linguagem conectado a uma API. Não há login, backend financeiro, sincronização nem conexão bancária. A amostra local contém quatro contas e oito movimentações ilustrativas de outubro de 2026; não é um extrato completo.

## 3. Configuração dos MCPs do laboratório

### Pluggy Docs MCP — somente documentação

- **Tipo:** Streamable HTTP.
- **Nome sugerido:** `pluggy`.
- **URL:** `https://mcp.pluggy.ai/mcp`.
- **Autenticação:** não é necessária.
- **Objetivo:** consultar a documentação de Open Finance da Pluggy, incluindo conceitos como Item, contas, transações e endpoints.
- **Limite:** este MCP de documentação não acessa contas bancárias nem consulta dados financeiros reais.

A validação esperada no agente é abrir `/mcp`, localizar o servidor e solicitar a listagem das ferramentas/endpoints do grupo `Transaction` (singular), registrando as fontes retornadas.

**Captura de tela a inserir:** resposta do agente com os endpoints de `Transaction` e as fontes da documentação. Não incluir dados sensíveis.

> **[ESPAÇO PARA PRINT 1 — Pluggy Docs MCP conectado e ferramentas Transaction listadas]**

### Plaid Sandbox MCP — laboratório separado

- **Tipo:** STDIO.
- **Nome sugerido:** `plaid`.
- **Comando:** `uvx`.
- **Argumento:** `mcp-server-plaid`.
- **Variáveis de ambiente locais:** `PLAID_CLIENT_ID` e `PLAID_SECRET`.

Instale o `uv` seguindo a documentação oficial: https://docs.astral.sh/uv/getting-started/installation/. Configure as variáveis no ambiente local do servidor MCP. **Não coloque credenciais, tokens ou valores de segredos no README, em capturas ou no frontend.**

O uso do Plaid neste laboratório é separado da aplicação publicada e não significa que a aplicação esteja integrada ao Plaid.

**Capturas de tela a inserir:**

> **[ESPAÇO PARA PRINT 2 — Plaid Sandbox MCP conectado, sem credenciais visíveis]**

> **[ESPAÇO PARA PRINT 3 — consulta de leitura do Sandbox, com período e moeda visíveis e sem tokens]**

### Registro de execução do Sandbox

O relatório [P07-RESULTADO.md](./docs/evidencias/P07-RESULTADO.md) registra uma consulta de 28/06/2026 a 25/09/2026. A tentativa inicial retornou `PRODUCT_NOT_READY`; uma nova tentativa foi concluída com sucesso. O relatório agrega cinco transações em USD: zero pendentes, cinco confirmadas, soma algébrica de **US$ 163,57** e maior movimento absoluto de **US$ 111,47**.

O Guia do Instrutor também relata uma execução histórica diferente, com 14 contas e 48 transações. Esses números não são os mesmos da amostra local nem do relatório P07. Nenhum deles deve ser apresentado como dado real de cliente ou como dado usado pelo app publicado.

## 4. Prompt para o Lovable

O texto literal do prompt originalmente enviado ao Lovable não está versionado no repositório. Para não atribuir ao histórico uma transcrição que não conseguimos verificar, segue uma **versão reconstruída a partir das funcionalidades atuais**. Substitua-a pelo prompt original se conseguir recuperá-lo.

> Crie uma aplicação web responsiva em português chamada FinChat AI, um assistente financeiro conversacional com um painel de demonstração. Use apenas dados fictícios locais, sem conexão com bancos ou APIs reais. Apresente contas correntes, poupança e cartões de crédito; mantenha separados saldo bancário disponível, dívida do cartão e crédito disponível. Inclua um chat com sugestões de perguntas, respostas para contas, saldo, dívida, movimentações e gastos por categoria, além de histórico de conversas salvo no navegador. Calcule gastos por categoria considerando somente despesas e excluindo entradas. Não invente valores ausentes: indique quando a informação não estiver disponível. Mostre claramente que todos os dados são simulados. Crie uma interface limpa e responsiva, com componentes reutilizáveis e testes para as regras financeiras.

## 5. Melhoria implementada

**Análise de despesas por categoria.** A função `spendingByCategory()`, em `src/lib/finance.ts`, soma apenas movimentações positivas (despesas), exclui entradas como salário e rendimento e ordena as categorias do maior para o menor total.

Totais esperados nos testes da amostra local — todos em **USD**:

| Categoria | Total |
|---|---:|
| Transporte | US$ 173,90 |
| Alimentação | US$ 147,90 |
| Moradia | US$ 120,00 |
| Serviços | US$ 49,00 |
| **Total de despesas** | **US$ 490,80** |

Esses valores pertencem às oito movimentações fictícias do aplicativo. Não são os resultados do Plaid Sandbox. A moeda da demonstração e dos testes é dólar americano (USD), não real brasileiro (BRL).

## 6. Evidências visuais

Adicionar capturas reais antes da entrega. Os espaços abaixo são marcadores e **não representam imagens já anexadas**.

> **[ESPAÇO PARA PRINT 4 — página inicial do app publicado em desktop]**

> **[ESPAÇO PARA PRINT 5 — conversa no app com resumo financeiro e aviso de dados simulados]**

> **[ESPAÇO PARA PRINT 6 — painel financeiro em tela de celular]**

> **[ESPAÇO PARA PRINT 7 — gastos por categoria no app]**

## 7. Histórico verificável

Os hashes abaixo foram conferidos no histórico do GitHub:

- [`0e86680`](https://github.com/valquiria87/finchat-ai/commit/0e86680aea9e0d90a229a6a2b0ac50e7f0327b64) — adicionou transações fictícias.
- [`7ad0605`](https://github.com/valquiria87/finchat-ai/commit/7ad0605777ac6b15f1eec454a42f39a6914b7225) — adicionou painel financeiro.
- [`484805a`](https://github.com/valquiria87/finchat-ai/commit/484805acee4af277fa0e9f111a65508bb19061dc) — adicionou estados e sugestões.
- [`17635bd`](https://github.com/valquiria87/finchat-ai/commit/17635bd192ba42e9b2416bd24897354095ed8dd7) — adicionou workflow de testes.
- [`4ddc2da`](https://github.com/valquiria87/finchat-ai/commit/4ddc2daf02f8ff72d93b0914172b38b2e25d96d1) — formatou o código e registrou a verificação de testes.

## 8. Executar localmente

Requisito: [Bun](https://bun.sh).

```bash
bun install
bun run dev
bun run test
bun run build
```

A demonstração local não exige credenciais nem variáveis de ambiente.

## Referências

- [Guia do Instrutor (PDF)](https://hermes.dio.me/files/assets/0e56ff91-f2bd-4f37-bd37-a330f5a844f2.pdf)
- [Apresentação da aula (PDF)](https://hermes.dio.me/files/assets/e0d3f15d-6418-4ca0-98a7-4130b7832c43.pdf)
- [Documentação de instalação do uv](https://docs.astral.sh/uv/getting-started/installation/)
