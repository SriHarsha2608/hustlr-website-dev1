/**
 * Hackathons Scorer — 20% Weight, 14 Raw Points
 *
 * Uses Gemini LLM + GitHub API to score hackathons on 4 dimensions:
 *   Achievement (0-7), Prestige (0-3), Project Quality (0-3), Ownership (0-1)
 *
 * Top 3 hackathons scored, weighted average applied.
 */

import { SupabaseVettingData } from "@/src/lib/schemas/formSchema";
import { CategoryScore } from "./types";
import { fetchRepoData, getCommitPercentage, parseGithubUsername } from "./github";
import { geminiScoreJSON } from "./gemini";

const MAX_RAW = 14;

interface HackathonGeminiResult {
  achievement: { score: number; reasoning: string };
  prestige: { score: number; reasoning: string };
  project_quality: { score: number; reasoning: string };
  ownership: { score: number; reasoning: string };
  total: number;
  red_flags?: string[];
  verification_confidence?: string;
}

function buildHackathonPrompt(
  hack: NonNullable<SupabaseVettingData["hackathons"]>[number],
  repoInfo: string
): string {
  return `You are evaluating a hackathon achievement for a resume screening system. Be fair but rigorous.

Hackathon info:
- Name: ${hack.name}
- Project Name: ${hack.projectName}
- Description: ${hack.description}
- Placement claimed: ${hack.placement}
- Type: ${hack.type}
- Team Size: ${hack.teamSize}
- Student's Role: ${hack.role}
- Tech Stack: ${(hack.techStack || []).join(", ")}

${repoInfo}

Score this hackathon on these 4 dimensions. Return ONLY a JSON object:
{
  "achievement": { "score": <0-7>, "reasoning": "<1 sentence>" },
  "prestige": { "score": <0-3, can be decimal like 2.5>, "reasoning": "<1 sentence>" },
  "project_quality": { "score": <0-3>, "reasoning": "<1 sentence>" },
  "ownership": { "score": <0-1, can be decimal like 0.7>, "reasoning": "<1 sentence>" },
  "total": <sum of all 4 scores>,
  "red_flags": ["<any concerns, or empty array>"],
  "verification_confidence": "<high/medium/low>"
}

Scoring rubric:
- achievement (0-7): 7=winner/1st, 6=top 3, 5=top 5-10, 3-4=finalist, 1-2=participation, 0=no submission
- prestige (0-3): 3=major international 500+ participants, 2.5=national/top university, 2=regional, 1.5=local college, 1=small online, 0.5=informal
- project_quality (0-3): 3=polished/deployed, 2=working prototype, 1=basic/partial, 0=non-functional
- ownership (0-1): 1.0=significant contributor 30%+, 0.7=equal member, 0.5=supporting, 0.3=minor, 0=unclear

Red flags to check: Claims winner but no proof, repo created after hackathon dates, vague descriptions, team size=1 but claims "team lead".
Be conservative — most hackathon scores fall in 6-11/14 range.`;
}

async function scoreOneHackathon(
  hack: NonNullable<SupabaseVettingData["hackathons"]>[number],
  githubUsername: string | null
): Promise<{ total: number; reasoning: string }> {
  let repoInfo = "GitHub data: Not available (no link or private repo)";

  if (hack.githubLink) {
    const repo = await fetchRepoData(hack.githubLink);
    if (repo) {
      const commitPct = githubUsername
        ? getCommitPercentage(repo.contributors, githubUsername)
        : null;

      repoInfo = `GitHub data:
- Stars: ${repo.stars}, Forks: ${repo.forks}
- Created: ${repo.created_at}, Last updated: ${repo.updated_at}
- Languages: ${JSON.stringify(repo.languages)}
- README exists: ${repo.readme ? "Yes" : "No"}
- Contributors: ${repo.contributors.map((c) => `${c.login}(${c.contributions})`).join(", ") || "None listed"}
- Student's commit %: ${commitPct !== null ? `${commitPct}%` : "Unknown"}`;
    }
  }

  const prompt = buildHackathonPrompt(hack, repoInfo);

  try {
    const result = await geminiScoreJSON<HackathonGeminiResult>(prompt);

    const ach = Math.min(Math.max(result.achievement?.score ?? 0, 0), 7);
    const prs = Math.min(Math.max(result.prestige?.score ?? 0, 0), 3);
    const pq = Math.min(Math.max(result.project_quality?.score ?? 0, 0), 3);
    const ow = Math.min(Math.max(result.ownership?.score ?? 0, 0), 1);
    const total = Math.min(Math.round((ach + prs + pq + ow) * 10) / 10, MAX_RAW);

    const reasoning = [
      `Ach:${ach}/7 (${result.achievement?.reasoning || ""})`,
      `Prs:${prs}/3 (${result.prestige?.reasoning || ""})`,
      `PQ:${pq}/3 (${result.project_quality?.reasoning || ""})`,
      `Own:${ow}/1 (${result.ownership?.reasoning || ""})`,
    ].join(". ");

    return { total, reasoning };
  } catch (err) {
    console.error(`[Hackathons] Gemini error for "${hack.name}":`, err);
    return { total: 0, reasoning: `Gemini scoring failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function scoreHackathons(
  data: SupabaseVettingData,
  weight: number
): Promise<CategoryScore> {
  const hackathons = data.hackathons || [];

  if (hackathons.length === 0) {
    return {
      category: "hackathons",
      raw: 0,
      maxRaw: MAX_RAW,
      normalized: 0,
      weight,
      weighted: 0,
      reasoning: "No hackathons listed",
    };
  }

  const githubUsername = data.github ? parseGithubUsername(data.github) : null;

  const hacksToScore = hackathons.slice(0, 5);
  const scored = await Promise.all(
    hacksToScore.map((h) => scoreOneHackathon(h, githubUsername))
  );

  scored.sort((a, b) => b.total - a.total);

  let raw: number;
  let detailParts: string[];

  if (scored.length === 1) {
    raw = scored[0].total;
    detailParts = [`H1: ${scored[0].total}/14 — ${scored[0].reasoning}`];
  } else if (scored.length === 2) {
    raw = Math.round((0.6 * scored[0].total + 0.4 * scored[1].total) * 10) / 10;
    detailParts = [
      `H1(60%): ${scored[0].total}/14 — ${scored[0].reasoning}`,
      `H2(40%): ${scored[1].total}/14 — ${scored[1].reasoning}`,
    ];
  } else {
    raw = Math.round(
      (0.5 * scored[0].total + 0.3 * scored[1].total + 0.2 * scored[2].total) * 10
    ) / 10;
    detailParts = [
      `H1(50%): ${scored[0].total}/14 — ${scored[0].reasoning}`,
      `H2(30%): ${scored[1].total}/14 — ${scored[1].reasoning}`,
      `H3(20%): ${scored[2].total}/14 — ${scored[2].reasoning}`,
    ];
  }

  raw = Math.min(Math.round(raw * 10) / 10, MAX_RAW);
  const normalized = raw / MAX_RAW;

  return {
    category: "hackathons",
    raw,
    maxRaw: MAX_RAW,
    normalized,
    weight,
    weighted: Math.round(normalized * weight * 100) / 100,
    reasoning: `${detailParts.join(". ")}. Weighted avg: ${raw}/${MAX_RAW}`,
  };
}
