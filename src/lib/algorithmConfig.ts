export type ScreeningFactor = {
  key: string;
  label: string;
  weight: number;
  description: string;
};

export type ResumeScreeningConfig = {
  threshold: number;
  factors: ScreeningFactor[];
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_RESUME_SCREENING_CONFIG: ResumeScreeningConfig = {
  threshold: 75,
  factors: [
    {
      key: "skills_depth",
      label: "Skills Depth",
      weight: 0.24,
      description: "Core technical skills and proficiency level",
    },
    {
      key: "project_quality",
      label: "Project Quality",
      weight: 0.22,
      description: "Impact, complexity, and quality of submitted projects",
    },
    {
      key: "work_experience",
      label: "Work Experience",
      weight: 0.16,
      description: "Relevant internships, freelancing, and prior roles",
    },
    {
      key: "academic_performance",
      label: "Academic Performance",
      weight: 0.14,
      description: "CGPA and academic consistency",
    },
    {
      key: "communication_signal",
      label: "Communication Signal",
      weight: 0.12,
      description: "Profile clarity and articulation",
    },
    {
      key: "consistency_signal",
      label: "Consistency Signal",
      weight: 0.12,
      description: "Cross-field consistency and verification confidence",
    },
  ],
};

export function normalizeResumeScreeningConfig(
  rawConfig: unknown
): ResumeScreeningConfig {
  if (!rawConfig || typeof rawConfig !== "object") {
    return DEFAULT_RESUME_SCREENING_CONFIG;
  }

  const config = rawConfig as Partial<ResumeScreeningConfig>;
  const threshold =
    typeof config.threshold === "number" && Number.isFinite(config.threshold)
      ? Math.max(0, Math.min(100, Math.round(config.threshold)))
      : DEFAULT_RESUME_SCREENING_CONFIG.threshold;

  const factors = Array.isArray(config.factors)
    ? config.factors
        .filter(
          (factor): factor is ScreeningFactor =>
            !!factor &&
            typeof factor === "object" &&
            typeof (factor as ScreeningFactor).key === "string" &&
            typeof (factor as ScreeningFactor).label === "string" &&
            typeof (factor as ScreeningFactor).weight === "number"
        )
        .map((factor) => ({
          ...factor,
          weight: Number(factor.weight),
        }))
    : DEFAULT_RESUME_SCREENING_CONFIG.factors;

  return {
    threshold,
    factors: factors.length > 0 ? factors : DEFAULT_RESUME_SCREENING_CONFIG.factors,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}
