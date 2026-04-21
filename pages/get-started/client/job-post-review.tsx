import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, MapPin } from "lucide-react";
import Nav from "@/src/components/Nav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  JOB_POST_DRAFT_STORAGE_KEY,
  CLIENT_PROFILE_STORAGE_KEY,
} from "@/src/lib/clientTypes";
import type { SkillItem, JobPostDraft, ClientProfile } from "@/src/lib/clientTypes";
import { getClientEmailFromSSP } from "@/src/lib/clientAuthUtils";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { GetServerSideProps } from "next";

const DEFAULT_CLIENT_PROFILE: ClientProfile = {
  companyName: "Your Company",
  website: "",
  linkedin: "",
  industry: "Business",
  companySize: "",
  country: "India",
  description: "No company description added yet.",
  studentWorkReason: "No response added yet.",
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const clientEmail = getClientEmailFromSSP(context);
  if (!clientEmail) {
    return {
      redirect: { destination: "/get-started/client/verify", permanent: false },
    };
  }

  const { data: profile } = await supabaseAdmin
    .from("client_profiles")
    .select("email")
    .eq("email", clientEmail)
    .maybeSingle();

  if (!profile) {
    return {
      redirect: { destination: "/get-started/client/onboarding", permanent: false },
    };
  }

  return { props: { clientEmail } };
};

function queryViewReadonly(router: ReturnType<typeof useRouter>): boolean {
  if (!router.isReady) return false;
  const v = router.query.view;
  if (v === "readonly") return true;
  if (Array.isArray(v) && v[0] === "readonly") return true;
  return false;
}

function splitDeliverablesByFullStop(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const explicitLines = normalized
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  if (explicitLines.length > 1) {
    return explicitLines;
  }

  const singleLine = explicitLines[0] ?? normalized;
  const sentenceParts = singleLine
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.endsWith(".") ? part : `${part}.`));

  if (sentenceParts.length > 1) {
    return sentenceParts;
  }

  return explicitLines.length ? explicitLines : [singleLine];
}

function parseStoredJobPostDraft(raw: string | null): JobPostDraft | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<JobPostDraft>;
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.category !== "string" ||
      typeof parsed.description !== "string" ||
      typeof parsed.timelineEstimate !== "string" ||
      typeof parsed.deliverables !== "string" ||
      typeof parsed.budget !== "number" ||
      !Array.isArray(parsed.skills)
    ) {
      return null;
    }

    const validSkills = parsed.skills.filter(
      (item): item is SkillItem =>
        typeof item?.name === "string" &&
        (item?.level === "Required" || item?.level === "Good to have"),
    );

    return {
      id: typeof parsed.id === "string" && parsed.id.trim() ? parsed.id : undefined,
      title: parsed.title,
      category: parsed.category,
      description: parsed.description,
      timelineEstimate: parsed.timelineEstimate,
      deliverables: parsed.deliverables,
      budget: parsed.budget,
      minimumSalary:
        typeof parsed.minimumSalary === "number" && Number.isFinite(parsed.minimumSalary)
          ? parsed.minimumSalary
          : 0,
      skills: validSkills,
      status: typeof parsed.status === "string" ? parsed.status : undefined,
    };
  } catch {
    return null;
  }
}

