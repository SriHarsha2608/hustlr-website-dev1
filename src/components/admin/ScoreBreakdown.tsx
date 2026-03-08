"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

interface CategoryScore {
  category: string;
  raw: number;
  maxRaw: number;
  normalized: number;
  weight: number;
  weighted: number;
  reasoning: string;
}

interface ScoringResult {
  scores: Record<string, CategoryScore>;
  weightedSum: number;
  totalWeight: number;
  finalScore: number;
  researchBoosted: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  cgpa: "CGPA",
  cp_platform: "CP Platform Rating",
  cp_competitions: "CP Competitions",
  research: "Research",
  skills: "Skills",
  internships: "Internships",
  projects: "Projects",
  hackathons: "Hackathons",
  open_source: "Open Source",
};

const CATEGORY_ICONS: Record<string, string> = {};

function barColor(_pct: number): string {
  return "bg-gray-800";
}

function barTrack(_pct: number): string {
  return "bg-gray-100";
}

function heroColor(_score: number): string {
  return "text-gray-800";
}

function heroRing(_score: number): string {
  return "border-gray-200";
}

function heroLabel(score: number): string {
  if (score >= 70) return "Strong Profile";
  if (score >= 40) return "Moderate Profile";
  if (score >= 20) return "Needs Improvement";
  return "Weak Profile";
}

function scoreBadgeColor(score: number | undefined | null, threshold: number = 50): string {
  if (score === undefined || score === null) return "bg-gray-100 text-gray-500";
  return score >= threshold ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700";
}

/** Compact score badge for the admin list page */
export function ScoreBadge({ score, threshold = 50 }: { score?: number | null, threshold?: number }) {
  if (score === undefined || score === null) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500">
        Unscored
      </span>
    );
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${scoreBadgeColor(score, threshold)}`}
    >
      {score.toFixed(1)}%
    </span>
  );
}

/** Friendly names for dimension abbreviations */
const DIM_LABELS: Record<string, string> = {
  TD: "Technical Depth",
  CX: "Complexity",
  CM: "Completion",
  OW: "Ownership",
  Ach: "Achievement",
  Prs: "Prestige",
  PQ: "Project Quality",
  Own: "Ownership",
};

function dimColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.8) return "text-emerald-600 bg-emerald-50";
  if (pct >= 0.5) return "text-amber-600 bg-amber-50";
  return "text-orange-600 bg-orange-50";
}

/** Parse and render projects reasoning: P1: 20/25 — TD:6/7 (...). CX:5/5 (...). */
function ProjectReasoning({ reasoning }: { reasoning: string }) {
  // Split into project blocks (P1:..., P2:...) and the trailing "Weighted avg:"
  const weightedAvgMatch = reasoning.match(/Weighted avg:\s*(.+)/);
  const projectBlocks = reasoning
    .replace(/\.\s*Weighted avg:.*$/, "")
    .split(/(?=P\d+:)/)
    .filter((b) => b.trim());

  return (
    <div className="space-y-3">
      {projectBlocks.map((block, i) => {
        const headerMatch = block.match(/^P(\d+):\s*([\d.]+)\/([\d.]+)\s*—\s*/);
        if (!headerMatch) {
          return (
            <p key={i} className="text-xs text-gray-500">
              {block.trim()}
            </p>
          );
        }
        const pNum = headerMatch[1];
        const pScore = headerMatch[2];
        const pMax = headerMatch[3];
        const rest = block.slice(headerMatch[0].length);

        // Parse dimensions: TD:6/7 (explanation). CX:5/5 (explanation).
        const dims: { abbr: string; score: number; max: number; reason: string }[] = [];
        const dimRegex = /([A-Z][A-Za-z]+):(\d+\.?\d*)\/(\d+\.?\d*)\s*\(([^)]*)\)/g;
        let match;
        while ((match = dimRegex.exec(rest)) !== null) {
          dims.push({
            abbr: match[1],
            score: parseFloat(match[2]),
            max: parseFloat(match[3]),
            reason: match[4].trim(),
          });
        }

        return (
          <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">
                Project {pNum}
              </span>
              <span className="text-xs font-bold text-gray-900">
                {pScore} / {pMax}
              </span>
            </div>
            {dims.length > 0 ? (
              <div className="space-y-2">
                {dims.map((d) => (
                  <div key={d.abbr}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {DIM_LABELS[d.abbr] || d.abbr}
                      </span>
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${dimColor(d.score, d.max)}`}
                      >
                        {d.score}/{d.max}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                      {d.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">{rest.trim()}</p>
            )}
          </div>
        );
      })}
      {weightedAvgMatch && (
        <p className="text-xs font-medium text-gray-500 text-right">
          Weighted avg: {weightedAvgMatch[1]}
        </p>
      )}
    </div>
  );
}

