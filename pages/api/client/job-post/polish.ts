import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractClientEmailFromCookie } from "@/src/lib/clientAuthUtils";

type PolishResponse = {
  title: string;
  description: string;
  deliverables: string;
  usedAI: boolean;
};

const MODEL = "gemini-2.5-flash";

function parseModelJson(text: string) {
  try {
    return JSON.parse(text) as { title?: string; description?: string; deliverables?: string };
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (!fenced) return null;
    try {
      return JSON.parse(fenced[1]) as { title?: string; description?: string; deliverables?: string };
    } catch {
      return null;
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PolishResponse | { error: string }>) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = extractClientEmailFromCookie(req);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const deliverables = typeof body?.deliverables === "string" ? body.deliverables.trim() : "";

    if (!description) {
      return res.status(400).json({ error: "description is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        title,
        description,
        deliverables,
        usedAI: false,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const prompt = [
      "You are a writing assistant for freelance job posts.",
      "Correct grammar, spelling, punctuation, and sentence clarity.",
      "Do not change intent, scope, budget, or timeline.",
      "Keep the tone professional and concise.",
      "Return valid JSON only with keys: title, description, deliverables.",
      "If any field is empty, return it unchanged.",
      "",
      `title: ${JSON.stringify(title)}`,
      `description: ${JSON.stringify(description)}`,
      `deliverables: ${JSON.stringify(deliverables)}`,
    ].join("\n");

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseModelJson(text);

    if (!parsed) {
      return res.status(200).json({
        title,
        description,
        deliverables,
        usedAI: false,
      });
    }

    return res.status(200).json({
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : title,
      description:
        typeof parsed.description === "string" && parsed.description.trim()
          ? parsed.description.trim()
          : description,
      deliverables:
        typeof parsed.deliverables === "string" && parsed.deliverables.trim()
          ? parsed.deliverables.trim()
          : deliverables,
      usedAI: true,
    });
  } catch (err) {
    console.error("[client/job-post/polish]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
