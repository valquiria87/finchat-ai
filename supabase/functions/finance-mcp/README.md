# Nexora Finance MCP Edge Function

Authenticated, read-only MCP endpoint for the Nexora Finance data owned by the signed-in Supabase user.

## Tools

- `finance_summary`: account balances and recent income/expense totals.
- `list_finance_accounts`: lists the user's accounts.
- `list_finance_transactions`: lists transactions with optional date/category filters.

Every request must include a valid Supabase access token in `Authorization: Bearer <access-token>`. The function validates the token with Supabase Auth and forwards it to the Supabase client, so database reads remain subject to the user's RLS policies. It intentionally does not use the service-role key and exposes no write or transfer tools.

## Endpoint

After deployment, the endpoint is:

`https://rzghrtuojjxtbakafcmj.supabase.co/functions/v1/finance-mcp`

MCP clients must support Streamable HTTP and send both `Content-Type: application/json` and `Accept: application/json, text/event-stream`.

## Deploy

1. Ensure the finance tables have RLS policies restricting rows to `auth.uid() = user_id`.
2. Deploy `finance-mcp` to the Supabase project `rzghrtuojjxtbakafcmj`.
3. Use a valid signed-in user's Supabase access token when testing with an MCP client.
4. Test `tools/list`, then call each read-only tool with a test user that has finance data.

The MCP endpoint code is committed to GitHub; deployment and live verification are separate steps. The endpoint currently uses direct Supabase Bearer-token authentication. For clients that require automatic sign-in and consent, OAuth 2.1 discovery/consent must be configured separately before claiming plug-and-play OAuth support.
