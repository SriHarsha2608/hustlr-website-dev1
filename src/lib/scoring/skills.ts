/**
 * Skills Scorer - 10% Weight, 10 Raw Points (5 + 5)
 *
 * Part 1 (5 pts): Match student's skills against category master list
 *   4+ matched -> 5 | 2-3 -> 3 | 1 -> 1 | 0 -> 0
 *
 * Part 2 (5 pts): Cross-reference skills with project tech stacks
 *   4+ verified -> 5 | 2-3 -> 3 | 1 -> 1 | 0 -> 0
 */

import { SupabaseVettingData } from "@/src/lib/schemas/formSchema";
import { CategoryScore } from "./types";

const MAX_RAW = 10;

/** Master skill lists per category (lowercase for matching) */
const CATEGORY_SKILLS: Record<string, string[]> = {
  "Full Stack Developer": [
    "react", "node.js", "nodejs", "next.js", "nextjs", "django",
    "postgresql", "postgres", "mongodb", "mongo", "docker", "aws",
    "express", "typescript", "graphql",
  ],
  "Frontend Developer": [
    "react", "vue.js", "vuejs", "vue", "next.js", "nextjs", "typescript",
    "tailwind", "tailwindcss", "html", "css", "figma", "webpack",
    "angular", "svelte", "javascript",
  ],
  "Backend Developer": [
    "node.js", "nodejs", "django", "fastapi", "flask", "postgresql",
    "postgres", "mongodb", "mongo", "redis", "docker", "aws",
    "express", "spring", "java", "go", "golang", "python",
  ],
  "Mobile App Developer": [
    "flutter", "react native", "swift", "kotlin", "firebase",
    "sqlite", "api integration", "dart", "android", "ios",
    "java", "objective-c", "swiftui",
  ],
  "AI ML Developer": [
    "python", "tensorflow", "pytorch", "pandas", "scikit-learn",
    "sklearn", "sql", "fastapi", "huggingface", "hugging face",
    "numpy", "keras", "opencv", "jupyter", "mlflow",
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

/** Normalize a skill name for matching */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.js$/i, ".js") // keep .js suffix
    .replace(/[^a-z0-9.+# ]/gi, "") // strip special chars except .+#
    .trim();
}

function resolveCategory(category: string): string {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  if (!normalizedCategory) return "";

  const alias = CATEGORY_ALIASES[normalizedCategory];
  if (alias) return alias;

  const direct = Object.keys(CATEGORY_SKILLS).find(
    (key) => key.toLowerCase() === normalizedCategory
  );
  return direct || "";
}

/** Check if a skill matches any entry in a master list */
function matchesAny(skill: string, masterList: string[]): boolean {
  const norm = normalize(skill);
  for (const master of masterList) {
    // Exact match
    if (norm === master) return true;
    // Partial: "reactjs" contains "react", "node" contains "node"
    if (norm.includes(master) || master.includes(norm)) return true;
  }
  return false;
}

function countToPoints(count: number): number {
  if (count >= 4) return 5;
  if (count >= 2) return 3;
  if (count >= 1) return 1;
  return 0;
}

export function scoreSkills(
  data: SupabaseVettingData,
  weight: number
): CategoryScore {
  const category = data.category || "";
  const skills = data.skills || [];
  const projects = data.projects || [];

  const canonicalCategory = resolveCategory(category);
  const masterList = canonicalCategory ? CATEGORY_SKILLS[canonicalCategory] || [] : [];

  // --- Part 1: Category match ---
  let categoryMatchCount = 0;
  const matchedSkills: string[] = [];
  for (const s of skills) {
    if (matchesAny(s.skill, masterList)) {
      categoryMatchCount++;
      matchedSkills.push(s.skill);
    }
  }
  const part1 = countToPoints(categoryMatchCount);

  // --- Part 2: Project verification ---
  // Flatten all tech stacks from top 3 projects
  const topProjects = projects.slice(0, 3);
  const allTechSet = new Set<string>();
  for (const proj of topProjects) {
    for (const tech of proj.techStack || []) {
      allTechSet.add(normalize(tech));
    }
  }

  let verifiedCount = 0;
  const verifiedSkills: string[] = [];
  for (const s of skills) {
    const norm = normalize(s.skill);
    for (const tech of allTechSet) {
      if (norm.includes(tech) || tech.includes(norm)) {
        verifiedCount++;
        verifiedSkills.push(s.skill);
        break;
      }
    }
  }
  const part2 = countToPoints(verifiedCount);

  const points = part1 + part2;
  const normalized = points / MAX_RAW;

  const reasoning = [
    `Category "${category}" resolved as "${canonicalCategory || "Unknown"}": ${categoryMatchCount} skill(s) matched [${matchedSkills.join(", ")}] ? ${part1}/5`,
    `Project verification: ${verifiedCount} skill(s) confirmed in top ${topProjects.length} project(s) [${verifiedSkills.join(", ")}] ? ${part2}/5`,
    `Total: ${points}/${MAX_RAW}`,
  ].join(". ");

  return {
    category: "skills",
    raw: points,
    maxRaw: MAX_RAW,
    normalized,
    weight,
    weighted: normalized * weight,
    reasoning,
  };
}
