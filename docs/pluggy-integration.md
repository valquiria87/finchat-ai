# Pluggy integration status

The TanStack Start server issues Connect Tokens, hosts the official `react-pluggy-connect` widget, binds the returned Item to a signed, browser-scoped owner ID, and reads the Item, accounts, and up to 5,000 transactions per account over the last 12 months. Transaction reads use Pluggy's cursor endpoint (`GET /v2/transactions`). Account and transaction responses stay server-side until normalized into the dashboard's existing data-provider interface. Deleting the connection calls `DELETE /items/{id}`, which revokes consent and removes Pluggy's stored Item data.

## Local setup

Copy `.env.example` to `.env` and set `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, and a random `FINCHAT_SESSION_SECRET` of at least 32 characters. These are server secrets; do not add a `VITE_` prefix or commit `.env`. Start the app with `bun run dev`. The widget permits Sandbox connectors; Sandbox records are synthetic and do not represent a real account. Real institution access depends on Pluggy account access, connector availability, and the user's Open Finance consent.

The browser stores the signed opaque session cookies as `Secure`, `HttpOnly`, and `SameSite=Lax`. The signed owner ID prevents a caller from attaching an arbitrary Item: the server issues its Connect Token with that `clientUserId` and validates the same value before binding the Item. This is a single-browser demonstration identity, not a user login system or production multi-user tenancy. The current deployment preset is Cloudflare, so the cookie identifies the browser session but does not provide durable application account storage. Production use needs real authentication and a persistent user-to-item database.

## Lovable frontend

The current Lovable-connected TanStack app and backend run in the same origin, so it calls relative `/api/pluggy-*` routes and needs no CORS configuration. A separately hosted Lovable frontend is not configured for cross-origin credentials in this change. Before separating it, configure an explicit allowed origin, credentialed CORS, CSRF protections, and an authenticated backend session; do not expose Pluggy credentials or an Item ID to the frontend as authorization.

## MCP status

The branch now contains a Supabase Edge Function at `supabase/functions/finance-mcp/index.ts` with six read-only tools: list accounts, aggregate balances by currency, search transactions, spending by category, monthly summary, and largest expenses. The function uses Supabase OAuth-protected-resource middleware and user-scoped database access; it does not accept caller-supplied Pluggy Item IDs and does not expose write or money-movement tools.

OAuth consent UI is implemented at `/oauth/consent`, and the Supabase configuration enables the OAuth server and dynamic client registration. This is code-level implementation, not proof that the remote project has been configured or deployed. Before production, enable/configure the OAuth server in the Supabase Dashboard, confirm asymmetric JWT signing, set the deployed Site URL, deploy the function, and test discovery, authorization, consent, token exchange, and every MCP tool end to end.

The database ownership model must be verified before real financial data is used. The MCP's queries depend on the actual schema and RLS policies isolating `items`, `accounts`, and `transactions` to the authenticated user. See [SECURITY.md](../SECURITY.md) for the threat model and production checklist.
