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

Os dois PDFs registram resultados e instruções do laboratório MCP. Esse registro documental não equivale a capturas brutas das chamadas, e os dados do laboratório não são os dados usados pelo aplicativo.

### Laboratório MCP documentado nos PDFs

O laboratório descrito a seguir é separado do FinChat AI publicado. A aplicação continua usando exclusivamente a demonstração local explicada neste README.

#### Pluggy Docs MCP

O Guia do Instrutor (p. 6) orienta adicionar um servidor MCP remoto chamado `pluggy`, do tipo **Streamable HTTP**, com a URL `https://mcp.pluggy.ai/mcp` e sem autenticação. Depois de salvar, reinicie o Codex se necessário e confira `/mcp` numa conversa nova. O servidor é usado para consultar documentação da Pluggy; não acessa contas bancárias.

O Guia registra que, após reiniciar o Codex, o servidor respondeu. P01 retornou quatro operações de transação depois de corrigir o filtro de grupo para `Transaction`; P02 foi usado para explicar conceitos com fontes; P03 foi executado. P04 é um aprofundamento opcional e não deve executar consulta de dados (p. 7–10). Esses são resultados relatados no Guia, não uma transcrição bruta anexada ao repositório.

#### Plaid Sandbox MCP

O Guia (p. 13–16) orienta instalar `uv`, localizar o executável `uvx` e adicionar um servidor **STDIO** chamado `plaid`. No Mac do instrutor, a instalação registrada foi `brew install uv`; em outros sistemas, siga as instruções oficiais de instalação do [`uv`](https://docs.astral.sh/uv/getting-started/installation/). Use o caminho local de `uvx` como comando e `mcp-server-plaid` como argumento. Configure localmente as variáveis `PLAID_CLIENT_ID` e `PLAID_SECRET` nos campos de ambiente do servidor; não inclua seus valores neste README, em prompts, capturas ou no frontend. Salve e reinicie o Codex, depois confirme o servidor com `/mcp`. O caminho `/Users/brunolima/.local/bin/uvx` mostrado no Guia é específico do Mac do instrutor; em outros sistemas, use o caminho local correspondente.

P05 é a verificação documental do servidor. P06 registra a criação de um Item padrão com o produto `transactions`, sem webhook, e a obtenção de um token. O Guia deixa **pendente** a confirmação de que a instituição desse Item foi `First Platypus Bank` (`ins_109508`); portanto, este README não afirma que foi. P07 é descrito como consulta de leitura ao Sandbox, usando `/accounts/get` e `/transactions/get`, com paginação `count`/`offset`/`total_transactions` e período de 90 dias. O Guia relata uma primeira falha de rede e uma tentativa posterior bem-sucedida; isso não significa que o aplicativo tenha executado essas chamadas (p. 16–23).

#### Registro complementar da execução P07

O [relatório P07](./docs/evidencias/P07-RESULTADO.md) registra uma consulta de 28/06/2026 a 25/09/2026 com cinco transações em USD, retornadas em uma página. Após uma tentativa com `PRODUCT_NOT_READY`, a nova tentativa teve sucesso. Os resultados são agregados: USD teve 0 pendentes e 5 confirmadas, soma algébrica de US$ 163,57 e maior movimento absoluto de US$ 111,47. Este registro é distinto dos números históricos do Guia (14 contas e 48 transações); não representa saída bruta da API e não comprova as tabelas originais dos três padrões de gastos.

#### Resultados históricos relatados pelo Guia

O Guia registra uma consulta de **28/06/2026 a 25/09/2026**: **14 contas**, **48 transações confirmadas** e **0 pendentes**. Informa entradas confirmadas de **US$ 1.512,66** e saídas confirmadas de **US$ 33.448,38**. Na Plaid, o sinal positivo representa saída e o negativo, entrada. Esses números são resultados documentados do laboratório Sandbox; não são os quatro registros de contas nem as oito transações fictícias locais do aplicativo (p. 20–21).

O Guia também registra três observações sobre aquele conjunto: seis transferências de saída somando **US$ 20.550,00**; nove registros de alimentação e bebidas somando **US$ 1.548,99**; e seis transações identificadas como Uber somando **US$ 35,19**. O próprio Guia alerta que transferências podem ser movimentações entre contas, não consumo, e que os dados são fictícios (p. 21–22). O aplicativo atual calcula gastos por categoria sobre sua própria amostra local e não produz essas três observações do Sandbox.

### Resumo da especificação do chat no Lovable

O Guia (p. 25–28) contém uma especificação de chat em português, responsivo, com indicação de demonstração fictícia, sugestões clicáveis, envio por botão/Enter e quebra de linha com Shift+Enter, carregamento, erros compreensíveis, histórico, contas, saldos, transações, categorias e respostas limitadas aos dados disponíveis. Define uma Etapa 1 funcional com dados locais fictícios e uma Etapa 2 futura com backend Plaid Sandbox e segredos apenas no servidor. Também inclui P09 para revisar a prévia em desktop e celular.

Este parágrafo é um **resumo da especificação incluída no Guia**, não uma transcrição do prompt original enviado ao Lovable. Não localizei no repositório o texto integral do prompt efetivamente utilizado nem um registro que comprove essa submissão.

### Ajustes confirmados pelo histórico Git

O histórico registra a inclusão de transações fictícias (`0e86680`), a adição do painel financeiro (`7ad0605`), estados e sugestões de interação (`484805a`), o workflow de testes (`17635bd`) e uma etapa de formatação/verificação (`4ddc2da`). Isso confirma a evolução desses arquivos no projeto; não comprova quais instruções foram enviadas ao Lovable nem uma revisão manual P09.

### Melhoria escolhida

**Pendente de confirmação.** O histórico e os PDFs disponíveis não identificam qual melhoria foi escolhida pela autora para apresentar como melhoria do desafio. As funcionalidades existentes não são atribuídas aqui a uma escolha específica sem essa evidência.

### Capturas de tela ainda necessárias

Não há capturas de tela (`.png`, `.jpg`, `.jpeg`, `.webp` ou `.gif`) no repositório neste momento. Para completar as evidências de portfólio, ainda faltam:

- capturas das respostas reais do Pluggy Docs MCP, sem dados sensíveis;
- capturas do P05 e do P06 do Plaid Sandbox MCP; não exiba credenciais ou token, e não indique a instituição como confirmada sem prova;
- capturas da consulta P07 mostrando contas, as cinco transações mais recentes e as três observações, com período e moeda visíveis;
- capturas da conversa com o aplicativo publicado e do painel em desktop e celular, como parte da revisão P09.

As tabelas e os totais deste README são transcrições resumidas do Guia do Instrutor, não imagens nem registros brutos das chamadas MCP. Não foram criadas capturas para esta documentação.

Materiais de referência: [Guia do Instrutor (PDF)](https://hermes.dio.me/files/assets/0e56ff91-f2bd-4f37-bd37-a330f5a844f2.pdf) e [Apresentação da aula (PDF)](https://hermes.dio.me/files/assets/e0d3f15d-6418-4ca0-98a7-4130b7832c43.pdf).

## Próximos passos para uma integração futura com MCP/Plaid

1. Usar o Pluggy MCP, se necessário, como apoio para consultar documentação e planejar a integração; isso não conecta o aplicativo a contas bancárias.
2. Definir e implementar uma integração Plaid no servidor, começando pelo Sandbox e mantendo credenciais fora do frontend e de variáveis `VITE_*`.
3. Implementar autenticação, fluxo Plaid Link, troca segura de tokens e persistência protegida por usuário.
4. Implementar chamadas server-side para contas e sincronização de transações, aproveitando e validando os mapeadores e a paginação já preparados.
5. Criar um provedor real que substitua a origem dos dados de demonstração sem transferir credenciais ou lógica de integração para os componentes de UI; validar consentimento, erros, atualização e reconciliação dos dados.

Esses itens são possibilidades futuras. Nem Pluggy MCP, Plaid Sandbox nem uma API bancária real estão integrados ao aplicativo atual.
