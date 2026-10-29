import { categorizeTransaction } from "@/lib/transaction-categorizer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {}
export class WebhookPersistenceError extends Error {}

export type WebhookEventStatus = "processing" | "completed" | "failed" | "ignored";

export interface WebhookEventRecord {
  event_id: string;
  event_type: string;
  item_id: string | null;
  status: WebhookEventStatus;
  attempts: number;
  error_code: string | null;
  error_message: string | null;
  created_at?: string;
  updated_at?: string;
  processed_at?: string | null;
}

export function getSupabaseServerConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigError(
      "Credenciais do Supabase não configuradas no servidor (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return { url, serviceRoleKey };
}

let serverClientInstance: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  if (!serverClientInstance) {
    serverClientInstance = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClientInstance;
}

export function resetSupabaseServerClientForTest(): void {
  serverClientInstance = null;
}

export type ClaimResult =
  | { action: "process"; record: WebhookEventRecord }
  | { action: "duplicate"; record: WebhookEventRecord }
  | { action: "in_flight"; record: WebhookEventRecord };

export async function claimWebhookEvent(
  params: {
    eventId: string;
    eventType: string;
    itemId?: string | null;
  },
  client?: SupabaseClient,
): Promise<ClaimResult> {
  const supabase = client ?? getSupabaseServerClient();
  const { eventId, eventType, itemId } = params;

  // 1. Inserção atômica inicial
  const { data: inserted, error: insertError } = await supabase
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      item_id: itemId ?? null,
      status: "processing",
      attempts: 1,
    })
    .select()
    .maybeSingle();

  if (inserted && !insertError) {
    return { action: "process", record: inserted as WebhookEventRecord };
  }

  // 2. Se falhou por conflito de chave primária única (código 23505 no Postgres)
  const isConflict =
    insertError &&
    (insertError.code === "23505" ||
      insertError.message?.toLowerCase().includes("duplicate key") ||
      insertError.message?.toLowerCase().includes("unique constraint"));

  if (!isConflict && insertError) {
    throw new WebhookPersistenceError(
      `Falha na persistência do evento ${eventId}: ${insertError.message}`,
    );
  }

  // 3. Consultar o registro já existente
  const { data: existing, error: fetchError } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (fetchError || !existing) {
    throw new WebhookPersistenceError(
      `Falha ao consultar evento existente ${eventId}: ${fetchError?.message ?? "registro não encontrado"}`,
    );
  }

  const record = existing as WebhookEventRecord;

  // Se já foi processado ou ignorado: deduplicado com sucesso
  if (record.status === "completed" || record.status === "ignored") {
    return { action: "duplicate", record };
  }

  // Se já está sendo processado por outra requisição concorrente
  if (record.status === "processing") {
    return { action: "in_flight", record };
  }

  // Se falhou anteriormente: permitir retentativa segura e incrementar attempts
  if (record.status === "failed") {
    const nextAttempts = (record.attempts ?? 1) + 1;
    const { data: updated, error: updateError } = await supabase
      .from("webhook_events")
      .update({
        status: "processing",
        attempts: nextAttempts,
        updated_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("event_id", eventId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new WebhookPersistenceError(
        `Falha ao reativar evento para retentativa ${eventId}: ${updateError?.message}`,
      );
    }

    return { action: "process", record: updated as WebhookEventRecord };
  }

  return { action: "duplicate", record };
}

export async function markWebhookEventCompleted(
  params: {
    eventId: string;
    status?: "completed" | "ignored";
  },
  client?: SupabaseClient,
): Promise<void> {
  const supabase = client ?? getSupabaseServerClient();
  const { error } = await supabase
    .from("webhook_events")
    .update({
      status: params.status ?? "completed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", params.eventId);

  if (error) {
    throw new WebhookPersistenceError(
      `Falha ao marcar evento ${params.eventId} como concluído: ${error.message}`,
    );
  }
}

export async function markWebhookEventFailed(
  params: {
    eventId: string;
    errorCode?: string;
    errorMessage?: string;
  },
  client?: SupabaseClient,
): Promise<void> {
  const supabase = client ?? getSupabaseServerClient();
  const { error } = await supabase
    .from("webhook_events")
    .update({
      status: "failed",
      error_code: params.errorCode ?? "UNKNOWN_ERROR",
      error_message: params.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", params.eventId);

  if (error) {
    throw new WebhookPersistenceError(
      `Falha ao registrar falha do evento ${params.eventId}: ${error.message}`,
    );
  }
}

export type FinanceSyncPayload = {
  item: {
    id: string;
    status?: string;
    connector?: { name?: string };
  };
  accounts: Array<{
    id: string;
    type?: string;
    name?: string;
    currencyCode?: string | null;
    balance?: number | null;
    creditData?: { availableCreditLimit?: number | null } | null;
  }>;
  transactions: Array<{
    id: string;
    accountId: string;
    date: string;
    description?: string;
    currencyCode?: string | null;
    amount: number;
    category?: string | null;
  }>;
};

/**
 * Persiste dados bancários com a chave de serviço somente no servidor.
 * O userId deve vir de uma sessão Supabase já validada, nunca do corpo do cliente.
 */
export async function syncPluggyFinanceData(
  userId: string,
  data: FinanceSyncPayload,
  client?: SupabaseClient,
): Promise<{ accounts: number; transactions: number }> {
  const supabase = client ?? getSupabaseServerClient();

  const { error: itemError } = await supabase.from("pluggy_items").upsert(
    {
      user_id: userId,
      pluggy_item_id: data.item.id,
      status: data.item.status ?? "updated",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,pluggy_item_id" },
  );
  if (itemError) {
    throw new WebhookPersistenceError(
      `Falha ao salvar conexão bancária ${data.item.id}: ${itemError.message}`,
    );
  }

  const accountIds = new Map<string, string>();
  for (const account of data.accounts) {
    const { data: savedAccount, error: accountError } = await supabase
      .from("accounts")
      .upsert(
        {
          user_id: userId,
          pluggy_account_id: account.id,
          pluggy_item_id: data.item.id,
          name: account.name?.trim() || "Conta bancária",
          type: account.type ?? null,
          currency: account.currencyCode || "BRL",
          balance: account.balance ?? null,
          credit_limit: account.creditData?.availableCreditLimit ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,pluggy_account_id" },
      )
      .select("id,pluggy_account_id")
      .single();

    if (accountError || !savedAccount) {
      throw new WebhookPersistenceError(
        `Falha ao salvar conta ${account.id}: ${accountError?.message ?? "registro não retornado"}`,
      );
    }
    accountIds.set(savedAccount.pluggy_account_id as string, savedAccount.id as string);
  }

  let savedTransactions = 0;
  for (const transaction of data.transactions) {
    const accountId = accountIds.get(transaction.accountId);
    if (!accountId) {
      // Ignore transactions whose account was not included in this sync response.
      continue;
    }
    const date = new Date(transaction.date);
    if (!Number.isFinite(date.getTime())) continue;

    const { error: transactionError } = await supabase.from("transactions").upsert(
      {
        user_id: userId,
        account_id: accountId,
        pluggy_transaction_id: transaction.id,
        date: date.toISOString(),
        description: transaction.description?.trim() || "Transação bancária",
        amount: transaction.amount,
        currency: transaction.currencyCode || "BRL",
        category: transaction.category?.trim() || categorizeTransaction(transaction.description ?? ""),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,pluggy_transaction_id" },
    );
    if (transactionError) {
      throw new WebhookPersistenceError(
        `Falha ao salvar transação ${transaction.id}: ${transactionError.message}`,
      );
    }
    savedTransactions++;
  }

  return { accounts: accountIds.size, transactions: savedTransactions };
}

/** Resolve a conexão Pluggy ao dono local sem aceitar user_id enviado pelo webhook. */
export async function findPluggyItemOwner(
  itemId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const supabase = client ?? getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pluggy_items")
    .select("user_id")
    .eq("pluggy_item_id", itemId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new WebhookPersistenceError(
      `Falha ao localizar dono da conexão ${itemId}: ${error.message}`,
    );
  }
  return (data?.user_id as string | undefined) ?? null;
}
