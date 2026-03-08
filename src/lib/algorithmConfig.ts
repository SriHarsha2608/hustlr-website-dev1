export type ScoringFactor = {
  key: string;
  label: string;
  weight: number;
  enabled: boolean;
  description: string;
};

export type ScoringAlgorithmConfig = {
  threshold: number;
  factors: ScoringFactor[];
  totalWeight: number;
};

/** Default scoring categories matching the scoring engine (scoring_config table). */
export const DEFAULT_SCORING_CONFIG: ScoringAlgorithmConfig = {
  threshold: 50,
  totalWeight: 180,
  factors: [
    {
      key: "open_source",
      label: "Open Source",
      weight: 35,
      enabled: true,
      description: "GitHub contributions, merged PRs, and open-source involvement",
    },
    {
      key: "internships",
      label: "Internships",
      weight: 30,
      enabled: true,
      description: "Relevant internships, freelancing, and prior work experience",
    },
    {
      key: "projects",
      label: "Projects",
      weight: 25,
      enabled: true,
      description: "Impact, complexity, and quality of submitted projects",
    },
    {
      key: "hackathons",
      label: "Hackathons",
      weight: 20,
      enabled: true,
      description: "Hackathon participation, wins, and recognitions",
    },
    {
      key: "research",
      label: "Research",
      weight: 20,
      enabled: true,
      description: "Research papers, publications, and field relevance",
    },
    {
      key: "cp_platform",
      label: "CP Platform Rating",
      weight: 15,
      enabled: true,
      description: "Competitive programming platform ratings (Codeforces, LeetCode, etc.)",
    },
    {
      key: "cp_competitions",
      label: "CP Competitions",
      weight: 15,
      enabled: true,
      description: "Performance in competitive programming contests (ICPC, IOI, etc.)",
    },
    {
      key: "skills",
      label: "Skills",
      weight: 10,
      enabled: true,
      description: "Core technical skills and proficiency breadth",
    },
    {
      key: "cgpa",
      label: "CGPA",
      weight: 10,
      enabled: true,
      description: "Academic performance and CGPA",
    },
  ],
};
