import { GoogleGenAI, Type } from "@google/genai";

export interface Classification {
  client: string | null;
  product: string | null;
  confidence: number;
}

export async function classifyTicket(title: string, description: string): Promise<Classification> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Classify this support ticket by client and product. Return null when the text does not clearly identify a value. Do not invent names. Confidence is a number from 0 to 1.\n\nTitle: ${title}\n\nDescription: ${description}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          client: { type: Type.STRING, nullable: true },
          product: { type: Type.STRING, nullable: true },
          confidence: { type: Type.NUMBER },
        },
        required: ["client", "product", "confidence"],
      },
    },
  });

  const parsed: unknown = JSON.parse(response.text ?? "{}");
  if (!parsed || typeof parsed !== "object") throw new Error("Gemini returned an invalid classification.");
  const result = parsed as Record<string, unknown>;
  const confidence = Number(result.confidence);
  return {
    client: typeof result.client === "string" && result.client.trim() ? result.client.trim() : null,
    product: typeof result.product === "string" && result.product.trim() ? result.product.trim() : null,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  };
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
