import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { ClickUpWebhookEvent } from "@/types/clickup";
import { updateCustomField, getTaskDetails, getTicketFieldOptions } from "@/services/clickup";
import { classifyTicket } from "@/services/aiClassifier";

export const runtime = "nodejs";

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.CLICKUP_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: ClickUpWebhookEvent;
  try {
    event = JSON.parse(rawBody) as ClickUpWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const updatesTicketText = event.event === "taskUpdated" && event.history_items?.some((item) => {
    const changedField = item.field?.toLowerCase();
    return changedField === "content" || changedField === "description" || changedField === "name" || changedField === "title";
  });
  if (event.event !== "taskCreated" && !updatesTicketText) {
    return NextResponse.json({ received: true, ignored: true });
  }
  if (!event.task_id) return NextResponse.json({ error: "Missing task_id." }, { status: 400 });

  try {
    const task = await getTaskDetails(event.task_id);
    const options = await getTicketFieldOptions(task.custom_fields ?? []);
    const classification = await classifyTicket(task.name, task.description ?? task.text_content ?? "", options);
    const updates: Promise<void>[] = [];
    if (classification.productOptionId && process.env.CLICKUP_PRODUCT_FIELD_ID) {
      updates.push(updateCustomField(task.id, process.env.CLICKUP_PRODUCT_FIELD_ID, classification.productOptionId, "labels"));
    }
    if (classification.clientOptionId && process.env.CLICKUP_CLIENT_FIELD_ID) {
      updates.push(updateCustomField(task.id, process.env.CLICKUP_CLIENT_FIELD_ID, classification.clientOptionId, "drop_down"));
    }
    await Promise.all(updates);
    return NextResponse.json({ received: true, taskId: task.id, classification });
  } catch (error) {
    console.error("ClickUp webhook processing failed:", error);
    return NextResponse.json({ error: "Ticket processing failed." }, { status: 500 });
  }
}
