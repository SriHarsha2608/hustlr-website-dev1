// pages/admin/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { SupabaseVettingData } from "@/src/lib/schemas/formSchema";
import { verifyToken } from "@/src/lib/jwt";
import { useRouter } from "next/router";
import AlgorithmConfigPanel from "@/src/components/admin/AlgorithmConfigPanel";
import { ScoreBadge } from "@/src/components/admin/ScoreBreakdown";
import { DEFAULT_RESUME_SCREENING_CONFIG } from "@/src/lib/algorithmConfig";
import {
  ArrowUpDown,
  BriefcaseBusiness,
  ChevronUp,
  LayoutGrid,
  LogOut,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

type VettingStage = "application_submitted" | "resume_screening" | "test_project";
type VettingStageFilter = VettingStage | "all";
type DecisionStatus = "accepted" | "rejected" | "pending";
type DecisionStatusFilter = DecisionStatus | "all";
type SnapshotStage = VettingStage | "accepted" | "rejected";
type BulkDecision = Extract<DecisionStatus, "accepted" | "rejected">;

const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  accepted: "Approved",
  rejected: "Rejected",
  pending: "Pending",
};

const TEST_PROJECT_STATUSES = new Set([
  "round_2_eligible",
  "round_2_project_selected",
  "round_2_under_review",
  "accepted",
  "rejected",
]);

function normalizeStage(raw: unknown): VettingStage | null {
  const normalized = String(raw || "")
    .trim()
    .toLowerCase();
  if (
    normalized === "application_submitted" ||
    normalized === "resume_screening" ||
    normalized === "test_project"
  ) {
    return normalized;
  }
  if (normalized === "accepted" || normalized === "rejected") {
    return "test_project";
  }
  return null;
}

function getVettingStage(application: SupabaseVettingData): VettingStage {
  const explicitStage = normalizeStage((application as any).current_stage);
  if (explicitStage) return explicitStage;

  const status = application.status;
  const currentStage = application.currentStage ?? 0;
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "not_completed") {
    return "application_submitted";
  }

  if (
    (typeof status === "string" && TEST_PROJECT_STATUSES.has(status)) ||
    currentStage >= 2
  ) {
    return "test_project";
  }

  if (status === "under_review" || currentStage === 1) {
    return "resume_screening";
  }

  return "application_submitted";
}

function getDecisionStatus(application: SupabaseVettingData): DecisionStatus {
  const explicitDecision =
    String((application as any).decision_status || application.decisionStatus || "")
      .trim()
      .toLowerCase();

  if (explicitDecision === "accepted" || application.status === "accepted") {
    return "accepted";
  }
  if (explicitDecision === "rejected" || application.status === "rejected") {
    return "rejected";
  }
  return "pending";
}

function getStageNumber(application: SupabaseVettingData): number {
  const stage = getSnapshotStage(application);
  if (stage === "application_submitted" || stage === "resume_screening") {
    return 1;
  }
  return 2;
}

function getSnapshotStage(application: SupabaseVettingData): SnapshotStage {
  const explicitCurrentStage = String((application as any).current_stage || "")
    .trim()
    .toLowerCase();

  if (
    explicitCurrentStage === "application_submitted" ||
    explicitCurrentStage === "resume_screening" ||
    explicitCurrentStage === "test_project" ||
    explicitCurrentStage === "accepted" ||
    explicitCurrentStage === "rejected"
  ) {
    return explicitCurrentStage as SnapshotStage;
  }

  const decision = getDecisionStatus(application);
  if (decision === "accepted") return "accepted";
  if (decision === "rejected") return "rejected";
  return getVettingStage(application);
}

