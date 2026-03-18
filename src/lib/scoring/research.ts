/**
 * Research Scorer - 20% or 5% Weight (Dynamic), 10 Raw Points
 *
 * Paper rank -> points:
 *   A* (or 2+ A papers) -> 10
 *   A                   -> 8
 *   B*                  -> 7
 *   B                   -> 6
 *   C / Unranked        -> 4 (workshop-level)
 *   Researcher (yes but no papers) -> 2
 *   No research         -> 0
 *
 * Weight is 20% if research field matches student's category, 5% otherwise.
 * The engine orchestrator handles the dynamic weight; this scorer just scores.
 */

import { SupabaseVettingData } from "@/src/lib/schemas/formSchema";
import { CategoryScore } from "./types";

const MAX_RAW = 10;

const RANK_POINTS: Record<string, number> = {
  "A*": 10,
  A: 8,
  "B*": 7,
  B: 6,
  C: 4,
  Unranked: 4,
};

/** Keywords per category for field-match detection */
const CATEGORY_RESEARCH_KEYWORDS: Record<string, string[]> = {
  "AI ML Developer": [
    "machine learning", "deep learning", "neural network", "nlp",
    "natural language", "computer vision", "reinforcement learning",
    "transformer", "llm", "large language", "generative", "gpt",
    "classification", "object detection", "image recognition", "ai",
    "artificial intelligence", "data science", "predictive",
  ],
  "Full Stack Developer": [
    "web", "full stack", "fullstack", "distributed system", "microservice",
    "api", "rest", "graphql", "database", "cloud", "devops", "scalab",
    "software engineering", "system design",
  ],
  "Frontend Developer": [
    "user interface", "ui", "ux", "frontend", "front-end", "web",
    "accessibility", "responsive", "interaction design", "visualization",
    "browser", "css", "rendering",
  ],
  "Backend Developer": [
    "backend", "back-end", "server", "database", "distributed",
    "microservice", "api", "cloud", "infrastructure", "scalab",
    "concurrency", "system", "performance", "optimization",
  ],
  "Mobile App Developer": [
    "mobile", "android", "ios", "flutter", "react native", "swift",
    "kotlin", "app development", "cross-platform", "wearable",
  ],
};

const CATEGORY_ALIASES: Record<string, string> = {
  "full stack developer": "Full Stack Developer",
  "frontend developer": "Frontend Developer",
  "backend developer": "Backend Developer",
  "mobile app developer": "Mobile App Developer",
  "mobile developer": "Mobile App Developer",
  "ai ml developer": "AI ML Developer",
  "ai/ml developer": "AI ML Developer",
  "web developer": "Full Stack Developer",
};

function resolveCategory(category: string): string {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  if (!normalizedCategory) return "";

  const alias = CATEGORY_ALIASES[normalizedCategory];
  if (alias) return alias;

  const direct = Object.keys(CATEGORY_RESEARCH_KEYWORDS).find(
    (key) => key.toLowerCase() === normalizedCategory
  );
  return direct || "";
}

/**
 * Check if research papers' titles/venues match the student's category.
 */
export function isResearchFieldMatch(
  category: string,
  papers: { title: string; venue: string }[]
): boolean {
  const canonicalCategory = resolveCategory(category);
  const keywords = canonicalCategory
    ? CATEGORY_RESEARCH_KEYWORDS[canonicalCategory]
    : undefined;

  if (!keywords || papers.length === 0) return false;

  for (const paper of papers) {
    const text = `${paper.title} ${paper.venue}`.toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw)) return true;
    }
  }
  return false;
}

export function scoreResearch(
  data: SupabaseVettingData,
  weight: number
): CategoryScore {
  // No research
  if (data.hasPublishedResearch === "No" || !data.hasPublishedResearch) {
    return {
      category: "research",
      raw: 0,
      maxRaw: MAX_RAW,
      normalized: 0,
      weight,
      weighted: 0,
      reasoning: "No published research",
    };
  }

  const papers = data.researchPapers || [];

  // Said "Yes" but no papers listed -> researcher credit
  if (papers.length === 0) {
    const normalized = 2 / MAX_RAW;
    return {
      category: "research",
      raw: 2,
      maxRaw: MAX_RAW,
      normalized,
      weight,
      weighted: normalized * weight,
      reasoning: "Active researcher, no published papers listed -> 2/10",
    };
  }

  // Count A papers for the 2+ A = 10 pts rule
  const aPaperCount = papers.filter((p) => p.rank === "A").length;

  // Get best single paper score
  let bestPoints = 0;
  let bestRank = "";
  for (const paper of papers) {
    const pts = RANK_POINTS[paper.rank] ?? 4;
    if (pts > bestPoints) {
      bestPoints = pts;
      bestRank = paper.rank;
    }
  }

  // 2+ A papers ? 10 pts (same as A*)
  if (aPaperCount >= 2 && bestPoints < 10) {
    bestPoints = 10;
    bestRank = `2Ã— A papers`;
  }

  const normalized = bestPoints / MAX_RAW;

  return {
    category: "research",
    raw: bestPoints,
    maxRaw: MAX_RAW,
    normalized,
    weight,
    weighted: normalized * weight,
    reasoning: `Best: ${bestRank} ? ${bestPoints}/${MAX_RAW}. ${papers.length} paper(s) total.`,
  };
}
