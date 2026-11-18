import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { ClickUpWebhookEvent } from "@/types/clickup";
import { updateCustomField, getTaskDetails } from "@/services/clickup";
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
  if (event.event !== "taskCreated") return NextResponse.json({ received: true, ignored: true });
  if (!event.task_id) return NextResponse.json({ error: "Missing task_id." }, { status: 400 });

  try {
    const task = await getTaskDetails(event.task_id);
    const classification = await classifyTicket(task.name, task.description ?? task.text_content ?? "");
    const updates: Promise<void>[] = [];
    if (classification.product && process.env.CLICKUP_PRODUCT_FIELD_ID) {
      updates.push(updateCustomField(task.id, process.env.CLICKUP_PRODUCT_FIELD_ID, classification.product));
    }
    if (classification.client && process.env.CLICKUP_CLIENT_FIELD_ID) {
      updates.push(updateCustomField(task.id, process.env.CLICKUP_CLIENT_FIELD_ID, classification.client));
    }
    await Promise.all(updates);
    return NextResponse.json({ received: true, taskId: task.id, classification });
  } catch (error) {
    console.error("ClickUp webhook processing failed:", error);
    return NextResponse.json({ error: "Ticket processing failed." }, { status: 500 });
  }
}
