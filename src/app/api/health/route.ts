import { NextResponse } from "next/server";
import { hasClickUpToken } from "@/services/clickup";
import { hasGeminiKey } from "@/services/aiClassifier";

export async function GET() {
  return NextResponse.json({ clickup: hasClickUpToken(), gemini: hasGeminiKey() });
}
