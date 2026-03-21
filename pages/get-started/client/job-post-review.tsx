import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import Nav from "@/src/components/Nav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  JOB_POST_DRAFT_STORAGE_KEY,
  CLIENT_PROFILE_STORAGE_KEY,
} from "@/src/lib/clientTypes";
import type { SkillItem, JobPostDraft, ClientProfile } from "@/src/lib/clientTypes";
import { getClientEmailFromSSP } from "@/src/lib/clientAuthUtils";
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

      void router.push("/get-started/client/job-post?view=submitted");
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
                void router.push("/get-started/client/job-post");
              }}
              className="mt-8 h-10 rounded-lg bg-black px-8 text-sm text-white hover:bg-black/90"
            >
              Go To Job Post Form
            </Button>
          </section>
        ) : (
          <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 md:px-14 lg:px-20">
            <h1 className="font-serif text-5xl font-normal tracking-tight text-black/90">Job Post Preview</h1>
            <p className="mt-3 text-[1.2rem] font-semibold text-[#58b7ba]">
              This is how your project will appear to students.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
              <article className="mx-auto w-full max-w-[700px] rounded-[10px] bg-[#e9e9e9] p-8 font-ovo text-black">
                <h2 className="text-center text-5xl text-black/90">{draft.title || "Untitled Project"}</h2>

                <div className="mt-8 grid grid-cols-2 gap-6 text-center">
                  <div>
                    <p className="text-6xl leading-none">₹{formattedBudget}</p>
                    <p className="text-5xl leading-tight">fixed price</p>
                  </div>
                  <div>
                    <p className="text-6xl leading-none">{draft.timelineEstimate || "4 weeks"}</p>
                    <p className="text-5xl leading-tight">duration</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {skillTags.map((skill) => (
                    <span
                      key={skill.name}
                      className="rounded-md bg-[#8ecfd5] px-4 py-1 text-xs font-sans font-semibold text-white"
                    >
                      {skill.name}
                    </span>
                  ))}
                  {!skillTags.length && (
                    <span className="rounded-md bg-[#8ecfd5] px-4 py-1 text-xs font-sans font-semibold text-white">
                      {draft.category || "Project"}
                    </span>
                  )}
                </div>

                <div className="mx-auto mt-6 flex w-[220px] overflow-hidden rounded-full bg-[#d6d6d6] font-sans text-xs font-semibold text-white">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("details")}
                    className={`w-1/2 px-4 py-1 text-center transition-colors ${
                      previewTab === "details" ? "bg-[#9a9a9a]" : "bg-transparent"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("client")}
                    className={`w-1/2 px-4 py-1 text-center transition-colors ${
                      previewTab === "client" ? "bg-[#9a9a9a]" : "bg-transparent"
                    }`}
                  >
                    Client
                  </button>
                </div>

                {previewTab === "details" ? (
                  <div className="mt-8 space-y-5 font-sans text-sm text-black/90">
                    <section>
                      <h3 className="font-ovo text-3xl text-black">Description</h3>
                      <p className="mt-2 leading-relaxed text-black/80">{draft.description}</p>
                    </section>

                    <section>
                      <h3 className="font-ovo text-3xl text-black">Deliverables</h3>
                      <ul className="mt-2 space-y-1 text-black/80">
                        {(deliverableItems.length
                          ? deliverableItems
                          : ["Final project output", "Clean codebase", "Deployment notes"]
                        ).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                ) : (
                  <div className="mt-8 space-y-5 font-sans text-sm text-black/90">
                    <section className="text-center">
                      <h3 className="font-ovo text-4xl text-black">{clientProfile.companyName || "Your Company"}</h3>
                      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-black/75">
                        <span className="rounded-full bg-[#c8c8c8] px-3 py-1">
                          {clientProfile.industry || "Business"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {clientProfile.country || "India"}
                        </span>
                      </div>
                    </section>

                    <section>
                      <h3 className="font-ovo text-3xl text-black">About Us</h3>
                      <p className="mt-2 leading-relaxed text-black/80">
                        {clientProfile.description || "No company description added yet."}
                      </p>
                    </section>

                    <section>
                      <h3 className="font-ovo text-3xl text-black">Why Work With Us?</h3>
                      <p className="mt-2 whitespace-pre-line leading-relaxed text-black/80">
                        {clientProfile.studentWorkReason || "No response added yet."}
                      </p>
                    </section>
                  </div>
                )}
              </article>

              <aside className="flex h-fit flex-col gap-3 lg:pt-1">
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
                    void router.push("/get-started/client/job-post");
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
