import type { ClickUpApiError, ClickUpTask, ClickUpWebhook } from "@/types/clickup";

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
  const response = await clickupFetch<{ task: ClickUpTask }>(`/task/${encodeURIComponent(taskId)}`);
  return response.task;
}

export async function updateCustomField(taskId: string, fieldId: string, value: string): Promise<void> {
  await clickupFetch(`/task/${encodeURIComponent(taskId)}/field/${encodeURIComponent(fieldId)}`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function listWebhooks(teamId: string): Promise<ClickUpWebhook[]> {
  const response = await clickupFetch<{ webhooks: ClickUpWebhook[] }>(`/team/${encodeURIComponent(teamId)}/webhook`);
  return response.webhooks ?? [];
}

export async function createWebhook(teamId: string, endpoint: string): Promise<ClickUpWebhook> {
  const response = await clickupFetch<{ webhook: ClickUpWebhook }>(`/team/${encodeURIComponent(teamId)}/webhook`, {
    method: "POST",
    body: JSON.stringify({ endpoint, events: ["taskCreated"] }),
  });
  return response.webhook;
}

export function hasClickUpToken(): boolean {
  return Boolean(process.env.CLICKUP_API_TOKEN);
}
