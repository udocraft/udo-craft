import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const AI_QUOTA_LIMIT = 3;

export const maxDuration = 60;

const ILLUSTRATION_SYSTEM_PROMPT = `You are a professional illustration artist for a print-on-demand platform.
Your task is to generate standalone artwork and illustrations suitable for printing on merch products.

Rules:
- Generate ONLY standalone artwork, illustrations, patterns, or graphic designs — NO people wearing merch.
- The output should be suitable for direct printing on products (t-shirts, hoodies, bags, etc.).
- Focus on clean, high-contrast designs that work well on fabric.
- Styles can include: vector-style illustration, flat design, line art, watercolor, geometric, typographic, etc.
- Do NOT generate photorealistic mockups of people wearing products.
- The design should have a transparent or solid background suitable for print.`;

const ENHANCE_DRAWING_SYSTEM_PROMPT = `You are a professional illustration artist specializing in enhancing hand-drawn sketches.
Your task is to transform a rough sketch or drawing into polished, print-ready illustration artwork.

Rules:
- Enhance the provided sketch into clean, professional illustration artwork.
- Preserve the original composition, shapes, and intent of the sketch.
- Improve line quality, add shading or color if appropriate, and make it print-ready.
- The output should be suitable for direct printing on merch products.
- Do NOT add people, backgrounds, or elements not present in the original sketch unless they clearly improve the design.
- Maintain the style and character of the original drawing while elevating its quality.`;

const ALLOWED_SYSTEM_PROMPTS = new Set([
  ILLUSTRATION_SYSTEM_PROMPT,
  ENHANCE_DRAWING_SYSTEM_PROMPT,
]);

const SYSTEM_PROMPT = `You are a merch visualization assistant for a Ukrainian print-on-demand platform.
Your task is to generate a realistic photographic mockup image showing a person wearing or using the product described below.

Rules:
- Generate ONLY realistic merch/product visualization images with people (unless explicitly asked to generate objects only).
- The person should have a human appearance, ideally in a culturally relevant context (e.g., urban Kyiv, café, modern office, campus, IT company workspace, corporate event, HoReCa).
- Focus on themes suitable for businesses: IT companies, corporate events, HoReCa, startups, campus, etc.
- The product must be clearly visible and prominently featured.
- Do NOT generate abstract art, logos, or patterns instead of the mockup. The output MUST be a high-quality lifestyle photo placeholder.
- Do NOT alter the design printed on the product — show it as-is.
- The image should look like a professional lifestyle product photo.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Quota is reserved server-side before the paid call. A failed generation
  // still consumes an attempt; the client can no longer skip or inflate it.
  const service = createServiceClient();
  const { data: quota, error: quotaError } = await service
    .from("user_ai_quota")
    .select("attempts_used")
    .eq("user_id", user.id)
    .maybeSingle();
  if (quotaError) {
    return NextResponse.json({ error: "Unable to verify AI quota" }, { status: 503 });
  }
  if ((quota?.attempts_used ?? 0) >= AI_QUOTA_LIMIT) {
    return NextResponse.json({ error: "AI quota exceeded" }, { status: 429 });
  }
  const { error: reserveError } = await service.rpc("increment_ai_quota", { p_user_id: user.id });
  if (reserveError) {
    return NextResponse.json({ error: "Unable to reserve AI quota" }, { status: 503 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI generation is not configured" }, { status: 500 });
  }

  const { prompt, contextDescription, imageDataUrl, canvasDataUrl, hasSelfie, systemPrompt, mode } = await request.json() as {
    prompt: string;
    contextDescription: string;
    imageDataUrl: string;
    canvasDataUrl?: string;
    hasSelfie?: boolean;
    systemPrompt?: string;
    mode?: "illustration" | "enhance" | "mockup";
  };

  // Resolve system prompt: mode flag takes priority, then allowlist match, then default mockup
  let resolvedSystemPrompt: string;
  if (mode === "illustration") {
    resolvedSystemPrompt = ILLUSTRATION_SYSTEM_PROMPT;
  } else if (mode === "enhance") {
    resolvedSystemPrompt = ENHANCE_DRAWING_SYSTEM_PROMPT;
  } else if (systemPrompt && ALLOWED_SYSTEM_PROMPTS.has(systemPrompt.trim())) {
    resolvedSystemPrompt = systemPrompt.trim();
  } else {
    resolvedSystemPrompt = SYSTEM_PROMPT;
  }

  const selfieInstruction = hasSelfie
    ? `\n\nIMPORTANT: The second image provided is a photo of the actual customer. You MUST use their face, body, and appearance — place the merch product on THIS specific person. Keep their likeness accurate.`
    : "";

  const textPart = { text: `${resolvedSystemPrompt}${selfieInstruction}\n\n${contextDescription}\n\n${prompt}` };

  // Extract mimeType and base64 data from the data URL
  const commaIndex = imageDataUrl.indexOf(",");
  const prefix = imageDataUrl.slice(0, commaIndex); // e.g. "data:image/png;base64"
  const mimeType = prefix.replace("data:", "").replace(";base64", "");
  const base64Data = imageDataUrl.slice(commaIndex + 1);

  const inlineDataPart = {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };

  const extraParts: { inlineData: { mimeType: string; data: string } }[] = [];
  if (hasSelfie && canvasDataUrl && canvasDataUrl.includes(",")) {
    const ci = canvasDataUrl.indexOf(",");
    const cMime = canvasDataUrl.slice(0, ci).replace("data:", "").replace(";base64", "");
    const cData = canvasDataUrl.slice(ci + 1);
    extraParts.push({ inlineData: { mimeType: cMime, data: cData } });
  }

  const geminiBody = {
    contents: [
      {
        parts: [textPart, inlineDataPart, ...extraParts],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.json().catch(() => ({})) as { error?: { message?: string } };
    const detail = errBody?.error?.message ?? geminiRes.statusText;
    return NextResponse.json(
      { error: `Gemini API error: ${geminiRes.status} — ${detail}` },
      { status: geminiRes.status }
    );
  }

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType: string; data: string };
          text?: string;
        }>;
      };
    }>;
  };

  const parts = geminiData.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (p) => p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData) {
    return NextResponse.json({ error: "No image in response" }, { status: 502 });
  }

  const { mimeType: imgMime, data: imgData } = imagePart.inlineData;
  return NextResponse.json({ dataUrl: `data:${imgMime};base64,${imgData}` });
}
