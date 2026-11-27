import { NextResponse } from "next/server";
import { classifyTicket } from "@/services/aiClassifier";
import { getTicketFieldOptions } from "@/services/clickup";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { title?: string; description?: string };
    if (!body.title?.trim()) return NextResponse.json({ error: "Ticket title is required." }, { status: 400 });
    const options = await getTicketFieldOptions();
    const classification = await classifyTicket(body.title.trim(), body.description?.trim() ?? "", options);
    return NextResponse.json({ classification });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Classification failed." }, { status: 502 });
  }
}
