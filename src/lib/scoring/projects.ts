/**
 * Projects Scorer — 25% Weight, 25 Raw Points
 *
 * Uses Gemini LLM + GitHub API to score projects on 4 dimensions:
 *   Technical Depth (0-7), Complexity (0-5), Completion (0-8), Ownership (0-5)
 *
 * Top 3 projects scored, weighted average applied.
 */

import { SupabaseVettingData } from "@/src/lib/schemas/formSchema";
import { CategoryScore } from "./types";
import { fetchRepoData, getCommitPercentage, parseGithubUsername } from "./github";
import { geminiScoreJSON } from "./gemini";

const MAX_RAW = 25;

interface ProjectGeminiResult {
  technical_depth: { score: number; reasoning: string };
  complexity: { score: number; reasoning: string };
  completion: { score: number; reasoning: string };
  ownership: { score: number; reasoning: string };
  total: number;
}

function buildProjectPrompt(
  project: SupabaseVettingData["projects"] extends (infer T)[] | undefined ? T : never,
  repoInfo: string
): string {
  return `You are scoring a student's project for a resume screening system. Be fair but rigorous.

Project info from application:
- Title: ${project.title}
- Type: ${project.type} (Course/Personal/Internship/Freelance/Hackathon)
- Members: ${project.members} (Solo/Group)
- Description: ${project.description}
- Tech Stack: ${(project.techStack || []).join(", ")}
- Duration: ${project.startMonth} ${project.startYear} – ${project.endMonth} ${project.endYear}

${repoInfo}

Score this project on these 4 dimensions. Return ONLY a JSON object:
{
  "technical_depth": { "score": <0-7>, "reasoning": "<1-2 sentences>" },
  "complexity": { "score": <0-5>, "reasoning": "<1-2 sentences>" },
  "completion": { "score": <0-8>, "reasoning": "<1-2 sentences>" },
  "ownership": { "score": <0-5>, "reasoning": "<1-2 sentences>" },
  "total": <sum of all 4 scores>
}

Scoring rubric:
- technical_depth (0-7): 0-1=tutorial clone, 2-3=basic CRUD, 4-5=custom algorithms/caching/testing, 6=distributed/ML pipeline, 7=novel/research-level
- complexity (0-5): 1=single script, 2=2-3 components, 3=full-stack with DB, 4=multi-service, 5=distributed system
- completion (0-8): 1-2=WIP/incomplete, 3-4=works locally/demo, 5-6=deployed but basic, 7-8=production with CI/CD/monitoring
- ownership (0-5): 5=solo 90%+ commits, 4=2-person 40-60%, 3=team 20-40%, 2=large team 10-20%, 1=<10%, 0=forked with cosmetic changes

IMPORTANT: If no GitHub data is available, cap ownership at 3 (cannot verify commits). Be conservative with scores — most student projects score 10-18/25.`;
}

async function scoreOneProject(
  project: NonNullable<SupabaseVettingData["projects"]>[number],
  githubUsername: string | null
): Promise<{ total: number; reasoning: string }> {
  let repoInfo = "GitHub data: Not available (no link or private repo)";

  if (project.githubLink) {
    const repo = await fetchRepoData(project.githubLink);
    if (repo) {
      const commitPct = githubUsername
        ? getCommitPercentage(repo.contributors, githubUsername)
        : null;

      repoInfo = `GitHub data:
- Stars: ${repo.stars}, Forks: ${repo.forks}
- Created: ${repo.created_at}, Last updated: ${repo.updated_at}
- Languages: ${JSON.stringify(repo.languages)}
- README: ${repo.readme ? repo.readme.slice(0, 2000) : "No README"}
- Contributors: ${repo.contributors.map((c) => `${c.login}(${c.contributions})`).join(", ") || "None listed"}
- Student's commit %: ${commitPct !== null ? `${commitPct}%` : "Unknown"}`;
    }
  }

  const prompt = buildProjectPrompt(project, repoInfo);

  try {
    const result = await geminiScoreJSON<ProjectGeminiResult>(prompt);

    // Clamp individual scores to valid ranges
    const td = Math.min(Math.max(result.technical_depth?.score ?? 0, 0), 7);
    const cx = Math.min(Math.max(result.complexity?.score ?? 0, 0), 5);
    const cm = Math.min(Math.max(result.completion?.score ?? 0, 0), 8);
    const ow = Math.min(Math.max(result.ownership?.score ?? 0, 0), 5);
    const total = Math.min(td + cx + cm + ow, MAX_RAW);

    const reasoning = [
      `TD:${td}/7 (${result.technical_depth?.reasoning || ""})`,
      `CX:${cx}/5 (${result.complexity?.reasoning || ""})`,
      `CM:${cm}/8 (${result.completion?.reasoning || ""})`,
      `OW:${ow}/5 (${result.ownership?.reasoning || ""})`,
    ].join(". ");

    return { total, reasoning };
  } catch (err) {
    console.error(`[Projects] Gemini error for "${project.title}":`, err);
    return { total: 0, reasoning: `Gemini scoring failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function scoreProjects(
  data: SupabaseVettingData,
  weight: number
): Promise<CategoryScore> {
  const projects = data.projects || [];

  if (projects.length === 0) {
    return {
      category: "projects",
      raw: 0,
      maxRaw: MAX_RAW,
      normalized: 0,
      weight,
      weighted: 0,
      reasoning: "No projects listed",
    };
  }

  const githubUsername = data.github ? parseGithubUsername(data.github) : null;

  // Score all projects (up to 5 to be safe, take top 3)
  const projectsToScore = projects.slice(0, 5);
  const scored = await Promise.all(
    projectsToScore.map((p) => scoreOneProject(p, githubUsername))
  );

  // Sort descending by total
  scored.sort((a, b) => b.total - a.total);

  // Weighted average of top 3
  let raw: number;
  let detailParts: string[];

  if (scored.length === 1) {
    raw = scored[0].total;
    detailParts = [`P1: ${scored[0].total}/25 — ${scored[0].reasoning}`];
  } else if (scored.length === 2) {
    raw = Math.round(0.6 * scored[0].total + 0.4 * scored[1].total);
    detailParts = [
      `P1(60%): ${scored[0].total}/25 — ${scored[0].reasoning}`,
      `P2(40%): ${scored[1].total}/25 — ${scored[1].reasoning}`,
    ];
  } else {
    raw = Math.round(
      0.5 * scored[0].total + 0.3 * scored[1].total + 0.2 * scored[2].total
    );
    detailParts = [
      `P1(50%): ${scored[0].total}/25 — ${scored[0].reasoning}`,
      `P2(30%): ${scored[1].total}/25 — ${scored[1].reasoning}`,
      `P3(20%): ${scored[2].total}/25 — ${scored[2].reasoning}`,
    ];
  }

  raw = Math.min(raw, MAX_RAW);
  const normalized = raw / MAX_RAW;

  return {
    category: "projects",
    raw,
    maxRaw: MAX_RAW,
    normalized,
    weight,
    weighted: normalized * weight,
    reasoning: `${detailParts.join(". ")}. Weighted avg: ${raw}/${MAX_RAW}`,
  };
}
