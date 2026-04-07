import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
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

export default function ClientJobPostReviewPage({ clientEmail }: { clientEmail: string }) {
  const router = useRouter();
  const [previewTab, setPreviewTab] = useState<"details" | "client">("details");
  const [draft, setDraft] = useState<JobPostDraft | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile>(DEFAULT_CLIENT_PROFILE);
  const [isPosting, setIsPosting] = useState(false);

  // Load draft — try DB first, fall back to localStorage
  useEffect(() => {
    async function loadDraft() {
      try {
        const res = await fetch("/api/client/job-post/get");
        if (res.ok) {
          const { draft: dbDraft } = await res.json();
          if (dbDraft) {
            setDraft(dbDraft as JobPostDraft);
            return;
          }
        }
      } catch {
        // DB unreachable — fall through to localStorage
      }

      // Fallback to localStorage
      const rawDraft = window.localStorage.getItem(JOB_POST_DRAFT_STORAGE_KEY);
      if (!rawDraft) return;
      try {
        const parsed = JSON.parse(rawDraft) as Partial<JobPostDraft>;
        if (
          typeof parsed.title === "string" &&
          typeof parsed.category === "string" &&
          typeof parsed.description === "string" &&
          typeof parsed.timelineEstimate === "string" &&
          typeof parsed.deliverables === "string" &&
          typeof parsed.budget === "number" &&
          Array.isArray(parsed.skills)
        ) {
          const validSkills = parsed.skills.filter(
            (item): item is SkillItem =>
              typeof item?.name === "string" &&
              (item?.level === "Required" || item?.level === "Good to have"),
          );
          setDraft({
            title: parsed.title,
            category: parsed.category,
            description: parsed.description,
            timelineEstimate: parsed.timelineEstimate,
            deliverables: parsed.deliverables,
            budget: parsed.budget,
            skills: validSkills,
          });
        }
      } catch {
        // Keep null draft on parse failure.
      }
    }

    void loadDraft();
  }, []);

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

  const skillTags = useMemo(() => (draft?.skills ?? []).slice(0, 3), [draft?.skills]);

  const deliverableItems = useMemo(
    () =>
      (draft?.deliverables ?? "")
        .split("\n")
        .map((item) => item.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean),
    [draft?.deliverables],
  );

  const displayTimeline = useMemo(() => {
    const t = draft?.timelineEstimate || "4 weeks";
    
    const yMatch = t.match(/([0-9\+]+)\s*Year/i);
    const y = yMatch ? `${yMatch[1]} Year${yMatch[1] === "1" ? "" : "s"}` : "";
    
    const mMatch = t.match(/([0-9\+]+)\s*Month/i);
    const m = mMatch ? `${mMatch[1]} Month${mMatch[1] === "1" ? "" : "s"}` : "";
    
    const wMatch = t.match(/([0-9\+]+)\s*Week/i);
    const w = wMatch ? `${wMatch[1]} Week${wMatch[1] === "1" ? "" : "s"}` : "";
    
    if (!y && !m && !w) return t;

    const upperParts = [y, m].filter(Boolean);
    const weekPart = w;

    if (upperParts.length > 0 && weekPart) {
      return upperParts.join(", ") + "\n& " + weekPart;
    } else if (upperParts.length > 0) {
      return upperParts.join(" & ");
    } else if (weekPart) {
      return weekPart;
    }
    return t;
  }, [draft?.timelineEstimate]);

  return (
    <>
      <Head>
        <title>Job Post Preview - Hustlr</title>
      </Head>

      <Nav />

      <main className="min-h-screen bg-[#f4f4f4] pt-16 md:pt-20">
        {!draft ? (
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

            <div className="mt-8 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
              <article className="mx-auto min-w-0 w-full max-w-[700px] overflow-hidden rounded-[10px] bg-[#e9e9e9] p-8 font-ovo text-black [word-break:break-word]">
                <h2 className="mx-auto max-w-full text-center text-5xl text-black/90 break-words [overflow-wrap:anywhere]">
                  {draft.title || "Untitled Project"}
                </h2>

                <div className="mt-8 grid min-w-0 grid-cols-2 gap-6 text-center text-black/90">
                  <div className="flex min-w-0 flex-col items-center overflow-hidden">
                    <p className="w-full min-w-0 max-w-full text-2xl sm:text-3xl leading-none break-words [overflow-wrap:anywhere]">
                      ₹{formattedBudget}
                    </p>
                    <p className="text-lg sm:text-xl leading-tight text-black/60 mt-2">fixed price</p>
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
                      <p className="mt-2 max-w-full leading-relaxed text-black/80 break-words [overflow-wrap:anywhere]">
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
                      <p className="mt-2 max-w-full leading-relaxed text-black/80 break-words [overflow-wrap:anywhere]">
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

              <aside className="flex h-fit shrink-0 flex-col gap-3 lg:pt-1">
                <Button
                  type="button"
                  disabled={isPosting}
                  onClick={() => void onPostProject()}
                  className="h-10 rounded-lg bg-[#a9c165] text-sm font-semibold text-white hover:bg-[#95af57]"
                >
                  {isPosting ? "Posting..." : "Post Project"}
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
            </div>
          </section>
        )}
      </main>
    </>
  );
}
