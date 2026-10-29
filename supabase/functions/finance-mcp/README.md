# Nexora Finance MCP

Servidor MCP via Supabase Edge Function, autenticado por OAuth e com ferramentas estritamente somente leitura.

## Ferramentas

- `listar_contas`: contas bancárias e cartões do usuário autenticado.
- `saldo_total`: saldos agregados separadamente por moeda.
- `buscar_transacoes`: filtros opcionais por período, categoria, texto da descrição e limite.
- `gastos_por_categoria`: total de débitos por categoria no mês `AAAA-MM`.
- `resumo_mensal`: créditos, débitos e resultado líquido no mês `AAAA-MM`.
- `maiores_gastos`: maiores débitos no período, com quantidade `top` configurável.

## Modelo de dados esperado

- `items`: `id`, `pluggy_item_id`, `conector_name`, `status`, `last_sync_at`.
- `accounts`: `id`, `item_id`, `pluggy_account_id`, `name`, `type` (`BANCO`/`CARTAO`), `balance`, `currency`.
- `transactions`: `id`, `account_id`, `pluggy_tx_id` único, `date`, `description`, `amount`, `type` (`DEBITO`/`CREDITO`), `category`.

Todas as ferramentas são consultas. Não há ferramentas para alterar registros, sincronizar dados, movimentar dinheiro ou mudar saldos.

## Segurança de dados

O middleware autentica o usuário e as consultas usam o cliente Supabase no contexto desse usuário, sujeitas às políticas RLS. Isso só isola os dados corretamente se as políticas estiverem configuradas para o esquema real. A lista de colunas de `items` acima não inclui um proprietário (`user_id`); portanto, confirme como `items` é associado ao usuário e verifique as políticas RLS de `items`, `accounts` e `transactions` antes do uso com dados reais.

## Deploy e validação

Endpoint após deploy: `https://rzghrtuojjxtbakafcmj.supabase.co/functions/v1/finance-mcp`.

Antes de produção: habilitar OAuth 2.1 e registro dinâmico no Supabase, configurar Auth Site URL para a origem publicada do frontend, confirmar assinatura JWT assimétrica, implantar a função e testar descoberta OAuth, login, consentimento, troca de token e as seis ferramentas com usuário de teste. CI verde não comprova deploy nem teste ponta a ponta.
