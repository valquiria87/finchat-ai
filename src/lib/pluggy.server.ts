import { z } from "zod";

const API = "https://api.pluggy.ai";
const COOKIE = "finchat_pluggy_item";
const OWNER_COOKIE = "finchat_owner";

export class PluggyError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PluggyError";
  }
}

function config() {
  const clientId = process.env["PLUGGY_CLIENT_ID"];
  const clientSecret = process.env["PLUGGY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new PluggyError("Credenciais da Pluggy não configuradas.");
  return { clientId, clientSecret };
}

export function pluggyTokenConfigError(): PluggyError | null {
  if (!process.env["PLUGGY_CLIENT_ID"] || !process.env["PLUGGY_CLIENT_SECRET"])
    return new PluggyError(
      "Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no ambiente do servidor.",
    );
  const secret = process.env["FINCHAT_SESSION_SECRET"];
  if (!secret || secret.length < 32)
    return new PluggyError(
      "Configure FINCHAT_SESSION_SECRET no ambiente do servidor (mínimo 32 caracteres).",
    );
  return null;
}

async function apiKey() {
  const { clientId, clientSecret } = config();
  const response = await fetch(`${API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const body = (await response.json().catch(() => ({}))) as { apiKey?: string };
  if (!response.ok || !body.apiKey) throw new PluggyError("Falha na autenticação com a Pluggy.");
  return body.apiKey;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_GET_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries only idempotent GETs on rate limits and transient upstream failures. */
export async function pluggyFetch(path: string, init?: RequestInit) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new PluggyError("Caminho da API Pluggy inválido.");
  }

  const key = await apiKey();
  const method = (init?.method ?? "GET").toUpperCase();
  const retryable = method === "GET";
  let response: Response | undefined;

  for (let attempt = 0; attempt <= (retryable ? MAX_GET_RETRIES : 0); attempt++) {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { "X-API-KEY": key, ...(init?.headers ?? {}) },
    });

    if (response.ok) return response;
    if (
      !retryable ||
      !RETRYABLE_STATUS.has(response.status) ||
      attempt === MAX_GET_RETRIES
    ) {
      break;
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const delayMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 2000)
        : 250 * 2 ** attempt;

    console.warn(
      JSON.stringify({
        level: "warn",
        service: "pluggy-client",
        operation: "http_request",
        method,
        status: response.status,
        attempt: attempt + 1,
        retryInMs: delayMs,
      }),
    );
    await sleep(delayMs);
  }

  console.error(
    JSON.stringify({
      level: "error",
      service: "pluggy-client",
      operation: "http_request",
      method,
      status: response?.status ?? 0,
      retryable,
      outcome: "failed",
    }),
  );
  throw new PluggyError(
    "Não foi possível consultar os dados da instituição.",
    response?.status,
  );
}

function sessionSecret() {
  const secret = process.env["FINCHAT_SESSION_SECRET"];
  if (!secret || secret.length < 32)
    throw new PluggyError(
      "Sessão Pluggy indisponível: configure FINCHAT_SESSION_SECRET (mínimo 32 caracteres).",
    );
  return secret;
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function cookie(request: Request, name: string) {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return raw;
}

export async function sessionIdentity(request: Request) {
  const raw = cookie(request, OWNER_COOKIE);
  if (raw) {
    const [owner, signature] = raw.split(".");
    if (owner && signature && /^[\w-]{1,100}$/.test(owner) && (await sign(owner)) === signature)
      return owner;
  }
  return crypto.randomUUID();
}

export async function ownerCookie(owner: string) {
  return `${OWNER_COOKIE}=${owner}.${await sign(owner)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export async function linkedItemId(request: Request): Promise<string | null> {
  const raw = cookie(request, COOKIE);
  if (!raw) return null;
  const [itemId, owner, signature] = raw.split(".");
  if (
    !itemId ||
    !owner ||
    !signature ||
    owner !== (await sessionIdentity(request)) ||
    !/^[\w-]{1,100}$/.test(itemId)
  )
    return null;
  try {
    return (await sign(`${itemId}:${owner}`)) === signature ? itemId : null;
  } catch {
    return null;
  }
}

export async function sessionCookie(itemId: string, owner: string) {
  if (!/^[\w-]{1,100}$/.test(itemId)) throw new PluggyError("ID do item inválido.");
  return `${COOKIE}=${itemId}.${owner}.${await sign(`${itemId}:${owner}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export const clearSessionCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function errorResponse(error: unknown) {
  const message = error instanceof PluggyError ? error.message : "Falha ao comunicar com a Pluggy.";
  const status =
    message.includes("não configuradas") || message.includes("FINCHAT_SESSION_SECRET") ? 503 : 502;
  return Response.json({ error: message }, { status });
}

export type PluggyAccount = {
  id: string;
  type?: string;
  subtype?: string | null;
  name?: string;
  number?: string | null;
  currencyCode?: string | null;
  balance?: number | null;
  creditData?: { level?: number | null; availableCreditLimit?: number | null } | null;
};
export type PluggyTransaction = {
  id: string;
  accountId: string;
  date: string;
  description?: string;
  currencyCode?: string | null;
  amount: number;
  category?: string | null;
  status?: string;
  type?: string;
};

async function paged<T>(path: string, maxPages = 10): Promise<T[]> {
  let next: string | null = path;
  const results: T[] = [];
  for (let page = 0; next && page < maxPages; page++) {
    const response = await pluggyFetch(next);
    const data = (await response.json()) as { results?: T[]; next?: string | null };
    results.push(...(data.results ?? []));
    next = data.next ? `/v2/transactions${data.next}` : null;
  }
  return results;
}

export async function fetchFinanceData(itemId: string) {
  const [itemResponse, accountsResponse] = await Promise.all([
    pluggyFetch(`/items/${encodeURIComponent(itemId)}`),
    pluggyFetch(`/accounts?itemId=${encodeURIComponent(itemId)}`),
  ]);
  const item = (await itemResponse.json()) as {
    id: string;
    status?: string;
    clientUserId?: string;
    connector?: { name?: string };
  };
  const accountPayload = (await accountsResponse.json()) as { results?: PluggyAccount[] };
  const accounts = accountPayload.results ?? [];
  const dateFrom = new Date();
  dateFrom.setFullYear(dateFrom.getFullYear() - 1);
  const txs = await Promise.all(
    accounts.map((account) =>
      paged<PluggyTransaction>(
        `/v2/transactions?accountId=${encodeURIComponent(account.id)}&dateFrom=${dateFrom.toISOString().slice(0, 10)}`,
      ),
    ),
  );
  return { item, accounts, transactions: txs.flat() };
}

/**
 * Comparação em tempo constante para mitigar ataques de temporização (timing attacks).
 * Implementada com TextEncoder e loop bitwise constante sobre Uint8Array para compatibilidade
 * universal (Cloudflare Workers, Node.js, Bun e navegadores), sem depender de APIs exclusivas
 * de runtime como `node:crypto` ou presumir existência de `timingSafeEqual` na Web Crypto API.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimWebhookEvent,
  markWebhookEventCompleted,
  markWebhookEventFailed,
  SupabaseConfigError,
  findPluggyItemOwner,
  getSupabaseServerClient,
  syncPluggyFinanceData,
} from "./supabase.server";

export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.byteLength !== bBytes.byteLength) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < aBytes.byteLength; i++) {
    mismatch |= aBytes[i]! ^ bBytes[i]!;
  }
  return mismatch === 0;
}

export function verifyPluggyWebhookSecret(request: Request): {
  valid: boolean;
  status?: number;
  error?: string;
} {
  const expectedSecret = process.env["PLUGGY_WEBHOOK_SECRET"];
  if (!expectedSecret) {
    return {
      valid: false,
      status: 503,
      error: "PLUGGY_WEBHOOK_SECRET não configurado no servidor.",
    };
  }

  const providedSecret =
    request.headers.get("x-webhook-secret") ??
    request.headers.get("x-signature") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!providedSecret) {
    return {
      valid: false,
      status: 401,
      error: "Header de autenticação do webhook ausente.",
    };
  }

  if (!timingSafeEqual(providedSecret, expectedSecret)) {
    return {
      valid: false,
      status: 401,
      error: "Segredo do webhook inválido.",
    };
  }

  return { valid: true };
}

/**
 * Armazenamento em memória para deduplicação de eventos de webhook (idempotência).
 *
 * LIMITAÇÃO DOCUMENTADA:
 * Este controle é mantido estritamente na memória do processo local.
 * Ele não persiste entre reinicializações do servidor nem é compartilhado entre múltiplas
 * instâncias/réplicas (como no ambiente serverless / Cloudflare Workers).
 * Em um ambiente de produção definitivo, a idempotência deve ser persistida
 * em banco de dados relacional (ex.: Supabase/PostgreSQL) ou cache distribuído (Redis).
 */
const processedWebhookEventIds = new Set<string>();
const MAX_PROCESSED_EVENTS = 1000;

export function isWebhookEventProcessed(eventId: string): boolean {
  return processedWebhookEventIds.has(eventId);
}

export function recordProcessedWebhookEvent(eventId: string): void {
  if (processedWebhookEventIds.size >= MAX_PROCESSED_EVENTS) {
    const oldest = processedWebhookEventIds.values().next().value;
    if (oldest) processedWebhookEventIds.delete(oldest);
  }
  processedWebhookEventIds.add(eventId);
}

export function clearWebhookProcessedEventsForTest(): void {
  processedWebhookEventIds.clear();
}

export type PluggyItemDetails = {
  id: string;
  status?: string;
  clientUserId?: string;
  connector?: { name?: string };
  error?: { code?: string; message?: string } | null;
};

export async function fetchPluggyItem(itemId: string): Promise<PluggyItemDetails> {
  const response = await pluggyFetch(`/items/${encodeURIComponent(itemId)}`);
  return (await response.json()) as PluggyItemDetails;
}

function logSafeWebhookEvent(event: string, eventId: string, _itemId?: string, detail?: string) {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "info",
    service: "pluggy-webhook",
    event,
    eventId,
    outcome: detail ?? "accepted",
  }));
}

export type PluggyWebhookPayload = {
  event?: unknown;
  eventId?: unknown;
  itemId?: unknown;
  clientUserId?: unknown;
  triggeredBy?: unknown;
  error?: { code?: unknown; message?: unknown } | null;
};

export async function handlePluggyWebhook(
  request: Request,
  supabaseClient?: SupabaseClient,
): Promise<Response> {
  // 1. Validar autenticidade do webhook com segredo
  const auth = verifyPluggyWebhookSecret(request);
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: auth.status ?? 401 });
  }

  // 2. Parsear e validar formato JSON do payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON do webhook malformado." }, { status: 400 });
  }

  const payloadSchema = z.object({
    event: z.string().trim().min(1).max(120),
    eventId: z.string().regex(/^[\w-]{1,100}$/),
    itemId: z.string().regex(/^[\w-]{1,100}$/).optional(),
    clientUserId: z.unknown().optional(),
    triggeredBy: z.unknown().optional(),
    error: z.object({
      code: z.unknown().optional(),
      message: z.unknown().optional(),
    }).nullable().optional(),
  }).passthrough();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        service: "pluggy-webhook",
        operation: "validate_payload",
        outcome: "rejected",
        issueCount: parsed.error.issues.length,
      }),
    );
    return Response.json(
      { error: "Payload inválido: verifique event, eventId e itemId." },
      { status: 400 },
    );
  }

  const payload = parsed.data as PluggyWebhookPayload;
  const event = payload.event as string;
  const eventId = payload.eventId as string;
  const itemId = payload.itemId;

  const isItemEvent =
    event === "item/created" ||
    event === "item/updated" ||
    event === "item/error" ||
    event === "item/deleted";

  if (isItemEvent && (typeof itemId !== "string" || !/^[\w-]{1,100}$/.test(itemId))) {
    return Response.json(
      { error: "Payload inválido: campo 'itemId' ausente ou inválido para eventos de item." },
      { status: 400 },
    );
  }

  // 3. Persistência atômica e deduplicação no Supabase
  let claim;
  try {
    claim = await claimWebhookEvent(
      {
        eventId,
        eventType: event,
        itemId: typeof itemId === "string" ? itemId : null,
      },
      supabaseClient,
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`[Pluggy Webhook] Falha de persistência no Supabase para ${eventId}:`, errorMsg);
    const status = err instanceof SupabaseConfigError ? 503 : 500;
    return Response.json({ error: `Falha na persistência do webhook: ${errorMsg}` }, { status });
  }

  // Se já foi concluído ou ignorado com sucesso: deduplicado!
  if (claim.action === "duplicate") {
    logSafeWebhookEvent(
      event,
      eventId,
      typeof itemId === "string" ? itemId : undefined,
      "duplicado ignorado",
    );
    return Response.json({ received: true, duplicate: true, eventId }, { status: 200 });
  }

  // Se está atualmente sendo processado por outra requisição concorrente
  if (claim.action === "in_flight") {
    logSafeWebhookEvent(
      event,
      eventId,
      typeof itemId === "string" ? itemId : undefined,
      "em processamento concorrente",
    );
    return Response.json({ received: true, inFlight: true, eventId }, { status: 200 });
  }

  // 4. Processar eventos relevantes
  if (isItemEvent) {
    const validItemId = itemId as string;
    let itemStatus: string | undefined;

    // 5. Para eventos de item ativo (created, updated, error), validar a existência do item na Pluggy
    if (event !== "item/deleted") {
      // Distinguish a missing/invalid Pluggy item from a transient sync failure.
      try {
        const item = await fetchPluggyItem(validItemId);
        itemStatus = item.status;
      } catch (err) {
        const status = err instanceof PluggyError ? err.status : undefined;
        const isNotFound = status === 404;
        const msg = err instanceof Error ? err.message : "Item não pôde ser verificado.";

        await markWebhookEventFailed(
          {
            eventId,
            errorCode: isNotFound ? "ITEM_VERIFICATION_FAILED" : "ITEM_LOOKUP_FAILED",
            errorMessage: msg.slice(0, 500),
          },
          supabaseClient,
        ).catch(() => undefined);

        return Response.json(
          {
            error: isNotFound
              ? "O item não pôde ser verificado na Pluggy."
              : "Não foi possível verificar o item na Pluggy.",
          },
          { status: isNotFound ? 422 : 503 },
        );
      }

      try {
        // Resolve ownership only from our server-side connection mapping.
        const ownerId = await findPluggyItemOwner(validItemId, supabaseClient);
        if (!ownerId) {
          await markWebhookEventFailed(
            {
              eventId,
              errorCode: "OWNER_MAPPING_NOT_FOUND",
              errorMessage: "A conexão ainda não foi associada a um usuário autenticado.",
            },
            supabaseClient,
          );
          return Response.json(
            { error: "Conexão ainda não mapeada para um usuário; tente novamente." },
            { status: 503 },
          );
        }

        const financeData = await fetchFinanceData(validItemId);
        await syncPluggyFinanceData(ownerId, financeData, supabaseClient);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Item não pôde ser sincronizado.";

        await markWebhookEventFailed(
          {
            eventId,
            errorCode: "ITEM_SYNC_FAILED",
            errorMessage: msg.slice(0, 500),
          },
          supabaseClient,
        ).catch(() => undefined);

        return Response.json(
          { error: "Não foi possível sincronizar a conexão bancária." },
          { status: 503 },
        );
      }
    } else {
      try {
        const supabase = supabaseClient ?? getSupabaseServerClient();
        const { error } = await supabase
          .from("pluggy_items")
          .update({ status: "deleted", updated_at: new Date().toISOString() })
          .eq("pluggy_item_id", validItemId);
        if (error) throw new Error(error.message);
      } catch {
        await markWebhookEventFailed(
          {
            eventId,
            errorCode: "ITEM_DELETE_SYNC_FAILED",
            errorMessage: "Não foi possível registrar a exclusão da conexão.",
          },
          supabaseClient,
        ).catch(() => undefined);
        return Response.json(
          { error: "Não foi possível registrar a exclusão da conexão." },
          { status: 503 },
        );
      }
    }

    // 6. Log seguro (sem credenciais nem dados bancários)
    const errCode =
      typeof payload.error?.code === "string" ? `erro: ${payload.error.code}` : undefined;
    logSafeWebhookEvent(
      event,
      eventId,
      validItemId,
      errCode ?? (itemStatus ? `status: ${itemStatus}` : undefined),
    );

    // 7. Marcar como concluído no Supabase
    try {
      await markWebhookEventCompleted({ eventId, status: "completed" }, supabaseClient);
    } catch (err) {
      console.error(`[Pluggy Webhook] Falha ao finalizar status do evento ${eventId}:`, err);
      return Response.json(
        { error: "Falha ao finalizar persistência do evento no banco de dados." },
        { status: 500 },
      );
    }

    return Response.json(
      {
        received: true,
        event,
        eventId,
        itemId: validItemId,
        ...(itemStatus ? { itemStatus } : {}),
      },
      { status: 200 },
    );
  }

  // Evento não-item reconhecido mas que não requer sincronização (ex: connector/status_updated)
  logSafeWebhookEvent(event, eventId, undefined, "evento ignorado sem erro");
  try {
    await markWebhookEventCompleted({ eventId, status: "ignored" }, supabaseClient);
  } catch (err) {
    console.error(`[Pluggy Webhook] Falha ao registrar evento ignorado ${eventId}:`, err);
  }

  return Response.json({ received: true, event, eventId, ignored: true }, { status: 200 });
}
