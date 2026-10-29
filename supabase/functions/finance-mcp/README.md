# Nexora Finance MCP Edge Function

Authenticated, read-only MCP endpoint for financial data owned by the signed-in Supabase user.

## Read-only tools

- `finance_summary`: account balances and recent income/expense totals.
- `list_finance_accounts`: lists the user's accounts.
- `list_finance_transactions`: lists transactions with optional date/category filters.

The function uses Supabase's official OAuth protected-resource middleware and `withSupabase({ auth: "user" })`. MCP clients can discover the OAuth authorization server; authenticated tool queries use a user-scoped client and remain subject to Row Level Security (RLS). The function does not use the service-role key and exposes no write or transfer tools.

## Endpoint

After deployment:

`https://rzghrtuojjxtbakafcmj.supabase.co/functions/v1/finance-mcp`

The OAuth protected-resource metadata is served at the endpoint path plus `/oauth-protected-resource`.

## Deployment and dashboard setup

1. Confirm finance tables have RLS enabled and policies restricting rows to the authenticated owner (for example, `auth.uid() = user_id`).
2. Deploy the `finance-mcp` Edge Function and push the Supabase configuration.
3. In Supabase Dashboard, open **Authentication → OAuth Server** and enable the OAuth 2.1 server and dynamic client registration.
4. Ensure the project's JWT signing key uses an asymmetric algorithm (ES256 or RS256); `withSupabase` validates tokens using the project's JWKS.
5. Set the Auth **Site URL** to the deployed Nexora frontend origin and set the authorization URL path to `/oauth/consent`.
6. Test with an OAuth-capable MCP client and a test account. Verify discovery, sign-in, explicit consent, token exchange, and each read-only tool.
7. Verify the project's RLS policies and data schema with a test user before connecting any real finance data.

The repo configuration enables OAuth for local Supabase development. Cloud dashboard settings, deployed frontend URL, asymmetric JWT signing, function deployment, and live end-to-end verification still need to be confirmed in the Supabase project. Do not treat a successful GitHub CI run as proof of deployment.
