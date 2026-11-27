import type { ClickUpApiError, ClickUpCustomField, ClickUpCustomFieldOption, ClickUpTask, ClickUpWebhook } from "@/types/clickup";

export interface TicketFieldOptions {
  client: ClickUpCustomFieldOption[];
  product: ClickUpCustomFieldOption[];
}

const API_BASE = "https://api.clickup.com/api/v2";

function token(): string {
  const value = process.env.CLICKUP_API_TOKEN;
  if (!value) throw new Error("CLICKUP_API_TOKEN is not configured.");
  return value;
}

async function clickupFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: token(), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & ClickUpApiError;
  if (!response.ok) throw new Error(payload.err ?? `ClickUp request failed (${response.status}).`);
  return payload;
}

export async function getTaskDetails(taskId: string): Promise<ClickUpTask> {
  const task = await clickupFetch<ClickUpTask>(`/task/${encodeURIComponent(taskId)}`);
  if (!task?.id) throw new Error("ClickUp returned an invalid task response.");
  return task;
}

export async function getListCustomFields(listId: string): Promise<ClickUpCustomField[]> {
  const response = await clickupFetch<{ fields: ClickUpCustomField[] }>(`/list/${encodeURIComponent(listId)}/field`);
  return response.fields ?? [];
}

const CLASSIFICATION_LIST_ID = "900700253157";

export async function getTicketFieldOptions(taskFields: ClickUpCustomField[] = []): Promise<TicketFieldOptions> {
  const productFieldId = process.env.CLICKUP_PRODUCT_FIELD_ID;
  const clientFieldId = process.env.CLICKUP_CLIENT_FIELD_ID;
  if (!productFieldId || !clientFieldId) {
    throw new Error("CLICKUP_PRODUCT_FIELD_ID and CLICKUP_CLIENT_FIELD_ID must be configured.");
  }

  let productField = taskFields.find((field) => field.id === productFieldId && field.type === "labels" && field.type_config?.options?.length);
  let clientField = taskFields.find((field) => field.id === clientFieldId && field.type === "drop_down" && field.type_config?.options?.length);

  if (!productField || !clientField) {
    const listFields = await getListCustomFields(CLASSIFICATION_LIST_ID);
    productField ??= listFields.find((field) => field.id === productFieldId && field.type === "labels" && field.type_config?.options?.length);
    clientField ??= listFields.find((field) => field.id === clientFieldId && field.type === "drop_down" && field.type_config?.options?.length);
  }

  if (!productField) throw new Error(`Product field ${productFieldId} was not found as a labels field with options in list ${CLASSIFICATION_LIST_ID}.`);
  if (!clientField) throw new Error(`Client field ${clientFieldId} was not found as a drop_down field with options in list ${CLASSIFICATION_LIST_ID}.`);

  return {
    product: productField.type_config?.options ?? [],
    client: clientField.type_config?.options ?? [],
  };
}

export async function updateCustomField(
  taskId: string,
  fieldId: string,
  value: string,
  fieldType?: "labels" | "drop_down",
): Promise<void> {
  const customFieldValue = fieldType === "labels" ? [value] : value;
  await clickupFetch(`/task/${encodeURIComponent(taskId)}/field/${encodeURIComponent(fieldId)}`, {
    method: "POST",
    body: JSON.stringify({ value: customFieldValue }),
  });
}

export async function listWebhooks(teamId: string): Promise<ClickUpWebhook[]> {
  const response = await clickupFetch<{ webhooks: ClickUpWebhook[] }>(`/team/${encodeURIComponent(teamId)}/webhook`);
  return response.webhooks ?? [];
}

export async function createWebhook(teamId: string, endpoint: string): Promise<ClickUpWebhook> {
  const response = await clickupFetch<{ webhook: ClickUpWebhook }>(`/team/${encodeURIComponent(teamId)}/webhook`, {
    method: "POST",
    body: JSON.stringify({ endpoint, events: ["taskCreated", "taskUpdated"] }),
  });
  return response.webhook;
}

export async function updateWebhook(webhook: ClickUpWebhook, endpoint: string): Promise<ClickUpWebhook> {
  await clickupFetch(`/webhook/${encodeURIComponent(webhook.id)}`, {
    method: "PUT",
    body: JSON.stringify({ endpoint, events: ["taskCreated", "taskUpdated"], status: "active" }),
  });
  return { ...webhook, endpoint, events: ["taskCreated", "taskUpdated"] };
}

export function hasClickUpToken(): boolean {
  return Boolean(process.env.CLICKUP_API_TOKEN);
}