/** Parse and render hackathons reasoning — now with per-dimension reasoning like projects:
 *  H1(50%): 12/14 — Ach:7/7 (reason). Prs:2.5/3 (reason). PQ:2/3 (reason). Own:0.5/1 (reason)
 */
function HackathonReasoning({ reasoning }: { reasoning: string }) {
  const weightedAvgMatch = reasoning.match(/Weighted avg:\s*(.+)/);
  const hackBlocks = reasoning
    .replace(/\.\s*Weighted avg:.*$/, "")
    .split(/(?=H\d+[\(:])/)
    .filter((b) => b.trim());

  return (
    <div className="space-y-3">
      {hackBlocks.map((block, i) => {
        // Match: H1(50%): 12/14 — ... OR H1: 12/14 — ...
        const headerMatch = block.match(
          /^H(\d+)(?:\((\d+)%\))?:\s*([\d.]+)\/([\d.]+)\s*[—\-]\s*/
        );
        if (!headerMatch) {
          return (
            <p key={i} className="text-xs text-gray-500">
              {block.trim()}
            </p>
          );
        }
        const hNum = headerMatch[1];
        const hWeight = headerMatch[2]; // may be undefined for single hackathon
        const hScore = headerMatch[3];
        const hMax = headerMatch[4];
        const rest = block.slice(headerMatch[0].length);

        // Parse dimensions with reasoning: Ach:7/7 (reason). Prs:2.5/3 (reason).
        const dims: { abbr: string; score: number; max: number; reason: string }[] = [];
        const dimRegex = /([A-Za-z]+):([\d.]+)\/([\d.]+)\s*\(([^)]*)\)/g;
        let match;
        while ((match = dimRegex.exec(rest)) !== null) {
          dims.push({
            abbr: match[1],
            score: parseFloat(match[2]),
            max: parseFloat(match[3]),
            reason: match[4].trim(),
          });
        }

        // Fallback: old format without reasoning — Ach:7/7, Prs:2.5/3
        if (dims.length === 0) {
          const oldDimRegex = /([A-Za-z]+):([\d.]+)\/([\d.]+)/g;
          while ((match = oldDimRegex.exec(rest)) !== null) {
            dims.push({
              abbr: match[1],
              score: parseFloat(match[2]),
              max: parseFloat(match[3]),
              reason: "",
            });
          }
        }

        return (
          <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">
                Hackathon {hNum}
                {hWeight && (
                  <span className="text-gray-400 font-normal ml-1">
                    ({hWeight}% weight)
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-gray-900">
                {hScore} / {hMax}
              </span>
            </div>
            {dims.length > 0 && (
              <div className="space-y-2">
                {dims.map((d) => (
                  <div key={d.abbr}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {DIM_LABELS[d.abbr] || d.abbr}
                      </span>
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${dimColor(d.score, d.max)}`}
                      >
                        {d.score}/{d.max}
                      </span>
                    </div>
                    {d.reason && (
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                        {d.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {weightedAvgMatch && (
        <p className="text-xs font-medium text-gray-500 text-right">
          Weighted avg: {weightedAvgMatch[1]}
        </p>
      )}
    </div>
  );
}

/** ── Skills ── Category "X": N matched [A,B] → x/5. Project verification: M confirmed ... → y/5. Total: z/10 */
function SkillsReasoning({ reasoning }: { reasoning: string }) {
  const catMatch = reasoning.match(
    /Category "([^"]+)":\s*(\d+)\s*skill\(s\)\s*matched\s*\[([^\]]*)\]\s*→\s*(\d+)\/5/
  );
  const projMatch = reasoning.match(
    /Project verification:\s*(\d+)\s*skill\(s\)\s*confirmed\s*in\s*top\s*(\d+)\s*project\(s\)\s*\[([^\]]*)\]\s*→\s*(\d+)\/5/
  );
  const totalMatch = reasoning.match(/Total:\s*(\d+)\/(\d+)/);

  if (!catMatch) return <DefaultReasoning reasoning={reasoning} />;

  const categoryName = catMatch[1];
  const matchedSkills = catMatch[3] ? catMatch[3].split(",").map((s) => s.trim()).filter(Boolean) : [];
  const verifiedSkills = projMatch && projMatch[3] ? projMatch[3].split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-3">
      {/* Category Match */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">
            Category Match
            <span className="font-normal text-gray-400 ml-1">"{categoryName}"</span>
          </span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${dimColor(parseInt(catMatch[4]), 5)}`}>
            {catMatch[4]}/5
          </span>
        </div>
        {matchedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.map((s) => (
              <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">No skills matched</p>
        )}
      </div>

      {/* Project Verification */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">
            Project Verification
            {projMatch && (
              <span className="font-normal text-gray-400 ml-1">
                (top {projMatch[2]} project{parseInt(projMatch[2]) !== 1 ? "s" : ""})
              </span>
            )}
          </span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${dimColor(parseInt(projMatch?.[4] || "0"), 5)}`}>
            {projMatch?.[4] || 0}/5
          </span>
        </div>
        {verifiedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {verifiedSkills.map((s) => (
              <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">No skills confirmed in projects</p>
        )}
      </div>

      {/* Total */}
      {totalMatch && (
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-500">
            Total: <span className="text-gray-900">{totalMatch[1]}/{totalMatch[2]}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** ── Internships ── Best of N: Company (Tier) → x/15. Role "T" (type) → y/10. Duration L → z/5. Total: w/30 */
function InternshipsReasoning({ reasoning }: { reasoning: string }) {
  if (/^No qualifying/i.test(reasoning)) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400 border border-gray-100 italic">
        No qualifying experiences (internship / freelancing / part-time)
      </div>
    );
  }

  const bestMatch = reasoning.match(/Best of (\d+) experience/);
  const companyMatch = reasoning.match(/:\s*(.+?)\s*\(([^)]+)\)\s*→\s*(\d+)\/15/);
  const roleMatch = reasoning.match(/Role "([^"]+)"\s*\(([^)]+)\)\s*→\s*(\d+)\/10/);
  const durationMatch = reasoning.match(/Duration\s+(.+?)\s*→\s*(\d+)\/5/);
  const totalMatch = reasoning.match(/Total:\s*(\d+)\/(\d+)/);

  if (!companyMatch) return <DefaultReasoning reasoning={reasoning} />;

  const rows = [
    { label: "Company", value: companyMatch[1].trim(), detail: companyMatch[2], score: parseInt(companyMatch[3]), max: 15, emoji: "🏢" },
    ...(roleMatch ? [{ label: "Role", value: roleMatch[1], detail: roleMatch[2], score: parseInt(roleMatch[3]), max: 10, emoji: "💼" }] : []),
    ...(durationMatch ? [{ label: "Duration", value: durationMatch[1], detail: null as string | null, score: parseInt(durationMatch[2]), max: 5, emoji: "⏱️" }] : []),
  ];

  return (
    <div className="space-y-2">
      {bestMatch && (
        <p className="text-[11px] text-gray-400 mb-1">
          Best of {bestMatch[1]} experience(s)
        </p>
      )}
      <div className="bg-gray-50 rounded-lg border border-gray-100 divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-gray-700">{r.value}</span>
                {r.detail && (
                  <span className="text-[11px] text-gray-400 ml-1.5">{r.detail}</span>
                )}
              </div>
            </div>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ml-2 ${dimColor(r.score, r.max)}`}>
              {r.score}/{r.max}
            </span>
          </div>
        ))}
      </div>
      {totalMatch && (
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-500">
            Total: <span className="text-gray-900">{totalMatch[1]}/{totalMatch[2]}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** ── Open Source ── Program "X" (Tier):x/40. Org(Label):y/30. Impact:z/25, Depth:w/15. Total:t/110 */
function OpenSourceReasoning({ reasoning }: { reasoning: string }) {
  if (/^No open source/i.test(reasoning)) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400 border border-gray-100 italic">
        No open source contributions listed
      </div>
    );
  }

  const programMatch = reasoning.match(/Program "([^"]+)"\s*\(([^)]+)\)[:\s]*([\d.]+)\/([\d.]+)/);
  const orgMatch = reasoning.match(/Org\(([^)]+)\)[:\s]*([\d.]+)\/([\d.]+)/);
  const impactMatch = reasoning.match(/Impact[:\s]*([\d.]+)\/([\d.]+)/);
  const depthMatch = reasoning.match(/Depth[:\s]*([\d.]+)\/([\d.]+)/);
  const totalMatch = reasoning.match(/Total[:\s]*([\d.]+)\/([\d.]+)/);
  const geminiFailure = /Gemini scoring failed/i.test(reasoning);

  if (!programMatch) return <DefaultReasoning reasoning={reasoning} />;

  const rows = [
    { label: "Program", value: programMatch[1], detail: programMatch[2], score: parseFloat(programMatch[3]), max: parseFloat(programMatch[4]), emoji: "🏆" },
    ...(orgMatch ? [{ label: "Organisation", value: orgMatch[1], detail: null as string | null, score: parseFloat(orgMatch[2]), max: parseFloat(orgMatch[3]), emoji: "🏛️" }] : []),
    ...(impactMatch && !geminiFailure ? [{ label: "Impact", value: "AI-assessed contribution impact", detail: null as string | null, score: parseFloat(impactMatch[1]), max: parseFloat(impactMatch[2]), emoji: "💥" }] : []),
    ...(depthMatch && !geminiFailure ? [{ label: "Depth", value: "Technical depth of contributions", detail: null as string | null, score: parseFloat(depthMatch[1]), max: parseFloat(depthMatch[2]), emoji: "🔬" }] : []),
  ];

  return (
    <div className="space-y-2">
      <div className="bg-gray-50 rounded-lg border border-gray-100 divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-gray-700">{r.value}</span>
                {r.detail && (
                  <span className="text-[11px] text-gray-400 ml-1.5">{r.detail}</span>
                )}
              </div>
            </div>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ml-2 ${dimColor(r.score, r.max)}`}>
              {r.score}/{r.max}
            </span>
          </div>
        ))}
      </div>
      {geminiFailure && (
        <p className="text-[11px] text-amber-600 italic px-1">⚠️ Gemini scoring failed — impact & depth not assessed</p>
      )}
      {totalMatch && (
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-500">
            Total: <span className="text-gray-900">{totalMatch[1]}/{totalMatch[2]}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** ── Research ── Best: A* → 10/10. N paper(s) total. */
function ResearchReasoning({ reasoning }: { reasoning: string }) {
  if (/^No published/i.test(reasoning)) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400 border border-gray-100 italic">
        No published research
      </div>
    );
  }
  if (/^Active researcher/i.test(reasoning)) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Active researcher, no published papers listed</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ml-auto ${dimColor(2, 10)}`}>2/10</span>
        </div>
      </div>
    );
  }

  const bestMatch = reasoning.match(/Best:\s*(.+?)\s*→\s*(\d+)\/(\d+)/);
  const papersMatch = reasoning.match(/(\d+)\s*paper\(s\)\s*total/);

  if (!bestMatch) return <DefaultReasoning reasoning={reasoning} />;

  const rank = bestMatch[1];
  const score = parseInt(bestMatch[2]);
  const max = parseInt(bestMatch[3]);

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">Best Publication</span>
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${dimColor(score, max)}`}>
          {score}/{max}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold">{rank}</span>
        {papersMatch && (
          <span className="text-[11px] text-gray-400">
            {papersMatch[1]} paper{parseInt(papersMatch[1]) !== 1 ? "s" : ""} total
          </span>
        )}
      </div>
    </div>
  );
}

/** ── CP Platform ── CF 1850 → 13pts, CC 2100 → 13pts. max = 13/15 */
function CpPlatformReasoning({ reasoning }: { reasoning: string }) {
  if (/No CP ratings/i.test(reasoning)) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400 border border-gray-100 italic">
        No competitive programming ratings provided
      </div>
    );
  }

  const cfMatch = reasoning.match(/CF\s+(\d+)\s*→\s*(\d+)pts/);
  const ccMatch = reasoning.match(/CC\s+(\d+)\s*→\s*(\d+)pts/);
  const maxMatch = reasoning.match(/max\s*=\s*(\d+)\/(\d+)/);

  const platforms: { name: string; shortName: string; rating: number; pts: number }[] = [];
  if (cfMatch) platforms.push({ name: "Codeforces", shortName: "CF", rating: parseInt(cfMatch[1]), pts: parseInt(cfMatch[2]) });
  if (ccMatch) platforms.push({ name: "CodeChef", shortName: "CC", rating: parseInt(ccMatch[1]), pts: parseInt(ccMatch[2]) });

  if (platforms.length === 0) return <DefaultReasoning reasoning={reasoning} />;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {platforms.map((p) => (
          <div key={p.shortName} className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-700">{p.name}</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${dimColor(p.pts, 15)}`}>
                {p.pts}pts
              </span>
            </div>
            <span className="text-lg font-bold text-gray-900">{p.rating}</span>
            <span className="text-[11px] text-gray-400 ml-1">rating</span>
          </div>
        ))}
      </div>
      {maxMatch && (
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-500">
            Best: <span className="text-gray-900">{maxMatch[1]}/{maxMatch[2]}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** ── CP Competitions ── Best: ICPC Regional — Top 10 (12/15). 3 total competition(s). */
function CpCompetitionsReasoning({ reasoning }: { reasoning: string }) {
  if (/^No CP competitions/i.test(reasoning)) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-400 border border-gray-100 italic">
        No competitive programming competitions listed
      </div>
    );
  }

  const bestMatch = reasoning.match(/Best:\s*(.+?)\s*\((\d+)\/(\d+)\)/);
  const countMatch = reasoning.match(/(\d+)\s*total\s*competition/);

  if (!bestMatch) return <DefaultReasoning reasoning={reasoning} />;

  const label = bestMatch[1].trim();
  const score = parseInt(bestMatch[2]);
  const max = parseInt(bestMatch[3]);

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">Best Result</span>
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${dimColor(score, max)}`}>
          {score}/{max}
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-1.5">{label}</p>
      {countMatch && (
        <span className="text-[11px] text-gray-400">
          {countMatch[1]} competition{parseInt(countMatch[1]) !== 1 ? "s" : ""} total
        </span>
      )}
    </div>
  );
}

/** ── CGPA ── CGPA 8.5 ≥ 8.0 → 7/10 */
function CgpaReasoning({ reasoning }: { reasoning: string }) {
  const match = reasoning.match(/CGPA\s+([\d.]+)\s*([<≥>=]+)\s*([\d.]+)\s*→\s*(\d+)\/(\d+)/);
  if (!match) return <DefaultReasoning reasoning={reasoning} />;

  const cgpa = parseFloat(match[1]);
  const comparator = match[2];
  const threshold = match[3];
  const score = parseInt(match[4]);
  const max = parseInt(match[5]);

  // Determine tier label
  let tier = "";
  if (cgpa >= 9.0) tier = "Excellent";
  else if (cgpa >= 8.0) tier = "Good";
  else if (cgpa >= 6.0) tier = "Average";
  else tier = "Below Average";

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-lg font-bold text-gray-900">{cgpa}</span>
            <span className="text-[11px] text-gray-400 ml-1">CGPA</span>
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cgpa >= 9 ? "bg-emerald-50 text-emerald-700" :
            cgpa >= 8 ? "bg-blue-50 text-blue-700" :
              cgpa >= 6 ? "bg-amber-50 text-amber-700" :
                "bg-orange-50 text-orange-700"
            }`}>
            {tier}
          </span>
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${dimColor(score, max)}`}>
          {score}/{max}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        Threshold: {comparator} {threshold}
      </p>
    </div>
  );
}

/** Default fallback renderer */
function DefaultReasoning({ reasoning }: { reasoning: string }) {
  const parts = reasoning.split(/\.\s+/).filter((p) => p.trim());
  if (parts.length <= 1) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 leading-relaxed border border-gray-100">
        {reasoning}
      </div>
    );
  }
  return (
    <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100 space-y-1">
      {parts.map((part, i) => (
        <p key={i} className="leading-relaxed">
          {part.trim()}
          {i < parts.length - 1 ? "." : ""}
        </p>
      ))}
    </div>
  );
}

/** Smart reasoning formatter — detects category and renders structured layout */
function FormattedReasoning({
  category,
  reasoning,
}: {
  category: string;
  reasoning: string;
}) {
  const cat = category.toLowerCase();

  if (cat === "projects" && /P\d+:/.test(reasoning) && /TD:/.test(reasoning))
    return <ProjectReasoning reasoning={reasoning} />;

  if (cat === "hackathons" && /H\d+[\(:]/.test(reasoning) && /Ach:/.test(reasoning))
    return <HackathonReasoning reasoning={reasoning} />;

  if (cat === "skills")
    return <SkillsReasoning reasoning={reasoning} />;

  if (cat === "internships")
    return <InternshipsReasoning reasoning={reasoning} />;

  if (cat === "opensource")
    return <OpenSourceReasoning reasoning={reasoning} />;

  if (cat === "research")
    return <ResearchReasoning reasoning={reasoning} />;

  if (cat === "cpplatform")
    return <CpPlatformReasoning reasoning={reasoning} />;

  if (cat === "cpcompetitions")
    return <CpCompetitionsReasoning reasoning={reasoning} />;

  if (cat === "cgpa")
    return <CgpaReasoning reasoning={reasoning} />;

  return <DefaultReasoning reasoning={reasoning} />;
}

/** Individual category score card */
function CategoryCard({ s }: { s: CategoryScore }) {
  const [expanded, setExpanded] = useState(false);
  const pct = s.normalized * 100;
  const isEmpty = s.raw === 0;
  const icon = CATEGORY_ICONS[s.category] || "📊";

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-400">
              {CATEGORY_LABELS[s.category] || s.category}
            </span>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            w{s.weight}%
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          <span>{s.reasoning}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: name + percentage */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-base">
            {CATEGORY_LABELS[s.category] || s.category}
          </span>
        </div>
        <span className="text-lg font-bold text-gray-800">
          {Math.round(pct)}%
        </span>
      </div>

      {/* Progress bar — thick */}
      <div className={`w-full rounded-full h-3 ${barTrack(pct)}`}>
        <div
          className={`h-3 rounded-full transition-all duration-500 ${barColor(pct)}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <div>
          <span className="text-gray-400">Score</span>
          <p className="text-sm font-medium text-gray-700">
            {s.raw} / {s.maxRaw}
          </p>
        </div>
        <div>
          <span className="text-gray-400">Weight</span>
          <p className="text-sm font-medium text-gray-700">{s.weight}%</p>
        </div>
        <div>
          <span className="text-gray-400">Contribution</span>
          <p className="text-sm font-medium text-gray-700">
            +{s.weighted.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Expandable reasoning */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 w-full flex justify-center p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-black"
        title={expanded ? "Hide details" : "View evaluation"}
      >
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {expanded && (
        <div className="mt-2">
          <FormattedReasoning category={s.category} reasoning={s.reasoning} />
        </div>
      )}
    </div>
  );
}

/** Full score breakdown for the detail page */
export function ScoreBreakdown({
  scores,
  finalScore,
  researchBoosted,
  scoredAt,
}: {
  scores: Record<string, CategoryScore>;
  finalScore: number;
  researchBoosted: boolean;
  scoredAt?: string;
}) {
  const entries = Object.values(scores).sort((a, b) => b.weight - a.weight);
  const activeEntries = entries.filter((s) => s.raw > 0);
  const emptyEntries = entries.filter((s) => s.raw === 0);

  return (
    <div className="mt-6 space-y-6">
      {/* ─── Hero: Overall Score ─── */}
      <div className={`rounded-xl border-2 ${heroRing(finalScore)} bg-white p-6 text-center shadow-sm`}>
        <p className="text-sm font-medium text-gray-800 uppercase tracking-wider mb-1">
          Overall Profile Score
        </p>
        <p className={`text-5xl font-extrabold tracking-tight ${heroColor(finalScore)}`}>
          {finalScore.toFixed(1)}%
        </p>
        <p className={`mt-1 text-sm font-medium ${heroColor(finalScore)}`}>
          {heroLabel(finalScore)}
        </p>
        {scoredAt && (
          <p className="mt-2 text-xs text-gray-400" suppressHydrationWarning>
            Scored on {new Date(scoredAt).toLocaleString()}
          </p>
        )}
        {researchBoosted && (
          <p className="mt-1 text-xs text-blue-500">
            Research weight boosted to 20% (field matches category)
          </p>
        )}
      </div>

      {/* ─── Active categories ─── */}
      {activeEntries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {activeEntries.map((s) => (
            <CategoryCard key={s.category} s={s} />
          ))}
        </div>
      )}

      {/* ─── Empty categories ─── */}
      {emptyEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            No data provided
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {emptyEntries.map((s) => (
              <CategoryCard key={s.category} s={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Score action button + breakdown — split into two renderable parts via shared state */

interface ScoreSectionState {
  loading: boolean;
  scores: Record<string, CategoryScore> | null;
  finalScore: number | null;
  researchBoosted: boolean;
  scoredAt: string | null;
  handleScore: () => void;
}

// Simple module-level registry so ScoreButton and ScoreBreakdownDisplay
// can share the same state instance rendered by ScoreSectionProvider.
import React, { createContext, useContext } from "react";

const ScoreCtx = createContext<ScoreSectionState | null>(null);

export function ScoreSectionProvider({
  email,
  jwtToken,
  initialScores,
  initialFinalScore,
  initialResearchBoosted,
  initialScoredAt,
  children,
}: {
  email: string;
  jwtToken: string;
  initialScores?: Record<string, CategoryScore> | null;
  initialFinalScore?: number | null;
  initialResearchBoosted?: boolean;
  initialScoredAt?: string | null;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, CategoryScore> | null>(
    initialScores || null
  );
  const [finalScore, setFinalScore] = useState<number | null>(
    initialFinalScore ?? null
  );
  const [researchBoosted, setResearchBoosted] = useState(
    initialResearchBoosted ?? false
  );
  const [scoredAt, setScoredAt] = useState<string | null>(
    initialScoredAt || null
  );

  const handleScore = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scoreApplication", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        const result: ScoringResult = data.data;
        setScores(result.scores);
        setFinalScore(result.finalScore);
        setResearchBoosted(result.researchBoosted);
        setScoredAt(new Date().toISOString());
        toast.success(`Scored: ${result.finalScore.toFixed(1)}%`);
      } else {
        toast.error(data.error || "Scoring failed");
      }
    } catch {
      toast.error("Network error — scoring failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScoreCtx.Provider
      value={{ loading, scores, finalScore, researchBoosted, scoredAt, handleScore }}
    >
      {children}
    </ScoreCtx.Provider>
  );
}

/** Drop this next to the title — renders only the button */
export function ScoreButton() {
  const ctx = useContext(ScoreCtx);
  if (!ctx) return null;
  const { loading, scores, handleScore } = ctx;
  return (
    <Button onClick={handleScore} disabled={loading} className="font-sans">
      {loading ? "Scoring..." : scores ? "Re-score Application" : "Score Application"}
    </Button>
  );
}

/** Drop this wherever you want the breakdown to appear (full-width, in normal flow) */
export function ScoreBreakdownDisplay() {
  const ctx = useContext(ScoreCtx);
  if (!ctx) return null;
  const { scores, finalScore, researchBoosted, scoredAt } = ctx;
  if (!scores || finalScore === null) return null;
  return (
    <ScoreBreakdown
      scores={scores}
      finalScore={finalScore}
      researchBoosted={researchBoosted}
      scoredAt={scoredAt ?? undefined}
    />
  );
}

/** @deprecated use ScoreSectionProvider + ScoreButton + ScoreBreakdownDisplay instead */
export function ScoreSection({
  email,
  jwtToken,
  initialScores,
  initialFinalScore,
  initialResearchBoosted,
  initialScoredAt,
}: {
  email: string;
  jwtToken: string;
  initialScores?: Record<string, CategoryScore> | null;
  initialFinalScore?: number | null;
  initialResearchBoosted?: boolean;
  initialScoredAt?: string | null;
}) {
  return (
    <ScoreSectionProvider
      email={email}
      jwtToken={jwtToken}
      initialScores={initialScores}
      initialFinalScore={initialFinalScore}
      initialResearchBoosted={initialResearchBoosted}
      initialScoredAt={initialScoredAt}
    >
      <ScoreButton />
      <ScoreBreakdownDisplay />
    </ScoreSectionProvider>
  );
}
