import { NextResponse } from "next/server";
import { getListCustomFields } from "@/services/clickup";

export async function GET(request: Request) {
  const listId = new URL(request.url).searchParams.get("listId")?.trim();
  if (!listId || !/^\d+$/.test(listId)) {
    return NextResponse.json({ error: "A numeric listId query parameter is required." }, { status: 400 });
  }

  try {
    const fields = await getListCustomFields(listId);
    return NextResponse.json({ fields: fields.map(({ id, name, type }) => ({ id, name, type })) });
  } catch (error) {
    console.error("ClickUp custom fields request failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch custom fields." },
      { status: 502 },
    );
  }
}
