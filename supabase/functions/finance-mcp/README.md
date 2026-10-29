# Nexora Finance MCP

Servidor MCP via Supabase Edge Function, autenticado por OAuth e com ferramentas estritamente somente leitura.

## Ferramentas

- `listar_contas`: contas bancárias e cartões do usuário autenticado.
- `saldo_total`: saldos agregados separadamente por moeda.
- `buscar_transacoes`: filtros opcionais por período, categoria, texto da descrição e limite.
- `gastos_por_categoria`: total de débitos por categoria no mês `AAAA-MM`.
- `resumo_mensal`: créditos, débitos e resultado líquido no mês `AAAA-MM`.
- `maiores_gastos`: maiores débitos no período, com quantidade `top` configurável.

## Modelo de dados usado pelo código de sincronização

- `pluggy_items`: `id`, `user_id`, `pluggy_item_id`, `status`, `last_synced_at`, `updated_at`.
- `accounts`: `id`, `user_id`, `pluggy_item_id`, `pluggy_account_id`, `name`, `type`, `balance`, `currency`, `credit_limit`, `updated_at`.
- `transactions`: `id`, `user_id`, `account_id`, `pluggy_transaction_id`, `date`, `description`, `amount`, `currency`, `category`, `updated_at`.

O fluxo de sincronização normaliza a direção fornecida pela Pluggy para `type = DEBITO` com `amount > 0` e `type = CREDITO` com `amount < 0`. As ferramentas MCP classificam movimentações pela coluna `type` e mantêm os agregados separados por moeda. Se a Pluggy não fornecer uma direção reconhecida, o fallback usa o sinal do valor recebido. Confirme os nomes e tipos acima no banco remoto antes do uso com dados reais.

Todas as ferramentas são consultas. Não há ferramentas para alterar registros, sincronizar dados, movimentar dinheiro ou mudar saldos.

## Segurança de dados

O middleware autentica o usuário e as consultas usam o cliente Supabase no contexto desse usuário, sujeitas às políticas RLS. O código de sincronização vincula os registros financeiros a `user_id`; o isolamento efetivo depende das políticas do banco. Verifique as políticas RLS de `pluggy_items`, `accounts` e `transactions` e teste com dois usuários distintos antes de usar dados reais.

## Deploy e validação

Endpoint após deploy: `https://rzghrtuojjxtbakafcmj.supabase.co/functions/v1/finance-mcp`.

Antes de produção: habilitar OAuth 2.1 e registro dinâmico no Supabase, configurar Auth Site URL para a origem publicada do frontend, confirmar assinatura JWT assimétrica, implantar a função e testar descoberta OAuth, login, consentimento, troca de token e as seis ferramentas com usuário de teste. CI verde não comprova deploy nem teste ponta a ponta.
