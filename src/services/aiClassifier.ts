import { GoogleGenAI } from "@google/genai";
import type { ClickUpCustomFieldOption } from "@/types/clickup";
import type { TicketFieldOptions } from "@/services/clickup";

export interface Classification {
  client: string | null;
  product: string | null;
  clientOptionId: string | null;
  productOptionId: string | null;
  confidence: number;
}

function optionLabel(option: ClickUpCustomFieldOption): string {
  return option.name?.trim() || option.label?.trim() || option.id;
}

function findOption(value: unknown, options: ClickUpCustomFieldOption[]): ClickUpCustomFieldOption | null {
  if (typeof value !== "string") return null;
  const optionId = value.trim();
  return options.find((option) => option.id === optionId) ?? null;
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isMyAccountIssue(title: string, description: string): boolean {
  const text = normalizeForMatch(`${title}\n${description}`);
  return /\b(my[\s-]*account|myacc|account|conta|login|log[\s-]?in|sign[\s-]?in|password|senha|credentials?|credenciais?|authentication|autenticacao|mfa|2fa|profile|perfil)\b/.test(text);
}

export async function classifyTicket(
  title: string,
  description: string,
  options: TicketFieldOptions,
): Promise<Classification> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const productOptions = options.product.filter((option) => option.id);
  const clientOptions = options.client.filter((option) => option.id);
  if (!productOptions.length || !clientOptions.length) {
    throw new Error("The configured product and client fields must both have at least one option.");
  }

  const accountIssue = isMyAccountIssue(title, description);
  const myAccountOption = productOptions.find((option) => {
    const label = normalizeForMatch(optionLabel(option)).replace(/\s+/g, " ").trim();
    return label === "my account" || label === "myacc";
  });
  if (accountIssue && !myAccountOption) {
    throw new Error('The product field must include the "MYACC" option for account and login tickets.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const request = {
    input: `Classify this support ticket using only the allowed ClickUp field options below. For client and product, return the exact option ID, never its name. Return null when no option is clearly supported by the ticket. Do not invent, paraphrase, or select an ID that is not listed. Confidence is a number from 0 to 1.${accountIssue ? `\n\nThis ticket concerns an account, login, password, credentials, authentication, or profile issue. Set product to the exact MYACC option ID ${myAccountOption!.id}.` : ""}\n\nCLIENTES options (id and name):\n${JSON.stringify(clientOptions.map((option) => ({ id: option.id, name: optionLabel(option) })))}\n\nPRODUTO options (id and name):\n${JSON.stringify(productOptions.map((option) => ({ id: option.id, name: optionLabel(option) })))}\n\nTicket title: ${title}\n\nTicket description: ${description}`,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        properties: {
          client: { type: ["string", "null"], enum: [...clientOptions.map((option) => option.id), null] },
          product: { type: ["string", "null"], enum: [...productOptions.map((option) => option.id), null] },
          confidence: { type: "number" },
        },
        required: ["client", "product", "confidence"],
      },
    },
  };

  const response = await ai.interactions.create({ model: "gemini-3.5-flash-lite", ...request });

  const outputText = response.output_text;
  if (!outputText) throw new Error("Gemini returned an empty classification.");

  const parsed: unknown = JSON.parse(outputText);
  if (!parsed || typeof parsed !== "object") throw new Error("Gemini returned an invalid classification.");
  const result = parsed as Record<string, unknown>;
  const confidence = Number(result.confidence);
  const client = findOption(result.client, clientOptions);
  const product = accountIssue ? myAccountOption! : findOption(result.product, productOptions);
  return {
    client: client ? optionLabel(client) : null,
    product: product ? optionLabel(product) : null,
    clientOptionId: client?.id ?? null,
    productOptionId: product?.id ?? null,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  };
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
