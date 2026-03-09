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
import { DEFAULT_SCORING_CONFIG } from "@/src/lib/algorithmConfig";
import {
  ArrowUpDown,
  BriefcaseBusiness,
  ChevronUp,
  LayoutGrid,
  LogOut,
  Settings,
  SlidersHorizontal,
  Check,
  X,
  CheckSquare,
  Square,
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

function getVettingStage(application: SupabaseVettingData, stage1Threshold?: number): VettingStage {
  const explicitStage = normalizeStage((application as any).current_stage);

  // Check if this applicant has been approved (algo or admin)
  const isApproved = (() => {
    // Admin override accepted
    const source = String(
      (application as any).decision_source ||
      application.decisionSource ||
      ""
    ).trim().toLowerCase();
    if (source === "admin_override") {
      const decision = getDecisionStatus(application);
      return decision === "accepted";
    }
    // Algo approved (score >= threshold)
    if (stage1Threshold !== undefined && application.final_score != null) {
      return application.final_score >= stage1Threshold;
    }
    // Legacy status check
    if (application.status === "accepted" || application.status === "round_2_eligible") {
      return true;
    }
    return false;
  })();

  // If approved and currently in Stage 1 or resume screening, promote to Stage 2
  if (isApproved) {
    if (!explicitStage || explicitStage === "resume_screening" || explicitStage === "application_submitted") {
      return "test_project";
    }
  }

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

  let payload: any = null;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false,
      },
    };
  }

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
        destination: "/admin/login",
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
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const [stage1Threshold, setStage1Threshold] = useState(
    DEFAULT_SCORING_CONFIG.threshold
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
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0, 1]));

  const toggleCard = (idx: number) =>
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
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
      const appStage = getVettingStage(app, stage1Threshold);
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
  }, [applications, stageFilter, decisionFilter, universityFilter, searchTerm, scoreFilter, scoreSort, stage1Threshold]);

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

    let uiStage1 = 0;      // Approved either by AI or Manual
    let uiApproved = 0;    // Final Approved
    let uiRejected = 0;    // Final or Stage 1 Rejected
    const stageSnapshot: Record<SnapshotStage, number> = {
      application_submitted: 0,
      resume_screening: 0,
      test_project: 0,
      accepted: 0,
      rejected: 0,
    };

    applications.forEach((app) => {
      // Compute the true decision outcome based on score/threshold or admin override
      let decisionBucket: "pending" | "accepted" | "rejected" = "pending";
      const source = String((app as any).decision_source || app.decisionSource || "").trim().toLowerCase();
      const isManual =
        source === "admin_override" ||
        app.status === "accepted" ||
        app.status === "rejected";

      if (isManual) {
        const storedDecision = getDecisionStatus(app);
        if (storedDecision === "accepted" || storedDecision === "rejected") {
          decisionBucket = storedDecision;
        }
      } else {
        if (app.final_score != null) {
          decisionBucket = app.final_score >= stage1Threshold ? "accepted" : "rejected";
        }
      }

      let stage: SnapshotStage;
      if (decisionBucket === "accepted") {
        stage = "accepted";
      } else if (decisionBucket === "rejected") {
        stage = "rejected";
      } else {
        stage = getVettingStage(app, stage1Threshold);
      }

      stageSnapshot[stage] += 1;

      // ---- Explicit Custom UI Metrics ----
      if (decisionBucket === "accepted") {
        uiStage1 += 1;
        resumeAccepted += 1;
        resumeEvaluated += 1;
      } else if (decisionBucket === "rejected") {
        resumeEvaluated += 1;
      }

      const explicitStatus = getDecisionStatus(app);
      if (explicitStatus === "accepted") {
        uiApproved += 1;
      } else if (explicitStatus === "rejected") {
        uiRejected += 1;
      } else {
        if (decisionBucket === "accepted") {
          uiApproved += 1;
        } else if (decisionBucket === "rejected") {
          uiRejected += 1;
        }
      }

      const timestamp = getApplicationTimestamp(app);
      if (timestamp !== null && timestamp >= oneWeekAgo && timestamp <= now) {
        applicantsThisWeek += 1;
        if (decisionBucket === "accepted") {
          acceptedThisWeek += 1;
        }
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
      totalApplicants === 0 ? 0 : (uiStage1 / totalApplicants) * 100;
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
      uiStage1,
      uiApproved,
      uiRejected,
    };
  }, [applications, stage1Threshold]);

  // Stage 1 pass rate: (applicants whose AI score >= threshold or manually approved/rejected) / (total evaluated) * 100
  // Depends on threshold and decisions so it updates live.
  const stage1PassRate = metrics.resumeScreeningPassRate;

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

  const previousSelectionRef = useRef<Set<string> | null>(null);

  const toggleApplicantSelection = (applicantEmail: string) => {
    // Manually selecting/deselecting invalidates the "previous state" for bulk select
    previousSelectionRef.current = null;
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
      // If we are selecting all
      if (shouldSelect) {
        // Save the *current* state before we select all
        previousSelectionRef.current = new Set(prev);
        const next = new Set(prev);
        visibleApplicantEmails.forEach((applicantEmail) => {
          next.add(applicantEmail);
        });
        return next;
      } else {
        // If we are deselecting all AND we have a saved state
        if (previousSelectionRef.current) {
          const restored = new Set(previousSelectionRef.current);
          previousSelectionRef.current = null;
          return restored;
        }

        // Otherwise just clear the visible ones
        const next = new Set(prev);
        visibleApplicantEmails.forEach((applicantEmail) => {
          next.delete(applicantEmail);
        });
        return next;
      }
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
        const isReject = decisionStatus === "rejected";
        const oldStage = app.currentStage || 1;
        const isCurrentlyRejected = app.status === "rejected";
        const newStatus = isReject
          ? "rejected"
          : (oldStage < 2 || isCurrentlyRejected)
            ? "round_2_eligible"
            : "accepted";
        const newStage = isReject ? 3 : (oldStage < 2 || isCurrentlyRejected) ? 2 : 3;

        return {
          ...app,
          status: newStatus as any,
          currentStage: newStage,
          decisionStatus,
          decisionSource: "admin_override",
          current_stage: isReject ? "resume_screening" : "test_project",
          stage_status: decisionStatus === "accepted" ? "accepted" : "rejected",
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
      `Apply "${label}" to ${targetEmails.length} selected applicant${targetEmails.length === 1 ? "" : "s"
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
    <main className="min-h-screen bg-white font-sans">
      <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
        {/* Clean white sidebar */}
        <aside className="border-r border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="mb-10 flex items-end gap-2">
                <span className="font-heading font-bold text-[42px] leading-none tracking-[-0.04em] text-gray-900">
                  hustlr
                </span>
                <span className="mb-1 text-[11px] text-gray-600">Admin</span>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-left text-sm text-white"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Student Dashboard
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <BriefcaseBusiness className="h-4 w-4" />
                  Client Dashboard
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-gray-700 hover:bg-gray-100"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <section className="bg-gray-50 p-4 sm:p-7">
          <div className="flex flex-col gap-5">
            {/* Breadcrumb + "Edit Stage 1 Algorithm" button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Pages <span className="mx-1">/</span>
                <span className="font-medium text-gray-800">
                  Student Dashboard
                </span>
              </p>
              <button
                type="button"
                onClick={() => setShowAlgorithmPanel((prev) => !prev)}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white shadow-sm hover:bg-gray-600"
              >
                {showAlgorithmPanel ? "Close Stage 1 Algorithm" : "Edit Stage 1 Algorithm"}
              </button>
            </div>

            <h1 className="text-3xl font-semibold leading-tight text-gray-900">
              Student Dashboard
            </h1>

            {/* 4 collapsible stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 items-start">

              {/* Card 1 — Total Applicants */}
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-[-2px_4px_9px_rgba(0,0,0,0.40)] overflow-visible">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "#57B1B2" }}>Total Applicants</span>
                  <button
                    type="button"
                    onClick={() => toggleCard(0)}
                    className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Toggle details"
                  >
                    <ChevronUp
                      className={`h-4 w-4 transition-transform duration-200 ${expandedCards.has(0) ? "rotate-0" : "rotate-180"}`}
                    />
                  </button>
                </div>
                {/* Big number */}
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-gray-900">
                    {formatNumber(metrics.totalApplicants)}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "#9BBE31" }}>
                    +{formatNumber(metrics.applicantsThisWeek)} this week
                  </p>
                </div>
                {/* Expanded breakdown */}
                {expandedCards.has(0) && (
                  <div className="mt-3 border-t border-gray-100 pt-2">
                    {/* Stage 1 (Passed AI or Manual) */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm" style={{ color: "#57B1B2" }}>Stage 1</span>
                      <span className="text-2xl font-bold text-gray-900">{formatNumber(metrics.uiStage1)}</span>
                    </div>
                    {/* Stage 2 (Total Projects) */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm" style={{ color: "#57B1B2" }}>Stage 2</span>
                      <span className="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalProjects)}</span>
                    </div>
                    {/* Approved bottom-left · Rejected bottom-right */}
                    <div className="flex justify-between pt-3">
                      <div className="text-center">
                        <p className="text-sm" style={{ color: "#57B1B2" }}>Approved</p>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.uiApproved)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm" style={{ color: "#57B1B2" }}>Rejected</p>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.uiRejected)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </article>

              {/* Card 2 — Total Projects */}
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-[-2px_4px_9px_rgba(0,0,0,0.40)] overflow-visible">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "#57B1B2" }}>Total Projects</span>
                  <button
                    type="button"
                    onClick={() => toggleCard(1)}
                    className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Toggle details"
                  >
                    <ChevronUp
                      className={`h-4 w-4 transition-transform duration-200 ${expandedCards.has(1) ? "rotate-0" : "rotate-180"}`}
                    />
                  </button>
                </div>
                {/* Big number */}
                <p className="mt-1 text-4xl font-bold text-gray-900">
                  {formatNumber(metrics.totalProjects)}
                </p>
                {/* Expanded breakdown */}
                {expandedCards.has(1) && (
                  <div className="mt-3 border-t border-gray-100 pt-2">
                    {/* Ongoing */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm" style={{ color: "#57B1B2" }}>Ongoing</span>
                      <span className="text-2xl font-bold text-gray-900">{formatNumber(metrics.projectOngoing)}</span>
                    </div>
                    {/* Completed */}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm" style={{ color: "#57B1B2" }}>Completed</span>
                      <span className="text-2xl font-bold text-gray-900">{formatNumber(metrics.projectCompleted)}</span>
                    </div>
                  </div>
                )}
              </article>

              {/* Card 3 — Current Acceptance Rate (static) */}
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-[-2px_4px_9px_rgba(0,0,0,0.40)] overflow-visible">
                <p className="text-xs font-semibold" style={{ color: "#57B1B2" }}>Current Acceptance Rate</p>
                <p className="text-[10px] text-gray-400 mt-0.5">students who have been accepted</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <p className="text-4xl font-bold text-gray-900">
                    {formatPercent(metrics.overallAcceptanceRate)}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "#9BBE31" }}>
                    +{formatPercent(metrics.acceptanceRateLift)}
                  </p>
                </div>
              </article>

              {/* Card 4 — Stage 1 Threshold + Pass Rate (static) */}
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-[-2px_4px_9px_rgba(0,0,0,0.40)] overflow-visible">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#57B1B2" }}>Stage 1 Pass Threshold</p>
                    <p className="mt-2 text-5xl font-bold text-gray-900">
                      {formatPercent(stage1Threshold)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#57B1B2" }}>Stage 1 Pass Rate</p>
                    <p className="mt-2 text-5xl font-bold text-gray-900">
                      {formatPercent(stage1PassRate)}
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

            {/* Table inside a rounded card with filter icon + search bar on top */}
            <section className="mt-2 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-3">
                {/* ── Filter bar ── */}
                <div className="flex items-center gap-3">
                  {/* Sliders icon — click to open filter popover */}
                  <div className="relative" ref={filterPanelRef}>
                    <button
                      type="button"
                      onClick={() => setShowFilterPanel((p) => !p)}
                      className={`relative flex items-center justify-center rounded-lg p-2 transition-colors ${showFilterPanel
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-1000 hover:bg-gray-100"
                        }`}
                      aria-label="Open filters"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      {/* Active dot */}
                      {hasActiveFilters && (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#57B1B2]" />
                      )}
                    </button>

                    {/* Floating filter panel */}
                    {showFilterPanel && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</p>
                          <button
                            type="button"
                            onClick={() => setShowFilterPanel(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close filters"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-2.5">

                          {/* Stage */}
                          <div>
                            <p className="mb-1 text-[11px] text-gray-400">Vetting Stage</p>
                            <Select
                              value={stageFilter}
                              onValueChange={(value) => setStageFilter(value as VettingStageFilter)}
                            >
                              <SelectTrigger className="h-8 rounded-lg border-gray-200 bg-gray-50 text-sm shadow-none">
                                <SelectValue placeholder="All Stages" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                <SelectItem value="resume_screening">Resume Screening</SelectItem>
                                <SelectItem value="test_project">Test Project</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Decision */}
                          <div>
                            <p className="mb-1 text-[11px] text-gray-400">Decision Status</p>
                            <Select
                              value={decisionFilter}
                              onValueChange={(value) => setDecisionFilter(value as DecisionStatusFilter)}
                            >
                              <SelectTrigger className="h-8 rounded-lg border-gray-200 bg-gray-50 text-sm shadow-none">
                                <SelectValue placeholder="All Decisions" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Decisions</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Score */}
                          <div>
                            <p className="mb-1 text-[11px] text-gray-400">AI Score</p>
                            <Select value={scoreFilter} onValueChange={setScoreFilter}>
                              <SelectTrigger className="h-8 rounded-lg border-gray-200 bg-gray-50 text-sm shadow-none">
                                <SelectValue placeholder="All Scores" />
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
                          </div>

                          {/* University */}
                          <div>
                            <p className="mb-1 text-[11px] text-gray-400">University</p>
                            <Select value={universityFilter} onValueChange={setUniversityFilter}>
                              <SelectTrigger className="h-8 rounded-lg border-gray-200 bg-gray-50 text-sm shadow-none">
                                <SelectValue placeholder="All Universities" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Universities</SelectItem>
                                {universities.map((college) => (
                                  <SelectItem key={college} value={college}>{college}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Clear */}
                          <button
                            type="button"
                            onClick={() => { resetFilters(); setShowFilterPanel(false); }}
                            disabled={!hasActiveFilters}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 py-1.5 text-sm text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Search input */}
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by student name, email, or university"
                    className="h-9 flex-1 rounded-full border-gray-400 bg-gray-50 px-4 text-sm text-gray-900 shadow-none placeholder:text-gray-400 focus-visible:ring-0"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <p>
                    Showing {filtered.length} of {applications.length} applicants
                  </p>
                  <button
                    type="button"
                    onClick={handleScoreAll}
                    disabled={batchScoring || unscoredCount === 0}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-100"
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
                  <div className="flex flex-wrap items-center justify-between gap-4 transition-all pb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                        {selectedApplicantEmails.size}
                      </span>
                      <p className="text-sm font-medium text-black">
                        {selectedApplicantEmails.size === 1 ? "applicant selected" : "applicants selected"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectAllVisible(previousSelectionRef.current !== null ? false : true)}
                        className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors"
                      >
                        {previousSelectionRef.current !== null ? (
                          <CheckSquare className="h-4 w-4 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0" />
                        )}
                        Select All
                      </button>

                      <div className="mx-1 h-4 w-[1px] bg-gray-300"></div>

                      <button
                        type="button"
                        onClick={() => runBulkDecision("accepted")}
                        disabled={bulkActionInProgress !== null}
                        className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
                      >
                        <Check className="h-4 w-4 shrink-0" />
                        {bulkActionInProgress === "accepted" ? "Accepting..." : "Accept"}
                      </button>

                      <button
                        type="button"
                        onClick={() => runBulkDecision("rejected")}
                        disabled={bulkActionInProgress !== null}
                        className="flex items-center gap-1.5 rounded-lg bg-black px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-4 w-4 shrink-0" />
                        {bulkActionInProgress === "rejected" ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[1080px] border-collapse text-left">
                    <thead>
                      <tr className="text-sm font-semibold text-gray-800">
                        <th className="w-7 border-b border-gray-200 pb-2">
                          <input
                            ref={selectAllVisibleRef}
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(event) =>
                              toggleSelectAllVisible(
                                event.target.checked && previousSelectionRef.current !== null
                                  ? false
                                  : event.target.checked
                              )
                            }
                            aria-label="Select all visible applicants"
                            className="h-3.5 w-3.5 rounded border border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="border-b border-gray-200 pb-2 pr-3">Name</th>
                        <th className="border-b border-gray-200 pb-2 pr-3">College</th>
                        <th className="border-b border-gray-200 pb-2 pr-3">Role</th>
                        <th className="border-b border-gray-200 pb-2 pr-3">
                          <button
                            type="button"
                            onClick={toggleScoreSort}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            AI Score
                            <ArrowUpDown className="h-3 w-3" />
                            {scoreSort !== "none" && (
                              <span className="text-[9px] text-gray-500">
                                {scoreSort === "desc" ? "↓" : "↑"}
                              </span>
                            )}
                          </button>
                        </th>
                        <th className="border-b border-gray-200 pb-2 pr-3">Status</th>
                        <th className="border-b border-gray-200 pb-2 pr-3">Decision</th>
                        <th className="border-b border-gray-200 pb-2 pr-3">Application Date</th>
                        <th className="border-b border-gray-200 pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="py-10 text-center text-sm text-gray-500"
                          >
                            Loading applicants...
                          </td>
                        </tr>
                      ) : filtered.length > 0 ? (
                        filtered.map((app, index) => (
                          <tr
                            key={`${app.email}-${index}`}
                            className={`border-b border-gray-100 text-sm text-gray-800 ${selectedApplicantEmails.has(app.email) ? "bg-blue-50" : "bg-white"
                              }`}
                          >
                            <td className="py-2">
                              <input
                                type="checkbox"
                                checked={selectedApplicantEmails.has(app.email)}
                                onChange={() => toggleApplicantSelection(app.email)}
                                aria-label={`Select ${app.name || app.email}`}
                                className="h-3.5 w-3.5 rounded border border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2 pr-3">
                              <a
                                href={`/admin/applications/${encodeURIComponent(app.email)}`}
                                className="text-gray-800 hover:text-black hover:underline transition-colors cursor-pointer"
                              >
                                {app.name || "N/A"}
                              </a>
                            </td>
                            <td className="py-2 pr-3">{app.college || "N/A"}</td>
                            <td className="py-2 pr-3">{formatRole(app.category)}</td>
                            <td className="py-2 pr-3">
                              <ScoreBadge score={app.final_score} threshold={stage1Threshold} />
                            </td>
                            {/* Status — vetting stage in the pipeline */}
                            <td className="py-2 pr-3">
                              {(() => {
                                const stage = getVettingStage(app, stage1Threshold);
                                const stageLabels: Record<string, { label: string; cls: string }> = {
                                  application_submitted: { label: "Submitted", cls: "bg-gray-100 text-gray-700" },
                                  resume_screening: { label: "Stage 1", cls: "bg-blue-50 text-blue-700" },
                                  test_project: { label: "Stage 2", cls: "bg-purple-50 text-purple-700" },
                                };
                                const { label, cls } = stageLabels[stage] ?? { label: stage, cls: "bg-gray-100 text-gray-600" };
                                return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
                              })()}
                            </td>
                            {/* Decision — derived from score vs threshold or manual override */}
                            <td className="py-2 pr-3">
                              {(() => {
                                const source = String(
                                  (app as any).decision_source ||
                                  app.decisionSource ||
                                  ""
                                ).trim().toLowerCase();
                                const isManual =
                                  source === "admin_override" ||
                                  app.status === "accepted" ||
                                  app.status === "rejected";

                                // Case 3: manual admin override
                                if (isManual) {
                                  const storedDecision = getDecisionStatus(app);
                                  const isApproved = storedDecision === "accepted";
                                  return (
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${isApproved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                      {isApproved ? "Admin Approved" : "Admin Rejected"}
                                    </span>
                                  );
                                }

                                // Case 1: not yet scored → pending
                                const score = app.final_score;
                                if (score == null) {
                                  return (
                                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700">
                                      Pending
                                    </span>
                                  );
                                }

                                // Case 2: scored by AI — compare against threshold
                                const algoApproved = score >= stage1Threshold;
                                return (
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${algoApproved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {algoApproved ? "Algo Approved" : "Algo Rejected"}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2 pr-3">{formatApplicationDate(app)}</td>
                            <td className="py-2">
                              <a
                                href={`/admin/applications/${encodeURIComponent(app.email)}`}
                                className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-gray-900 hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: "#57B1B2" }}
                              >
                                View
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={9}
                            className="py-10 text-center text-sm text-gray-500"
                          >
                            No applications found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>{/* end table overflow-auto */}
              </div>{/* end flex-col gap-3 */}
            </section>{/* end table card */}
          </div>{/* end flex-col gap-5 */}
        </section>{/* end bg-gray-50 */}
      </div > {/* end grid */}
    </main >
  );
}