function formatRole(category?: string): string {
  if (!category || !category.trim()) {
    return "N/A";
  }

  return category
    .split(/[_-]/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getApplicationDateRaw(application: SupabaseVettingData) {
  return (
    (application as any).applicationDate ||
    (application as any).createdAt ||
    (application as any).created_at ||
    (application as any).updated_at
  );
}

function getApplicationTimestamp(application: SupabaseVettingData): number | null {
  const maybeDate = getApplicationDateRaw(application);
  if (!maybeDate) return null;
  const parsed = new Date(maybeDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
}

function formatApplicationDate(application: SupabaseVettingData): string {
  const maybeDate = getApplicationDateRaw(application);
  if (!maybeDate) {
    return "--";
  }
  const parsed = new Date(maybeDate);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getResumeScoreValue(application: SupabaseVettingData): number | null {
  const score =
    (application as any).resume_score ??
    application.resumeScore ??
    (application as any).screeningScore ??
    null;
  const parsed = Number(score);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
}

function getResumeDecisionStatus(application: SupabaseVettingData): DecisionStatus {
  const explicit = String(
    (application as any).resume_decision ||
      (application as any).resumeDecision ||
      application.algorithmDecision ||
      ""
  )
    .trim()
    .toLowerCase();

  if (explicit === "accepted") return "accepted";
  if (explicit === "rejected") return "rejected";
  if (explicit === "pending") return "pending";

  const fallbackStatus = String(application.status || "")
    .trim()
    .toLowerCase();
  if (
    fallbackStatus === "round_2_eligible" ||
    fallbackStatus === "round_2_project_selected" ||
    fallbackStatus === "round_2_under_review" ||
    fallbackStatus === "accepted"
  ) {
    return "accepted";
  }
  if (fallbackStatus === "rejected") {
    return "rejected";
  }
  return "pending";
}

function getDecisionSummary(application: SupabaseVettingData): string {
  const status = getDecisionStatus(application);
  if (status === "pending") return "Pending";

  const source = String(
    (application as any).decision_source || application.decisionSource || "algorithm"
  )
    .trim()
    .toLowerCase();

  const sourceLabel = source === "admin_override" ? "Manual Override" : "Algorithm";
  return status === "accepted"
    ? `${sourceLabel} Approved`
    : `${sourceLabel} Rejected`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatPercent(value: number): string {
  return `${Math.max(0, Math.round(value))}%`;
}

export async function getServerSideProps(context: any) {
  const { req } = context;
  const token = req.cookies?.session;
  const adminEmail = (
    process.env.ADMIN_EMAIL || "admin@hustlr.local"
  ).toLowerCase();

  if (!token) {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false,
      },
    };
  }

  const payload = verifyToken(token);
  const role =
    payload && typeof payload === "object" && typeof payload.role === "string"
      ? payload.role
      : "user";
  const email =
    payload && typeof payload === "object" && typeof payload.email === "string"
      ? payload.email
      : undefined;

  if (role !== "admin" || !email || email.toLowerCase() !== adminEmail) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: { email, jwtToken: token },
  };
}

export default function AdminPanel({
  email,
  jwtToken,
}: {
  email: string;
  jwtToken: string;
}) {
  const [applications, setApplications] = useState<SupabaseVettingData[]>([]);
  const [stageFilter, setStageFilter] = useState<VettingStageFilter>("all");
  const [decisionFilter, setDecisionFilter] =
    useState<DecisionStatusFilter>("all");
  const [universityFilter, setUniversityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAlgorithmPanel, setShowAlgorithmPanel] = useState(false);
  const [stage1Threshold, setStage1Threshold] = useState(
    DEFAULT_RESUME_SCREENING_CONFIG.threshold
  );
  const [loading, setLoading] = useState(true);
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [scoreSort, setScoreSort] = useState<"none" | "asc" | "desc">("none");
  const [batchScoring, setBatchScoring] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [selectedApplicantEmails, setSelectedApplicantEmails] = useState<
    Set<string>
  >(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] =
    useState<BulkDecision | null>(null);
  const selectAllVisibleRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/getAllApplications", {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setApplications(data.data);
        } else {
          toast.error("Failed to fetch applications");
        }
      })
      .finally(() => setLoading(false));
  }, [jwtToken]);

  useEffect(() => {
    fetch("/api/admin/algorithm-config", {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (
          json?.success &&
          json?.config &&
          typeof json.config.threshold === "number"
        ) {
          setStage1Threshold(json.config.threshold);
        }
      })
      .catch(() => {
        // keep default threshold when config API is unavailable
      });
  }, [jwtToken]);

  const universities = useMemo(
    () =>
      Array.from(
        new Set(
          applications
            .map((app) => (app.college || "").trim())
            .filter((college) => college.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [applications]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    let result = applications.filter((app) => {
      const appStage = getVettingStage(app);
      const appDecision = getDecisionStatus(app);

      const matchesStage = stageFilter === "all" || appStage === stageFilter;
      const matchesDecision =
        decisionFilter === "all" || appDecision === decisionFilter;
      const matchesUniversity =
        universityFilter === "all" ||
        (app.college || "").trim() === universityFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [app.name, app.email, app.college]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      // Score filter
      const matchesScore = (() => {
        if (scoreFilter === "all") return true;
        const s = app.final_score;
        switch (scoreFilter) {
          case "60+": return s != null && s >= 60;
          case "40-60": return s != null && s >= 40 && s < 60;
          case "20-40": return s != null && s >= 20 && s < 40;
          case "<20": return s != null && s < 20;
          case "unscored": return s == null;
          default: return true;
        }
      })();

      return (
        matchesStage && matchesDecision && matchesUniversity && matchesSearch && matchesScore
      );
    });

    // Score sort
    if (scoreSort !== "none") {
      result = [...result].sort((a, b) => {
        const sa = a.final_score ?? -1;
        const sb = b.final_score ?? -1;
        return scoreSort === "desc" ? sb - sa : sa - sb;
      });
    }

    return result;
  }, [applications, stageFilter, decisionFilter, universityFilter, searchTerm, scoreFilter, scoreSort]);

  const visibleApplicantEmails = useMemo(
    () =>
      filtered
        .map((app) => app.email)
        .filter((value): value is string => Boolean(value)),
    [filtered]
  );

  useEffect(() => {
    const visibleSet = new Set(visibleApplicantEmails);
    setSelectedApplicantEmails((prev) => {
      const next = new Set<string>();
      prev.forEach((item) => {
        if (visibleSet.has(item)) {
          next.add(item);
        }
      });

      if (next.size === prev.size) {
        return prev;
      }
      return next;
    });
  }, [visibleApplicantEmails]);

  const selectedVisibleCount = useMemo(
    () =>
      visibleApplicantEmails.reduce(
        (count, applicantEmail) =>
          selectedApplicantEmails.has(applicantEmail) ? count + 1 : count,
        0
      ),
    [visibleApplicantEmails, selectedApplicantEmails]
  );

  const allVisibleSelected =
    visibleApplicantEmails.length > 0 &&
    selectedVisibleCount === visibleApplicantEmails.length;
  const someVisibleSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleApplicantEmails.length;

  useEffect(() => {
    if (!selectAllVisibleRef.current) return;
    selectAllVisibleRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const totalApplicants = applications.length;
    let applicantsThisWeek = 0;
    let acceptedThisWeek = 0;
    let resumeAccepted = 0;
    let resumeEvaluated = 0;
    let resumeScoreTotal = 0;
    let resumeScoreCount = 0;
    let projectOngoing = 0;
    let projectCompleted = 0;
    const stageSnapshot: Record<SnapshotStage, number> = {
      application_submitted: 0,
      resume_screening: 0,
      test_project: 0,
      accepted: 0,
      rejected: 0,
    };

    applications.forEach((app) => {
      const stage = getSnapshotStage(app);
      stageSnapshot[stage] += 1;

      const timestamp = getApplicationTimestamp(app);
      if (timestamp !== null && timestamp >= oneWeekAgo && timestamp <= now) {
        applicantsThisWeek += 1;
        if (getDecisionStatus(app) === "accepted") {
          acceptedThisWeek += 1;
        }
      }

      const resumeDecision = getResumeDecisionStatus(app);
      if (resumeDecision === "accepted") {
        resumeAccepted += 1;
        resumeEvaluated += 1;
      } else if (resumeDecision === "rejected") {
        resumeEvaluated += 1;
      }

      const resumeScore = getResumeScoreValue(app);
      if (resumeScore !== null) {
        resumeScoreTotal += resumeScore;
        resumeScoreCount += 1;
      }

      const testProjectStatus = String(
        (app as any).test_project_status || (app as any).testProjectStatus || ""
      )
        .trim()
        .toLowerCase();
      if (
        testProjectStatus === "assigned" ||
        testProjectStatus === "submitted" ||
        testProjectStatus === "under_review"
      ) {
        projectOngoing += 1;
      } else if (
        testProjectStatus === "accepted" ||
        testProjectStatus === "rejected"
      ) {
        projectCompleted += 1;
      } else if (stage === "test_project") {
        projectOngoing += 1;
      }
    });

    const resumeScreeningPassRate =
      resumeEvaluated === 0 ? 0 : (resumeAccepted / resumeEvaluated) * 100;
    const averageResumeScore =
      resumeScoreCount === 0 ? 0 : resumeScoreTotal / resumeScoreCount;
    const overallAcceptanceRate =
      totalApplicants === 0 ? 0 : (stageSnapshot.accepted / totalApplicants) * 100;
    const acceptanceRateLift =
      applicantsThisWeek === 0 ? 0 : (acceptedThisWeek / applicantsThisWeek) * 100;
    const totalProjects = projectOngoing + projectCompleted;

    return {
      totalApplicants,
      applicantsThisWeek,
      totalProjects,
      resumeAccepted,
      resumeEvaluated,
      resumeScreeningPassRate,
      stageSnapshot,
      averageResumeScore,
      projectOngoing,
      projectCompleted,
      overallAcceptanceRate,
      acceptanceRateLift,
    };
  }, [applications]);

  const hasActiveFilters =
    stageFilter !== "all" ||
    decisionFilter !== "all" ||
    universityFilter !== "all" ||
    scoreFilter !== "all" ||
    searchTerm.trim().length > 0;

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/get-started/");
  };

  const resetFilters = () => {
    setStageFilter("all");
    setDecisionFilter("all");
    setUniversityFilter("all");
    setScoreFilter("all");
    setSearchTerm("");
  };

  const toggleApplicantSelection = (applicantEmail: string) => {
    setSelectedApplicantEmails((prev) => {
      const next = new Set(prev);
      if (next.has(applicantEmail)) {
        next.delete(applicantEmail);
      } else {
        next.add(applicantEmail);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = (shouldSelect: boolean) => {
    setSelectedApplicantEmails((prev) => {
      const next = new Set(prev);
      visibleApplicantEmails.forEach((applicantEmail) => {
        if (shouldSelect) {
          next.add(applicantEmail);
        } else {
          next.delete(applicantEmail);
        }
      });
      return next;
    });
  };

  const applyBulkDecisionLocally = (
    targetEmails: string[],
    decisionStatus: BulkDecision
  ) => {
    const targetSet = new Set(targetEmails);
    const decisionUpdatedAt = new Date().toISOString();

    setApplications((prev) =>
      prev.map((app) => {
        if (!targetSet.has(app.email)) return app;
        return {
          ...app,
          status: decisionStatus,
          currentStage: 3,
          decisionStatus,
          decisionSource: "admin_override",
          current_stage: decisionStatus,
          stage_status: decisionStatus,
          decision_status: decisionStatus,
          decision_source: "admin_override",
          resume_decision: decisionStatus,
          decisionUpdatedAt,
          decisionUpdatedBy: email,
        };
      })
    );
  };

  const runBulkDecision = async (decisionStatus: BulkDecision) => {
    const targetEmails = Array.from(selectedApplicantEmails);
    if (targetEmails.length === 0) {
      toast.error("Select at least one applicant first");
      return;
    }

    const label = decisionStatus === "accepted" ? "Accept" : "Reject";
    const shouldContinue = window.confirm(
      `Apply "${label}" to ${targetEmails.length} selected applicant${
        targetEmails.length === 1 ? "" : "s"
      }? This will set Stage Status to ${label}ed and Decision Source to Manual Override.`
    );
    if (!shouldContinue) return;

    setBulkActionInProgress(decisionStatus);
    try {
      const response = await fetch("/api/admin/bulkUpdateApplicationStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          emails: targetEmails,
          decisionStatus,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error || "Failed to apply bulk action");
        return;
      }

      if (json.warning) {
        toast.warning(json.warning);
      }

      applyBulkDecisionLocally(targetEmails, decisionStatus);
      setSelectedApplicantEmails(new Set());

      const updatedCount =
        typeof json.updatedCount === "number" ? json.updatedCount : targetEmails.length;
      toast.success(
        `${label}ed ${updatedCount} applicant${updatedCount === 1 ? "" : "s"}`
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply bulk action");
    } finally {
      setBulkActionInProgress(null);
    }
  };

  const toggleScoreSort = () => {
    setScoreSort((prev) => {
      if (prev === "none") return "desc";
      if (prev === "desc") return "asc";
      return "none";
    });
  };

  const unscoredCount = applications.filter(
    (app) => app.final_score == null
  ).length;

  const handleScoreAll = async () => {
    const unscored = applications.filter((app) => app.final_score == null);
    if (unscored.length === 0) {
      toast.info("All applications are already scored");
      return;
    }

    setBatchScoring(true);
    setBatchTotal(unscored.length);
    setBatchProgress(0);

    let succeeded = 0;
    let failed = 0;

    for (const app of unscored) {
      try {
        const res = await fetch("/api/admin/scoreApplication", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ email: app.email }),
        });
        const data = await res.json();
        if (data.success) {
          succeeded++;
          setApplications((prev) =>
            prev.map((a) =>
              a.email === app.email
                ? {
                    ...a,
                    final_score: data.data.finalScore,
                    scores: data.data.scores,
                    scored_at: new Date().toISOString(),
                  }
                : a
            )
          );
        } else {
          failed++;
          console.error(`Failed to score ${app.email}:`, data.error);
        }
      } catch {
        failed++;
        console.error(`Network error scoring ${app.email}`);
      }
      setBatchProgress((p) => p + 1);
    }

    setBatchScoring(false);

    if (failed === 0) {
      toast.success(`Scored ${succeeded} application(s) successfully`);
    } else {
      toast.warning(`Scored ${succeeded}, failed ${failed}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#d7d7d7] p-2 font-sans sm:p-4">
      <div className="mx-auto w-full max-w-[1320px] overflow-hidden border border-[#cbcbcb] bg-[#efefef] shadow-sm">
        <div className="grid min-h-[calc(100vh-1rem)] lg:min-h-[760px] lg:grid-cols-[250px_1fr]">
          <aside className="border-b border-[#d8d8d8] bg-[#f2f2f2] lg:border-b-0 lg:border-r">
            <div className="flex h-full flex-col justify-between p-4 sm:p-5">
              <div>
                <div className="mb-10 flex items-end gap-2">
                  <span className="text-[42px] leading-none tracking-[-0.04em] font-[var(--font-ovo)] text-[#141414]">
                    hustlr.
                  </span>
                  <span className="mb-1 text-[11px] text-[#3f3f3f]">Admin</span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-[9px] bg-black px-3 py-2 text-left text-[12px] text-white"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Student Dashboard
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-[9px] px-3 py-2 text-left text-[12px] text-[#1f1f1f] hover:bg-[#e6e6e6]"
                  >
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    Client Dashboard
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-[12px]">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-[#1f1f1f] hover:bg-[#e6e6e6]"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-[#1f1f1f] hover:bg-[#e6e6e6]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          <section className="bg-[#f5f5f5]">
            <div className="flex flex-col gap-5 p-4 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-[#757575]">
                  Pages <span className="mx-1">/</span>
                  <span className="font-medium text-[#1f1f1f]">
                    Student Dashboard
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowAlgorithmPanel((prev) => !prev)}
                  className="rounded-[10px] bg-[#585858] px-6 py-2 text-[12px] text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] hover:bg-[#4d4d4d]"
                >
                  {showAlgorithmPanel ? "Close Stage 1 Algorithm" : "Edit Stage 1 Algorithm"}
                </button>
              </div>

              <h1 className="text-[30px] leading-tight font-semibold text-[#111111]">
                Student Dashboard
              </h1>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr]">
                <article className="rounded-[13px] border border-[#d4d4d4] bg-[#f7f7f7] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between text-[11px] text-[#38b2bf]">
                    <span>Total Applicants</span>
                    <ChevronUp className="h-3.5 w-3.5 text-[#666666]" />
                  </div>
                  <div className="mt-1 flex items-end gap-2">
                    <p className="text-[42px] leading-none font-semibold text-[#111111]">
                      {formatNumber(metrics.totalApplicants)}
                    </p>
                    <p className="mb-1 text-[12px] text-[#8ebe43]">
                      +{formatNumber(metrics.applicantsThisWeek)} this week
                    </p>
                  </div>
                  <div className="mt-3 space-y-2 border-t border-[#e0e0e0] pt-2 text-[11px] text-[#1f1f1f]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#38b2bf]">Application Submitted</span>
                      <span className="font-semibold">
                        {formatNumber(metrics.stageSnapshot.application_submitted)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#38b2bf]">Stage 1</span>
                      <span className="font-semibold">
                        {formatNumber(metrics.stageSnapshot.resume_screening)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#38b2bf]">Stage 2</span>
                      <span className="font-semibold">
                        {formatNumber(metrics.stageSnapshot.test_project)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-[#e6e6e6] pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#38b2bf]">Approved</span>
                        <span className="font-semibold">
                          {formatNumber(metrics.stageSnapshot.accepted)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#38b2bf]">Rejected</span>
                        <span className="font-semibold">
                          {formatNumber(metrics.stageSnapshot.rejected)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-[13px] border border-[#d4d4d4] bg-[#f7f7f7] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                  <div className="flex items-center justify-between text-[11px] text-[#38b2bf]">
                    <span>Total Projects</span>
                    <ChevronUp className="h-3.5 w-3.5 text-[#666666]" />
                  </div>
                  <p className="mt-2 text-[42px] leading-none font-semibold text-[#111111]">
                    {formatNumber(metrics.totalProjects)}
                  </p>
                  <div className="mt-8 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#38b2bf]">Ongoing</span>
                      <span className="font-semibold text-[#1f1f1f]">
                        {formatNumber(metrics.projectOngoing)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#38b2bf]">Completed</span>
                      <span className="font-semibold text-[#1f1f1f]">
                        {formatNumber(metrics.projectCompleted)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#e6e6e6] pt-2">
                      <span className="text-[#38b2bf]">Avg Resume Score</span>
                      <span className="font-semibold text-[#1f1f1f]">
                        {metrics.averageResumeScore > 0
                          ? Math.round(metrics.averageResumeScore)
                          : "--"}
                      </span>
                    </div>
                  </div>
                </article>

                <article className="rounded-[13px] border border-[#d4d4d4] bg-[#f7f7f7] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                  <p className="text-[11px] text-[#38b2bf]">Current Acceptance Rate</p>
                  <p className="text-[10px] leading-none text-[#8e8e8e]">
                    students who have been accepted
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-[42px] leading-none font-semibold text-[#111111]">
                      {formatPercent(metrics.overallAcceptanceRate)}
                    </p>
                    <p className="mb-1 text-[12px] text-[#8ebe43]">
                      +{formatPercent(metrics.acceptanceRateLift)}
                    </p>
                  </div>
                </article>

                <article className="rounded-[13px] border border-[#d4d4d4] bg-[#f7f7f7] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-[#38b2bf]">Stage 1 Pass Threshold</p>
                      <p className="mt-2 text-[46px] leading-none font-semibold text-[#111111]">
                        {formatPercent(stage1Threshold)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#38b2bf]">Stage 1 Pass Rate</p>
                      <p className="mt-2 text-[46px] leading-none font-semibold text-[#111111]">
                        {formatPercent(metrics.resumeScreeningPassRate)}
                      </p>
                    </div>
                  </div>
                </article>
              </div>

              <AlgorithmConfigPanel
                jwtToken={jwtToken}
                isOpen={showAlgorithmPanel}
                onThresholdChange={setStage1Threshold}
              />

              <section className="mt-2 rounded-[12px] border border-[#cfcfcf] bg-[#f6f6f6] p-4 sm:p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal className="h-4 w-4 text-[#4f4f4f]" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by student name, email, or university"
                      className="h-9 rounded-full border-[#d4d4d4] bg-[#f3f3f3] px-4 text-[12px] text-[#1f1f1f] shadow-none placeholder:text-[#9a9a9a] focus-visible:ring-0"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    <Select
                      value={stageFilter}
                      onValueChange={(value) =>
                        setStageFilter(value as VettingStageFilter)
                      }
                    >
                      <SelectTrigger className="h-8 rounded-[8px] border-[#d0d0d0] bg-[#f3f3f3] text-[12px] shadow-none">
                        <SelectValue placeholder="Vetting Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="application_submitted">
                          Application Submitted
                        </SelectItem>
                        <SelectItem value="resume_screening">
                          Resume Screening
                        </SelectItem>
                        <SelectItem value="test_project">Test Project</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={decisionFilter}
                      onValueChange={(value) =>
                        setDecisionFilter(value as DecisionStatusFilter)
                      }
                    >
                      <SelectTrigger className="h-8 rounded-[8px] border-[#d0d0d0] bg-[#f3f3f3] text-[12px] shadow-none">
                        <SelectValue placeholder="Decision Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Decisions</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={scoreFilter}
                      onValueChange={setScoreFilter}
                    >
                      <SelectTrigger className="h-8 rounded-[8px] border-[#d0d0d0] bg-[#f3f3f3] text-[12px] shadow-none">
                        <SelectValue placeholder="AI Score" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Scores</SelectItem>
                        <SelectItem value="60+">60%+</SelectItem>
                        <SelectItem value="40-60">40–60%</SelectItem>
                        <SelectItem value="20-40">20–40%</SelectItem>
                        <SelectItem value="<20">&lt;20%</SelectItem>
                        <SelectItem value="unscored">Unscored</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={universityFilter}
                      onValueChange={setUniversityFilter}
                    >
                      <SelectTrigger className="h-8 rounded-[8px] border-[#d0d0d0] bg-[#f3f3f3] text-[12px] shadow-none">
                        <SelectValue placeholder="University" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Universities</SelectItem>
                        {universities.map((college) => (
                          <SelectItem key={college} value={college}>
                            {college}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <button
                      type="button"
                      onClick={resetFilters}
                      disabled={!hasActiveFilters}
                      className="h-8 rounded-[8px] border border-[#cdcdcd] bg-[#efefef] text-[12px] text-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear Filters
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#747474]">
                    <p>
                      Showing {filtered.length} of {applications.length} applicants
                    </p>
                    <button
                      type="button"
                      onClick={handleScoreAll}
                      disabled={batchScoring || unscoredCount === 0}
                      className="rounded-[8px] border border-[#c4cfd4] bg-[#e8f0f4] px-3 py-1 text-[11px] text-[#2a4a5a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {batchScoring
                        ? `Scoring ${batchProgress}/${batchTotal}...`
                        : `Score All Unscored (${unscoredCount})`}
                    </button>
                    {batchScoring && (
                      <div className="w-32">
                        <Progress
                          value={
                            batchTotal > 0
                              ? (batchProgress / batchTotal) * 100
                              : 0
                          }
                        />
                      </div>
                    )}
                  </div>

                  {selectedApplicantEmails.size > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#d5d5d5] bg-[#ececec] p-2.5 text-[11px]">
                      <p className="mr-1 text-[#303030]">
                        Bulk Actions: {selectedApplicantEmails.size} selected
                      </p>
                      <button
                        type="button"
                        onClick={() => runBulkDecision("accepted")}
                        disabled={bulkActionInProgress !== null}
                        className="rounded-[7px] border border-[#bfcbb1] bg-[#e4f2d7] px-3 py-1 text-[#314321] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {bulkActionInProgress === "accepted"
                          ? "Accepting..."
                          : "Accept"}
                      </button>
                      <button
                        type="button"
                        onClick={() => runBulkDecision("rejected")}
                        disabled={bulkActionInProgress !== null}
                        className="rounded-[7px] border border-[#d5b8b8] bg-[#f7e5e5] px-3 py-1 text-[#5e2d2d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {bulkActionInProgress === "rejected"
                          ? "Rejecting..."
                          : "Reject"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(
                            "Bulk Move Stage is available in the action bar and will be wired in the next update."
                          )
                        }
                        disabled={bulkActionInProgress !== null}
                        className="rounded-[7px] border border-[#d0d0d0] bg-[#f2f2f2] px-3 py-1 text-[#4d4d4d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Move Stage
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[1080px] border-collapse text-left">
                    <thead>
                      <tr className="text-[10px] text-[#222222]">
                        <th className="w-7 border-b border-[#d4d4d4] pb-2">
                          <input
                            ref={selectAllVisibleRef}
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(event) =>
                              toggleSelectAllVisible(event.target.checked)
                            }
                            aria-label="Select all visible applicants"
                            className="h-3.5 w-3.5 rounded border border-[#c7c7c7] bg-transparent"
                          />
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          Name
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          College
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          Role
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          Stage
                          <p className="text-[8.5px] font-normal text-[#6f6f6f]">
                            only 1 or 2
                          </p>
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          <button
                            type="button"
                            onClick={toggleScoreSort}
                            className="flex items-center gap-1 hover:text-[#38b2bf] transition-colors"
                          >
                            AI Score
                            <ArrowUpDown className="h-2.5 w-2.5" />
                            {scoreSort !== "none" && (
                              <span className="text-[8px] text-[#6f6f6f]">
                                {scoreSort === "desc" ? "↓" : "↑"}
                              </span>
                            )}
                          </button>
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          Status
                          <p className="text-[8.5px] font-normal text-[#6f6f6f]">
                            pending, approved, rejected
                          </p>
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          Decision
                          <p className="text-[8.5px] font-normal text-[#6f6f6f]">
                            pending, algo approved, manual override
                          </p>
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2 pr-3 font-medium">
                          Application Date
                        </th>
                        <th className="border-b border-[#d4d4d4] pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="py-10 text-center text-[12px] text-[#707070]"
                          >
                            Loading applicants...
                          </td>
                        </tr>
                      ) : filtered.length > 0 ? (
                        filtered.map((app, index) => (
                          <tr
                            key={`${app.email}-${index}`}
                            className={`border-b border-[#dfdfdf] text-[10.5px] text-[#2f2f2f] ${
                              selectedApplicantEmails.has(app.email)
                                ? "bg-[#ebeff1]"
                                : "bg-transparent"
                            }`}
                          >
                            <td className="py-2">
                              <input
                                type="checkbox"
                                checked={selectedApplicantEmails.has(app.email)}
                                onChange={() => toggleApplicantSelection(app.email)}
                                aria-label={`Select ${app.name || app.email}`}
                                className="h-3.5 w-3.5 rounded border border-[#c7c7c7] bg-transparent"
                              />
                            </td>
                            <td className="py-2 pr-3">{app.name || "N/A"}</td>
                            <td className="py-2 pr-3">{app.college || "N/A"}</td>
                            <td className="py-2 pr-3">{formatRole(app.category)}</td>
                            <td className="py-2 pr-3">{getStageNumber(app)}</td>
                            <td className="py-2 pr-3">
                              <ScoreBadge score={app.final_score} />
                            </td>
                            <td className="py-2 pr-3">
                              {DECISION_STATUS_LABELS[getDecisionStatus(app)]}
                            </td>
                            <td className="py-2 pr-3">{getDecisionSummary(app)}</td>
                            <td className="py-2 pr-3">
                              {formatApplicationDate(app)}
                            </td>
                            <td className="py-2">
                              <a
                                href={`/admin/applications/${encodeURIComponent(
                                  app.email
                                )}`}
                                className="inline-flex rounded-full bg-[#e5e5e5] px-3 py-1 text-[9.5px] text-[#5b5b5b] hover:bg-[#dddddd]"
                              >
                                View
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={10}
                            className="py-10 text-center text-[12px] text-[#707070]"
                          >
                            No applications found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