export default function ClientJobPostReviewPage({ clientEmail }: { clientEmail: string }) {
  const router = useRouter();
  const isReadOnlyView = queryViewReadonly(router);
  const polishSignatureRef = useRef<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"details" | "client">("details");
  const [draft, setDraft] = useState<JobPostDraft | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile>(DEFAULT_CLIENT_PROFILE);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  // Load draft — try DB first, fall back to localStorage
  useEffect(() => {
    if (!router.isReady) return;

    async function loadDraft() {
      const requestedId =
        typeof router.query.id === "string" && router.query.id.trim().length > 0
          ? router.query.id.trim()
          : null;
      const localDraft = parseStoredJobPostDraft(
        window.localStorage.getItem(JOB_POST_DRAFT_STORAGE_KEY),
      );
      const localMinimumSalary =
        typeof localDraft?.minimumSalary === "number" && Number.isFinite(localDraft.minimumSalary)
          ? localDraft.minimumSalary
          : null;
      const localDraftMatchesRequest =
        !!localDraft && (!requestedId || localDraft.id === requestedId);

      if (!isReadOnlyView && localDraftMatchesRequest && localDraft) {
        setDraft(localDraft);
        setIsLoadingDraft(false);
        return;
      }

      try {
        const fetchUrl = requestedId
          ? `/api/client/job-post/get?id=${requestedId}`
          : "/api/client/job-post/get";
        
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const { draft: dbDraft } = await res.json();
          if (dbDraft) {
            const typedDbDraft = dbDraft as JobPostDraft;
            const dbMinimumSalary =
              typeof typedDbDraft.minimumSalary === "number" && Number.isFinite(typedDbDraft.minimumSalary)
                ? typedDbDraft.minimumSalary
                : null;
            const mergedDraft: JobPostDraft = {
              ...typedDbDraft,
              minimumSalary:
                dbMinimumSalary !== null && dbMinimumSalary > 0
                  ? dbMinimumSalary
                  : (localMinimumSalary ?? 0),
            };
            setDraft(mergedDraft);
            setIsLoadingDraft(false);
            return;
          }
        }
      } catch {
        // DB unreachable — fall through to localStorage
      }

      // Fallback to localStorage
      if (!localDraftMatchesRequest || !localDraft) {
        setIsLoadingDraft(false);
        return;
      }

      setDraft(localDraft);
      setIsLoadingDraft(false);
    }

    void loadDraft();
  }, [isReadOnlyView, router.isReady, router.query.id]);

  // Load client profile — try DB first, fall back to localStorage
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/client/profile/get");
        if (res.ok) {
          const { profile } = await res.json();
          if (profile) {
            setClientProfile((prev) => ({ ...prev, ...profile }));
            return;
          }
        }
      } catch {
        // fall through to localStorage
      }

      const rawProfile = window.localStorage.getItem(CLIENT_PROFILE_STORAGE_KEY);
      if (!rawProfile) return;
      try {
        const parsed = JSON.parse(rawProfile) as Partial<ClientProfile>;
        setClientProfile((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Keep defaults if parsing fails.
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!draft || isReadOnlyView) return;

    const draftSnapshot = draft;
    const currentSignature = [draftSnapshot.title, draftSnapshot.description, draftSnapshot.deliverables].join("||");
    if (polishSignatureRef.current === currentSignature) return;

    let cancelled = false;

    async function polishDraftCopy() {
      try {
        polishSignatureRef.current = currentSignature;
        const res = await fetch("/api/client/job-post/polish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draftSnapshot.title,
            description: draftSnapshot.description,
            deliverables: draftSnapshot.deliverables,
          }),
        });

        if (!res.ok || cancelled) return;

        const polished = (await res.json()) as Partial<{
          title: string;
          description: string;
          deliverables: string;
        }>;

        const nextTitle =
          typeof polished.title === "string" && polished.title.trim()
            ? polished.title.trim()
            : draftSnapshot.title;
        const nextDescription =
          typeof polished.description === "string" && polished.description.trim()
            ? polished.description.trim()
            : draftSnapshot.description;
        const nextDeliverables =
          typeof polished.deliverables === "string" && polished.deliverables.trim()
            ? polished.deliverables.trim()
            : draftSnapshot.deliverables;

        if (
          nextTitle === draftSnapshot.title &&
          nextDescription === draftSnapshot.description &&
          nextDeliverables === draftSnapshot.deliverables
        ) {
          return;
        }

        const nextDraft: JobPostDraft = {
          ...draftSnapshot,
          title: nextTitle,
          description: nextDescription,
          deliverables: nextDeliverables,
        };

        polishSignatureRef.current = [nextTitle, nextDescription, nextDeliverables].join("||");
        setDraft(nextDraft);

        try {
          window.localStorage.setItem(JOB_POST_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
        } catch {
          // non-critical
        }

        if (draftSnapshot.status === "published" || draftSnapshot.status === "closed") {
          return;
        }

        fetch("/api/client/job-post/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...nextDraft, email: clientEmail }),
        }).catch(() => {
          // non-critical
        });
      } catch {
        // non-critical
      }
    }

    void polishDraftCopy();

    return () => {
      cancelled = true;
    };
  }, [clientEmail, draft, isReadOnlyView]);

  async function onPostProject() {
    if (isPosting || !draft) return;
    setIsPosting(true);

    try {
      const res = await fetch("/api/client/job-post/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, email: clientEmail, status: "published" }),
      });

      if (!res.ok) {
        toast.error("Failed to post project. Please try again.");
        setIsPosting(false);
        return;
      }

      void router.push("/get-started/client/dashboard");
    } catch {
      toast.error("Network error. Please try again.");
      setIsPosting(false);
    }
  }

  const formattedBudget = useMemo(
    () => new Intl.NumberFormat("en-IN").format(draft?.budget ?? 0),
    [draft?.budget],
  );

  const formattedMinimumSalary = useMemo(() => {
    const value = draft?.minimumSalary;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return "Not set";
    }
    return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
  }, [draft?.minimumSalary]);

  const skillTags = useMemo(() => (draft?.skills ?? []).slice(0, 3), [draft?.skills]);

  const deliverableItems = useMemo(
    () => splitDeliverablesByFullStop(draft?.deliverables ?? ""),
    [draft?.deliverables],
  );

  const displayTimeline = useMemo(() => {
    const t = draft?.timelineEstimate || "4 weeks";
    
    const yMatch = t.match(/([0-9]+)\s*Year/i);
    const mMatch = t.match(/([0-9]+)\s*Month/i);
    const wMatch = t.match(/([0-9]+)\s*Week/i);
    
    // If it doesn't match our strict expected pattern (e.g., might be legacy "3 to 6 months"),
    // we only run the total calculation if we actually extracted something.
    if (!yMatch && !mMatch && !wMatch) return t;

    let totalWeeks = 0;
    if (yMatch) totalWeeks += parseInt(yMatch[1], 10) * 52;
    if (mMatch) totalWeeks += parseInt(mMatch[1], 10) * 4;
    if (wMatch) totalWeeks += parseInt(wMatch[1], 10);

    // Provide the unified timeline in weeks
    return `${totalWeeks} Week${totalWeeks === 1 ? "" : "s"}`;
  }, [draft?.timelineEstimate]);

  return (
    <>
      <Head>
        <title>Job Post Preview - Hustlr</title>
      </Head>

      <Nav />

      <main className="min-h-screen bg-[#f4f4f4] pt-16 md:pt-20">
        {isLoadingDraft ? (
          <section className="mx-auto flex min-h-[72vh] w-full max-w-[1200px] flex-col items-center justify-center px-6 text-center">
            <div className="mt-8 flex flex-col items-center gap-2">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-black/20 border-t-black/70"></span>
              <p className="mt-4 text-[13px] font-sans font-semibold tracking-wide text-black/60 uppercase">Loading preview...</p>
            </div>
          </section>
        ) : !draft ? (
          <section className="mx-auto flex min-h-[72vh] w-full max-w-[1200px] flex-col items-center justify-center px-6 text-center">
            <h1 className="font-serif text-4xl font-normal tracking-tight text-black/90 sm:text-5xl">
              No Job Post Draft Found
            </h1>
            <p className="mt-4 max-w-xl text-base font-sans text-black/70 sm:text-lg">
              Create your project details first, then preview it from here.
            </p>
            <Button
              type="button"
              onClick={() => {
                void router.push("/get-started/client/job-post?new=1");
              }}
              className="mt-8 h-10 rounded-lg bg-black px-8 text-sm text-white hover:bg-black/90"
            >
              Go To Job Post Form
            </Button>
          </section>
        ) : (
          <section className="mx-auto min-w-0 w-full max-w-6xl px-6 py-10 sm:px-10 md:px-14 lg:px-20">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <h1 className="min-w-0 max-w-full font-serif text-5xl font-normal tracking-tight text-black/90 break-words [overflow-wrap:anywhere]">
                Job Post Preview
              </h1>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/client/auth/logout", { method: "POST" });
                  void router.push("/get-started/client/verify");
                }}
                className="mt-2 flex shrink-0 items-center gap-1.5 text-sm font-sans font-medium text-black/50 hover:text-black/80 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
            <p className="mt-3 max-w-full text-[1.2rem] font-semibold text-[#58b7ba] break-words [overflow-wrap:anywhere]">
              This is how your project will appear to students.
            </p>

            <div
              className={`mt-8 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_220px]`}
            >
              <article className="mx-auto min-w-0 w-full max-w-[700px] overflow-hidden rounded-[10px] bg-[#e9e9e9] p-8 font-ovo text-black [word-break:break-word]">
                <h2 className="mx-auto max-w-full text-center text-5xl text-black/90 break-words [overflow-wrap:anywhere]">
                  {draft.title || "Untitled Project"}
                </h2>

                <div className="mt-8 grid min-w-0 grid-cols-1 gap-6 text-center text-black/90 sm:grid-cols-3">
                  <div className="flex min-w-0 flex-col items-center overflow-hidden">
                    <p className="w-full min-w-0 max-w-full text-2xl sm:text-3xl leading-none break-words [overflow-wrap:anywhere]">
                      ₹{formattedBudget}
                    </p>
                    <p className="text-lg sm:text-xl leading-tight text-black/60 mt-2">fixed price</p>
                  </div>
                  <div className="flex min-w-0 flex-col items-center justify-center overflow-hidden">
                    <p className="w-full min-w-0 max-w-full text-2xl sm:text-3xl leading-tight break-words [overflow-wrap:anywhere]">
                      {formattedMinimumSalary}
                    </p>
                    <p className="text-lg sm:text-xl leading-tight text-black/60 mt-2">minimum salary</p>
                  </div>
                  <div className="flex min-w-0 flex-col items-center justify-center overflow-hidden">
                    <p className="w-full min-w-0 max-w-full text-2xl sm:text-3xl whitespace-pre-line leading-tight break-words [overflow-wrap:anywhere]">
                      {displayTimeline}
                    </p>
                    <p className="text-lg sm:text-xl leading-tight text-black/60 mt-2">duration</p>
                  </div>
                </div>

                <div className="mt-6 flex min-w-0 flex-wrap justify-center gap-2">
                  {skillTags.map((skill) => (
                    <span
                      key={skill.name}
                      className="max-w-full rounded-md bg-[#8ecfd5] px-4 py-1 text-center text-xs font-sans font-semibold text-white break-words [overflow-wrap:anywhere]"
                    >
                      {skill.name}
                    </span>
                  ))}
                  {!skillTags.length && (
                    <span className="max-w-full rounded-md bg-[#8ecfd5] px-4 py-1 text-center text-xs font-sans font-semibold text-white break-words [overflow-wrap:anywhere]">
                      {draft.category || "Project"}
                    </span>
                  )}
                </div>

                <div className="mx-auto mt-8 relative flex w-[240px] rounded-full bg-[#d6d6d6] p-1 font-sans text-sm font-semibold shadow-inner">
                  <div
                    className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#9a9a9a] transition-transform duration-300 ease-out shadow-sm ${
                      previewTab === "client" ? "translate-x-full" : "translate-x-0"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewTab("details")}
                    className={`relative z-10 w-1/2 text-center transition-colors duration-200 py-1.5 ${
                      previewTab === "details" ? "text-white" : "text-black/60 hover:text-black"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("client")}
                    className={`relative z-10 w-1/2 text-center transition-colors duration-200 py-1.5 ${
                      previewTab === "client" ? "text-white" : "text-black/60 hover:text-black"
                    }`}
                  >
                    Client
                  </button>
                </div>

                {previewTab === "details" ? (
                  <div className="mt-8 min-w-0 space-y-5 font-sans text-sm text-black/90">
                    <section className="min-w-0">
                      <h3 className="font-ovo text-3xl text-black">Description</h3>
                      <p className="mt-2 max-w-full whitespace-pre-wrap leading-relaxed text-black/80 break-words [overflow-wrap:anywhere]">
                        {draft.description}
                      </p>
                    </section>

                    <section className="min-w-0">
                      <h3 className="font-ovo text-3xl text-black">Deliverables</h3>
                      <ul className="mt-2 max-w-full space-y-1 text-black/80">
                        {(deliverableItems.length
                          ? deliverableItems
                          : ["Final project output", "Clean codebase", "Deployment notes"]
                        ).map((item) => (
                          <li key={item} className="break-words [overflow-wrap:anywhere]">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                ) : (
                  <div className="mt-8 min-w-0 space-y-5 font-sans text-sm text-black/90">
                    <section className="min-w-0 text-center">
                      <h3 className="mx-auto max-w-full font-ovo text-4xl text-black break-words [overflow-wrap:anywhere]">
                        {clientProfile.companyName || "Your Company"}
                      </h3>
                      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-center gap-4 text-xs text-black/75">
                        <span className="max-w-full rounded-full bg-[#c8c8c8] px-3 py-1 break-words [overflow-wrap:anywhere]">
                          {clientProfile.industry || "Business"}
                        </span>
                        <span className="inline-flex max-w-full items-center gap-1 break-words [overflow-wrap:anywhere]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {clientProfile.country || "India"}
                        </span>
                      </div>
                    </section>

                    <section className="min-w-0">
                      <h3 className="font-ovo text-3xl text-black">About Us</h3>
                      <p className="mt-2 max-w-full whitespace-pre-wrap leading-relaxed text-black/80 break-words [overflow-wrap:anywhere]">
                        {clientProfile.description || "No company description added yet."}
                      </p>
                    </section>

                    <section className="min-w-0">
                      <h3 className="font-ovo text-3xl text-black">Why Work With Us?</h3>
                      <p className="mt-2 max-w-full whitespace-pre-line leading-relaxed text-black/80 break-words [overflow-wrap:anywhere]">
                        {clientProfile.studentWorkReason || "No response added yet."}
                      </p>
                    </section>
                  </div>
                )}
              </article>

              {!isReadOnlyView ? (
                <aside className="flex h-fit shrink-0 flex-col gap-3 lg:pt-1">
                  <Button
                    type="button"
                    disabled={isPosting}
                    onClick={() => void onPostProject()}
                    className="h-10 rounded-lg bg-[#a9c165] text-sm font-semibold text-white hover:bg-[#95af57]"
                  >
                    {isPosting
                      ? draft?.status === "published"
                        ? "Updating..."
                        : "Posting..."
                      : draft?.status === "published"
                      ? "Update Project"
                      : "Post Project"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      void router.push("/get-started/client/job-post?from=review");
                    }}
                    className="h-10 rounded-lg bg-[#a9a9a9] text-sm font-semibold text-white hover:bg-[#969696]"
                  >
                    Edit Project
                  </Button>
                </aside>
              ) : (
                <aside className="flex h-fit shrink-0 flex-col gap-3 lg:pt-1">
                  <Button
                    type="button"
                    onClick={() => {
                      void router.push(`/get-started/client/job-post?id=${draft.id}&resume=1`);
                    }}
                    className="h-10 rounded-lg bg-[#a9a9a9] text-sm font-semibold text-white hover:bg-[#969696]"
                  >
                    Edit Project
                  </Button>
                </aside>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
