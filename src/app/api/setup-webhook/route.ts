import { NextResponse } from "next/server";
import { createWebhook, listWebhooks } from "@/services/clickup";

export async function GET(request: Request) {
  const teamId = new URL(request.url).searchParams.get("teamId") || process.env.CLICKUP_TEAM_ID;
  if (!teamId) return NextResponse.json({ error: "Provide a ClickUp team ID." }, { status: 400 });
  try {
    return NextResponse.json({ webhooks: await listWebhooks(teamId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not list webhooks." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { teamId?: string; endpoint?: string };
    const teamId = body.teamId?.trim() || process.env.CLICKUP_TEAM_ID;
    if (!teamId) return NextResponse.json({ error: "ClickUp team ID is required." }, { status: 400 });
    const endpoint = body.endpoint?.trim() || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`;
    if (!endpoint || !endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "A public HTTPS endpoint is required. Set NEXT_PUBLIC_APP_URL or provide an endpoint." }, { status: 400 });
    }
    const existing = await listWebhooks(teamId);
    const duplicate = existing.find((webhook) => webhook.endpoint === endpoint && webhook.events.includes("taskCreated"));
    if (duplicate) return NextResponse.json({ webhook: duplicate, alreadyExists: true });
    const webhook = await createWebhook(teamId, endpoint);
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not register webhook." }, { status: 502 });
  }
}
