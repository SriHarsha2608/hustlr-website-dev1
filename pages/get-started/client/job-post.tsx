import Head from "next/head";
import { motion } from "framer-motion";
import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Nav from "@/src/components/Nav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronsUpDown, Loader, LogOut, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { JOB_POST_DRAFT_STORAGE_KEY } from "@/src/lib/clientTypes";
import type { SkillLevel, SkillItem, JobPostDraft } from "@/src/lib/clientTypes";
import { getClientEmailFromSSP } from "@/src/lib/clientAuthUtils";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { GetServerSideProps } from "next";

const PROJECT_CATEGORIES = [
  "Web Development",
  "Mobile Development",
  "AI/ML",
];

const PROJECT_CATEGORY_SET = new Set(PROJECT_CATEGORIES);

function isValidProjectCategory(value: string): value is (typeof PROJECT_CATEGORIES)[number] {
  return PROJECT_CATEGORY_SET.has(value);
}

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  "Web Development": [
    "React",
    "Next.js",
    "Vue.js",
    "Nuxt.js",
    "Angular",
    "Svelte",
    "SvelteKit",
    "Node.js",
    "Express.js",
    "NestJS",
    "Django",
    "Flask",
    "FastAPI",
    "Ruby on Rails",
    "Spring Boot",
    "ASP.NET",
    "JavaScript",
    "TypeScript",
    "HTML",
    "CSS",
    "Python",
    "Java",
    "PHP",
    "C#",
    "Ruby",
    "Go",
    "Tailwind CSS",
    "Bootstrap",
    "Material UI",
    "Styled Components",
    "Sass / SCSS",
    "CSS Modules",
    "Redux",
    "Zustand",
    "Recoil",
    "MobX",
    "Context API",
    "REST APIs",
    "API Development",
    "API Integration",
    "GraphQL",
    "WebSockets",
    "Authentication",
    "Authorization",
    "JWT",
    "OAuth",
    "PostgreSQL",
    "MySQL",
    "SQLite",
    "MongoDB",
    "Firebase Firestore",
    "Redis",
    "Deployment",
    "CI/CD",
    "Docker",
    "Kubernetes",
    "AWS",
    "Azure",
    "Google Cloud",
    "Vercel",
    "Netlify",
    "Heroku",
    "Nginx",
    "WordPress",
    "Strapi",
    "Contentful",
    "Sanity",
    "Shopify",
    "Webflow",
    "Socket.io",
    "Realtime Applications",
    "Push Notifications",
  ],
  "Mobile Development": [
    "Android Development",
    "iOS Development",
    "Mobile Development",
    "Flutter",
    "React Native",
    "Ionic",
    "Kotlin",
    "Swift",
    "Xamarin",
    "Unity",
    "Expo",
    "Flutter Widgets",
    "React Navigation",
    "Redux",
    "Zustand",
    "Dart",
    "Objective-C",
    "JavaScript",
    "TypeScript",
    "Java",
    "C#",
    "Rust",
    "Android Studio",
    "Jetpack Compose",
    "XML Layouts",
    "Room Database",
    "LiveData",
    "ViewModel",
    "Xcode",
    "UIKit",
    "SwiftUI",
    "Core Data",
    "Auto Layout",
    "Firebase",
    "Supabase",
    "Backend Development",
    "REST APIs",
    "API Integration",
    "GraphQL",
    "Authentication",
    "Authorization",
    "JWT",
    "OAuth",
    "Firebase Firestore",
    "Realtime Database",
    "SQLite",
    "Room Database",
    "MongoDB",
    "PostgreSQL",
    "MySQL",
    "App Deployment",
    "CI/CD",
    "Fastlane",
    "Google Play Store",
    "App Store",
    "TestFlight",
    "Firebase App Distribution",
    "Mobile Security",
    "Data Encryption",
    "Secure Storage",
    "Biometric Authentication",
    "Socket.io",
    "Realtime Applications",
    "Chat Systems",
    "Live Updates",
    "Push Notifications",
    "In App Purchases",
    "Payment Integration",
    "Offline Storage",
    "Realtime Sync",
    "Geolocation",
    "Maps Integration",
    "Camera Integration",
    "File Upload",
    "Media Handling",
  ],
  "AI/ML": [
    "Python",
    "R",
    "Julia",
    "MATLAB",
    "Machine Learning",
    "Deep Learning",
    "Data Science",
    "Data Analysis",
    "Artificial Intelligence",
    "Natural Language Processing",
    "Computer Vision",
    "Time Series Analysis",
    "Recommender Systems",
    "Speech Recognition",
    "Generative AI",
    "Neural Networks",
    "CNNs",
    "RNNs",
    "Transformers",
    "Attention Mechanisms",
    "Backpropagation",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Seaborn",
    "Plotly",
    "Regression",
    "Logistic Regression",
    "Decision Trees",
    "Random Forest",
    "XGBoost",
    "Clustering",
    "K-Means",
    "Dimensionality Reduction",
    "PCA",
    "Model Evaluation",
    "Cross Validation",
    "Accuracy",
    "Precision",
    "Recall",
    "F1 Score",
    "ROC-AUC",
    "Model Deployment",
    "MLOps",
    "Docker",
    "Kubernetes",
    "CI/CD",
    "API Deployment",
    "FastAPI",
    "Flask for ML APIs",
    "LLMs",
    "Prompt Engineering",
    "LangChain",
    "RAG",
    "Fine-tuning Models",
    "Embeddings",
    "Vector Databases",
    "SQL",
    "NoSQL",
    "MongoDB",
    "PostgreSQL",
    "Scikit-learn",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "LightGBM",
    "Hugging Face Transformers",
    "OpenCV",
    "NLTK",
    "spaCy",
  ],
};

for (const category of Object.keys(SKILLS_BY_CATEGORY)) {
  SKILLS_BY_CATEGORY[category] = [...new Set(SKILLS_BY_CATEGORY[category])];
}

function normalizeSkillText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildStartsWithFuzzyRegex(query: string) {
  const normalized = normalizeSkillText(query);
  if (!normalized) return null;
  const pattern = normalized.split("").join(".*");
  return new RegExp(`^${pattern}`, "i");
}

function doesSkillMatchQuery(skill: string, query: string) {
  const normalizedSkill = normalizeSkillText(skill);
  const normalizedQuery = normalizeSkillText(query);

  if (!normalizedQuery) return true;
  if (normalizedSkill.includes(normalizedQuery)) return true;

  const startsWithFuzzyRegex = buildStartsWithFuzzyRegex(query);
  return startsWithFuzzyRegex ? startsWithFuzzyRegex.test(normalizedSkill) : false;
}

const LEVEL_OPTIONS: SkillLevel[] = ["Required", "Good to have"];
const TIMELINE_OPTIONS = [
  "Less than 1 week",
  "1 to 2 weeks",
  "2 to 4 weeks",
  "1 to 2 months",
  "3 to 6 months",
  "6 months to 1 year",
  "More than 1 year"
];
const BUDGET_MIN = 0;
/** Slider only — amounts above this can be typed in the number field. */
const BUDGET_SLIDER_MAX = 80000;
const BUDGET_STEP = 500;
const PREVIEW_DELAY_MS = 1800;
const PROJECT_SUBMITTED_REDIRECT_DELAY_MS = 2500;
const MAX_SKILLS = 20;

/** Inverse of saveDraftToStorage timeline string (handles "Year(s)", "Month(s)", "Week(s)", multiline). */
function parseTimelineEstimate(estimate: string): {
  years: string;
  months: string;
  weeks: string;
} {
  const flat = (estimate || "").replace(/\s+/g, " ").trim();

  const yMatch = flat.match(/(5\+|\d+)\s+Years?/i);
  let years = "0";
  if (yMatch) {
    const v = yMatch[1];
    if (v === "5+") years = "5+";
    else if (v === "5") years = "5+";
    else if (/^[0-4]$/.test(v)) years = v;
  }

  const mMatch = flat.match(/(\d+)\s+Months?/i);
  let months = "0";
  if (mMatch) {
    const n = parseInt(mMatch[1], 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 11) months = String(n);
  }

  const wMatch = flat.match(/(\d+)\s+Weeks?/i);
  let weeks = "0";
  if (wMatch) {
    const n = parseInt(wMatch[1], 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 4) weeks = String(n);
  }

  return { years, months, weeks };
}

function normalizeJobPostSkills(raw: unknown): SkillItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is SkillItem =>
      typeof item?.name === "string" &&
      (item?.level === "Required" || item?.level === "Good to have"),
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const clientEmail = getClientEmailFromSSP(context);
  if (!clientEmail) {
    return {
      redirect: { destination: "/get-started/client/verify", permanent: false },
    };
  }

  // Ensure client has completed onboarding — required for FK integrity on job_posts
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

const HelperBox = () => {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const fullText = "Our AI Job Post Helper will optimize your job post for tone, grammar, and phrasing. Fill in the basic details and leave the rest to us :)";

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (show) {
      let i = 0;
      const t2 = setInterval(() => {
        i++;
        setText(fullText.slice(0, i));
        if (i === fullText.length) clearInterval(t2);
      }, 15);
      return () => clearInterval(t2);
    }
  }, [show]);

  return (
    <motion.aside
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.95 }}
      transition={{ duration: 0.4 }}
      className="relative h-fit w-full rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] bg-[#b9cc84] px-8 py-6 font-sans text-[16px] font-medium leading-[1.24] text-[#5d742d] md:mt-8 md:w-[385px] md:justify-self-end before:absolute before:-left-[26px] before:top-0 before:h-[26px] before:w-[26px] before:translate-x-px before:bg-[#b9cc84] before:[clip-path:polygon(100%_0,100%_100%,0_0)] before:content-['']"
    >
      {text}
      <span className={show && text.length < fullText.length ? "animate-pulse" : "hidden"}>|</span>
    </motion.aside>
  );
};

export default function ClientJobPostPage({ clientEmail }: { clientEmail: string }) {
  const router = useRouter();
  const [view, setView] = useState<"form" | "loading" | "submitted">("form");
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [timelineYears, setTimelineYears] = useState("0");
  const [timelineMonths, setTimelineMonths] = useState("0");
  const [timelineWeeks, setTimelineWeeks] = useState("0");
  const [deliverables, setDeliverables] = useState("");
  const [budget, setBudget] = useState(20000);
  const [openSkillPopovers, setOpenSkillPopovers] = useState<Record<number, boolean>>({});
  const [skillSearchQueries, setSkillSearchQueries] = useState<Record<number, string>>({});
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const routeTimerRef = useRef<number | null>(null);
  const submittedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (routeTimerRef.current !== null) {
        window.clearTimeout(routeTimerRef.current);
      }
      if (submittedTimerRef.current !== null) {
        window.clearTimeout(submittedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query;
    const wantNewDraft =
      q.new === "1" || (Array.isArray(q.new) && q.new[0] === "1");
    const fromReview =
      q.from === "review" ||
      (Array.isArray(q.from) && q.from[0] === "review");
    const resumeDraft =
      q.resume === "1" ||
      (Array.isArray(q.resume) && q.resume[0] === "1");
    const shouldHydrate = fromReview || resumeDraft;

    function resetToFreshForm() {
      try {
        window.localStorage.removeItem(JOB_POST_DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      setTitle("");
      setCategory("");
      setDescription("");
      setTimelineYears("0");
      setTimelineMonths("0");
      setTimelineWeeks("0");
      setDeliverables("");
      setBudget(20000);
      setSkills([]);
      setOpenSkillPopovers({});
      setSkillSearchQueries({});
      setStep(1);
      setIsLoadingDraft(false);
    }

    // Explicit new, or any entry that is not Edit-from-review / resume-draft
    if (wantNewDraft || !shouldHydrate) {
      resetToFreshForm();
      return;
    }

    let cancelled = false;

    function applyDraftFromJobPostShape(d: JobPostDraft) {
      setTitle(typeof d.title === "string" ? d.title : "");
      const cat = typeof d.category === "string" ? d.category : "";
      setCategory(isValidProjectCategory(cat) ? cat : "");
      setDescription(typeof d.description === "string" ? d.description : "");
      setDeliverables(typeof d.deliverables === "string" ? d.deliverables : "");
      const b = typeof d.budget === "number" && Number.isFinite(d.budget) ? d.budget : 0;
      setBudget(Math.max(BUDGET_MIN, b));
      const { years, months, weeks } = parseTimelineEstimate(
        typeof d.timelineEstimate === "string" ? d.timelineEstimate : "",
      );
      setTimelineYears(years);
      setTimelineMonths(months);
      setTimelineWeeks(weeks);
      setSkills(normalizeJobPostSkills(d.skills));
      setOpenSkillPopovers({});
      setSkillSearchQueries({});
      // Always land on step 1 ("Post Your First Project"); step 2 fields stay prefilled when they continue.
      setStep(1);
    }

    async function loadDraft() {
      try {
        const res = await fetch("/api/client/job-post/get");
        if (res.ok) {
          const body = (await res.json()) as { draft: JobPostDraft | null };
          if (!cancelled && body.draft) {
            applyDraftFromJobPostShape(body.draft);
            try {
              window.localStorage.setItem(
                JOB_POST_DRAFT_STORAGE_KEY,
                JSON.stringify(body.draft),
              );
            } catch {
              // non-critical
            }
            return;
          }
        }
      } catch {
        // fall through to localStorage
      }

      const rawDraft = window.localStorage.getItem(JOB_POST_DRAFT_STORAGE_KEY);
      if (rawDraft && !cancelled) {
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
            applyDraftFromJobPostShape({
              title: parsed.title,
              category: parsed.category,
              description: parsed.description,
              timelineEstimate: parsed.timelineEstimate,
              deliverables: parsed.deliverables,
              budget: parsed.budget,
              skills: normalizeJobPostSkills(parsed.skills),
            });
          }
        } catch {
          // keep defaults
        }
      }
    }

    void loadDraft().finally(() => {
      if (!cancelled) setIsLoadingDraft(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.new, router.query.from, router.query.resume]);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.view === "submitted") {
      setView("submitted");
      scrollToTop();

      if (submittedTimerRef.current !== null) {
        window.clearTimeout(submittedTimerRef.current);
      }

      submittedTimerRef.current = window.setTimeout(() => {
        void router.push("/get-started/client/dashboard");
        submittedTimerRef.current = null;
      }, PROJECT_SUBMITTED_REDIRECT_DELAY_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.view]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStepOne() {
    setView("form");
    setStep(1);
    setIsSubmitting(false);
    scrollToTop();
  }

  function goToStepTwo() {
    setView("form");
    setStep(2);
    setIsSubmitting(false);
    scrollToTop();
  }

  function onBackToStepOne(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    goToStepOne();
  }

  function addNewSkillRow() {
    if (!category) {
      toast.error("Please select a project category before adding skills.");
      return;
    }
    if (skills.length >= MAX_SKILLS) {
      toast.error(`You can only add ${MAX_SKILLS} skills.`);
      return;
    }
    setSkills((prev) => [...prev, { name: "", level: "Required" }]);
  }

  function updateSkillRow(index: number, field: "name" | "level", value: string) {
    if (field === "name") {
      const alreadyExists = skills.some(
        (s, i) => i !== index && s.name.toLowerCase() === value.toLowerCase(),
      );
      if (alreadyExists) {
        toast.error(`"${value}" is already added.`);
        return;
      }
    }
    setSkills((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function onCategoryChange(nextCategory: string) {
    if (!isValidProjectCategory(nextCategory) || nextCategory === category) {
      return;
    }
    setCategory(nextCategory);
    setSkills([]);
    setOpenSkillPopovers({});
    setSkillSearchQueries({});
  }

  function removeSkill(index: number) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function saveDraftToStorage() {
    const upperParts = [
      timelineYears !== "0" ? `${timelineYears} Year${timelineYears === "1" ? "" : "s"}` : "",
      timelineMonths !== "0" ? `${timelineMonths} Month${timelineMonths === "1" ? "" : "s"}` : ""
    ].filter(Boolean);
    
    const weekPart = timelineWeeks !== "0" ? `${timelineWeeks} Week${timelineWeeks === "1" ? "" : "s"}` : "";

    let timelineEstimate = "";
    const upperStr = upperParts.join(" & ");

    if (upperStr && weekPart) {
      timelineEstimate = `${upperStr}\n& ${weekPart}`;
    } else if (upperStr) {
      timelineEstimate = upperStr;
    } else if (weekPart) {
      timelineEstimate = weekPart;
    }

    const draft: JobPostDraft = {
      title: title.trim(),
      category,
      description: description.trim(),
      timelineEstimate,
      deliverables: deliverables.trim(),
      budget,
      skills,
    };

    try {
      window.localStorage.setItem(JOB_POST_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // localStorage failure is non-critical; DB save will still happen
    }

    // Persist to DB in the background — fire and forget, errors are non-blocking
    fetch("/api/client/job-post/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, email: clientEmail }),
    }).catch(() => {
      // swallow — localStorage copy is the fallback
    });
  }

  function validateStepOne() {
    if (!title.trim()) return "Project Title is required.";
    if (title.trim().length < 5) return "Project Title should be at least 5 characters.";

    if (!category) return "Please select a Project Category.";

    if (!description.trim()) return "Project Description is required.";
    if (description.trim().length < 40) {
      return "Project Description should have enough detail (at least 40 characters).";
    }

    const validSkills = skills.filter((s) => s.name.trim() !== "");
    if (!validSkills.length) return "Please add at least one required skill.";

    if (skills.some((s) => !s.name.trim())) {
      return "Please select a valid skill for all added rows, or remove the empty ones.";
    }

    return null;
  }

  function validateStepTwo() {
    if (timelineYears === "0" && timelineMonths === "0" && timelineWeeks === "0") {
      return "Please select at least one numeric value for your estimated timeline.";
    }

    if (!deliverables.trim()) return "Please add expected deliverables.";
    if (deliverables.trim().length < 20) {
      return "Deliverables should be at least 20 characters.";
    }

    return null;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (step === 1) {
      const validationError = validateStepOne();
      if (validationError) {
        toast.error(validationError);
        return;
      }

      goToStepTwo();
      return;
    }

    const validationError = validateStepTwo();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    setView("loading");

    if (routeTimerRef.current !== null) {
      window.clearTimeout(routeTimerRef.current);
    }

    saveDraftToStorage();

    routeTimerRef.current = window.setTimeout(() => {
      void router.push("/get-started/client/job-post-review");
      setIsSubmitting(false);
      toast.success("Project preview generated.");
      routeTimerRef.current = null;
    }, PREVIEW_DELAY_MS);
  }

  const formattedBudget = useMemo(() => new Intl.NumberFormat("en-IN").format(budget), [budget]);


  return (
    <>
      <Head>
        <title>Create Job Post - Hustlr</title>
      </Head>

      <Nav />

      <main className="min-h-screen bg-white pt-16 md:pt-20">
        {view === "loading" && (
          <section className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-6 py-10 sm:px-10 md:px-14 lg:px-20">
            <div className="max-w-[760px] text-center font-ovo text-black">
              <h2 className="text-3xl text-black/90 sm:text-4xl">Running our AI Job Post Helper..</h2>
              <div className="mt-8 flex flex-col items-center gap-2">
                <Loader className="h-12 w-12 animate-spin text-black/70" />
                <p className="text-[11px] font-sans uppercase tracking-wide text-black/60">Loading...</p>
              </div>
              <p className="mx-auto mt-8 max-w-[680px] font-sans text-lg text-black/75 sm:text-2xl">
                We&apos;re formatting your project description so students can understand it clearly.
              </p>
            </div>
          </section>
        )}

        {view === "submitted" && (
          <section className="mx-auto flex min-h-[72vh] w-full max-w-[1200px] flex-col items-center justify-center px-6 text-center">
            <div className="flex items-center gap-3">
              <h1
                className="font-serif text-4xl font-bold tracking-tight text-black/90 sm:text-5xl"
              >
                Project Submitted
              </h1>
              <img
                src="/images/celebration.png"
                alt="Celebration"
                className="h-12 w-12 object-contain mix-blend-multiply sm:h-14 sm:w-14"
              />
            </div>

            <div className="mt-10 flex flex-col items-center gap-2">
              <Loader className="h-12 w-12 animate-spin text-black/70" />
              <p className="text-[11px] font-semibold tracking-wide text-black/60">LOADING...</p>
            </div>

            <p className="mt-9 text-[1.35rem] font-semibold leading-tight text-black/80 sm:text-[1.55rem]">
              Redirecting you to your dashboard..
            </p>
          </section>
        )}

        {view === "form" && isLoadingDraft && (
          <section className="mx-auto flex min-h-[50vh] w-full max-w-6xl items-center justify-center px-6 py-16 sm:px-10 md:px-14 lg:px-20">
            <div className="flex flex-col items-center gap-3 text-center font-sans text-black/70">
              <Loader className="h-10 w-10 animate-spin" />
              <p className="text-sm font-medium">Loading your project draft…</p>
            </div>
          </section>
        )}

        {view === "form" && !isLoadingDraft && (
        <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 md:px-14 lg:px-20">
          <div
            className={`grid grid-cols-1 gap-10 ${
              step === 1 ? "md:grid-cols-[minmax(0,1fr)_420px]" : ""
            }`}
          >
            <div className="w-full max-w-3xl font-ovo text-black">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-serif text-4xl font-normal tracking-tight text-black/90">
                  Post Your First Project
                </h1>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/client/auth/logout", { method: "POST" });
                    void router.push("/get-started/client/verify");
                  }}
                  className="mt-1 flex shrink-0 items-center gap-1.5 text-sm font-sans font-medium text-black/50 hover:text-black/80 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
              <p className="mt-3 text-[1.2rem] font-semibold text-[#58b7ba]">
                Describe the project you want help with. We&apos;ll recommend the best student talent for the job.
              </p>
              <form onSubmit={onSubmit} className="mt-10 space-y-8">
                {step === 1 ? (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="job-post-title" className="block text-base font-semibold text-black">Project Title</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Keep the title clear and specific so students understand the project quickly.
                      </p>
                      <Input
                        id="job-post-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="border border-black/25 bg-white p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="job-post-category" className="block text-base font-semibold text-black">Project Category</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        This helps us match your project with students who have expertise in this area.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={category} onValueChange={onCategoryChange}>
                          <SelectTrigger className="border border-black/25 bg-white p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm sm:w-[180px]">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_CATEGORIES.map((item) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="job-post-description" className="block text-base font-semibold text-black">Project Description</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Clear project descriptions attract better students.
                      </p>
                      <Textarea
                        id="job-post-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        placeholder={`Example:\nWe are looking for a student developer to build a responsive landing page for our startup. The page should include a hero section, product overview, pricing section, and contact form. Students should be comfortable working with React and Tailwind CSS.`}
                        className="min-h-[110px] resize-none border border-black/25 bg-white p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm placeholder:text-black/40"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-base font-semibold text-black">Required Skills</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Add the skills and their requirement for the project.
                      </p>

                      <div className="space-y-3 mt-4">
                        {skills.map((skillItem, index) => {
                          const query = skillSearchQueries[index] || "";
                          const available = SKILLS_BY_CATEGORY[category] ?? [];
                          const filtered = available.filter((skill) => doesSkillMatchQuery(skill, query));

                          return (
                            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="flex items-center rounded-lg bg-gray-100 p-1 pr-2 w-full sm:min-w-[240px] sm:w-auto">
                                <Popover
                                  open={openSkillPopovers[index] || false}
                                  onOpenChange={(open) => {
                                    if (open && !category) {
                                      toast.error("Select a project category first.");
                                      return;
                                    }
                                    setOpenSkillPopovers((prev) => ({ ...prev, [index]: open }));
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      role="combobox"
                                      className={cn(
                                        "flex h-9 w-full sm:w-auto items-center justify-between gap-2 rounded-md px-3 transition-colors",
                                        skillItem.name
                                          ? "bg-[#5FB3B3] text-white hover:bg-[#4d9a9a] hover:text-white"
                                          : "bg-transparent text-gray-500",
                                      )}
                                    >
                                      {skillItem.name || "Select Skill"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[350px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                      <CommandInput
                                        placeholder="Search skill..."
                                        value={query}
                                        onValueChange={(val) =>
                                          setSkillSearchQueries((prev) => ({ ...prev, [index]: val }))
                                        }
                                      />
                                      <CommandList>
                                        <CommandEmpty>No skill found.</CommandEmpty>
                                        {filtered.map((skill) => {
                                          const selectedSkills = skills
                                            .filter((_, i) => i !== index)
                                            .map((s) => s.name.toLowerCase());
                                          if (selectedSkills.includes(skill.toLowerCase())) return null;

                                          return (
                                            <CommandItem
                                              key={skill}
                                              value={skill}
                                              onSelect={() => {
                                                updateSkillRow(index, "name", skill);
                                                setOpenSkillPopovers((prev) => ({ ...prev, [index]: false }));
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  skillItem.name === skill ? "opacity-100" : "opacity-0",
                                                )}
                                              />
                                              {skill}
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="flex items-center gap-4">
                                <Select
                                  value={skillItem.level}
                                  onValueChange={(value) => updateSkillRow(index, "level", value)}
                                >
                                  <SelectTrigger className="h-11 w-full sm:w-[180px] rounded-lg border-none bg-gray-100 font-normal text-gray-900 focus:ring-0">
                                    <SelectValue placeholder="Choose Requirement" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LEVEL_OPTIONS.map((level) => (
                                      <SelectItem key={level} value={level} className="font-normal">
                                        {level}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSkill(index)}
                                  className="h-8 w-8 rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
                                >
                                  <X className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        {skills.length < MAX_SKILLS && (
                          <div className="flex items-center gap-4 pt-2">
                            <Plus
                              className="h-5 w-5 cursor-pointer text-gray-400 hover:text-black hidden sm:block"
                              onClick={addNewSkillRow}
                            />
                            <Button
                              type="button"
                              onClick={addNewSkillRow}
                              className="h-11 w-full sm:w-auto sm:min-w-[240px] justify-start rounded-lg bg-[#5FB3B3] px-4 py-2.5 font-normal text-white hover:bg-[#4d9a9a]"
                            >
                              Add Skill ({skills.length}/{MAX_SKILLS})
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="h-10 rounded-lg bg-black px-8 text-sm text-white hover:bg-black/90"
                      >
                        Continue to Timeline
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-2xl font-semibold text-black">Timeline</label>
                        <p className="text-[11px] text-[#7e8f4f]">
                          Choose the approximate time needed to complete the project.
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex flex-col gap-1 w-full sm:w-[120px]">
                          <label className="text-[12px] font-semibold text-black/80">Years</label>
                          <Select value={timelineYears} onValueChange={setTimelineYears}>
                            <SelectTrigger className="border border-black/25 bg-white p-2 font-sans shadow-sm shadow-black/30 text-black text-sm">
                              <SelectValue placeholder="Years" />
                            </SelectTrigger>
                            <SelectContent>
                              {["0", "1", "2", "3", "4", "5+"].map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1 w-full sm:w-[120px]">
                          <label className="text-[12px] font-semibold text-black/80">Months</label>
                          <Select value={timelineMonths} onValueChange={setTimelineMonths}>
                            <SelectTrigger className="border border-black/25 bg-white p-2 font-sans shadow-sm shadow-black/30 text-black text-sm">
                              <SelectValue placeholder="Months" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i.toString()).map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1 w-full sm:w-[120px]">
                          <label className="text-[12px] font-semibold text-black/80">Weeks</label>
                          <Select value={timelineWeeks} onValueChange={setTimelineWeeks}>
                            <SelectTrigger className="border border-black/25 bg-white p-2 font-sans shadow-sm shadow-black/30 text-black text-sm">
                              <SelectValue placeholder="Weeks" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => i.toString()).map((item) => (
                                <SelectItem key={item} value={item}>{item}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="job-post-deliverables" className="block text-2xl font-semibold text-black">Deliverables</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        List what the final outcome of the project should include.
                      </p>
                      <Textarea
                        id="job-post-deliverables"
                        value={deliverables}
                        onChange={(e) => setDeliverables(e.target.value)}
                        rows={5}
                        placeholder={`- Fully responsive landing page\n- Clean codebase\n- Deployment on Vercel`}
                        className="min-h-[110px] resize-none border border-black/25 bg-white p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm placeholder:text-black/40"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="block text-2xl font-semibold text-black">Budget</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Students will see this range before deciding to work on the project. Please ensure the budget is a fair compensation.
                      </p>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
                        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
                          <div className="relative pt-4">
                            <input
                              type="range"
                              min={BUDGET_MIN}
                              max={BUDGET_SLIDER_MAX}
                              step={BUDGET_STEP}
                              value={Math.min(Math.max(budget, BUDGET_MIN), BUDGET_SLIDER_MAX)}
                              onChange={(e) => setBudget(Number(e.target.value))}
                              className="h-2.5 w-full cursor-pointer appearance-none rounded-full outline-none transition-all [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-[#5FB3B3] [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5FB3B3] [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.2)] hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95"
                              style={{
                                background: (() => {
                                  const v = Math.min(Math.max(budget, BUDGET_MIN), BUDGET_SLIDER_MAX);
                                  const pct =
                                    ((v - BUDGET_MIN) / (BUDGET_SLIDER_MAX - BUDGET_MIN)) * 100;
                                  return `linear-gradient(to right, #5FB3B3 ${pct}%, #e5e7eb ${pct}%)`;
                                })(),
                              }}
                            />
                          </div>

                          <div className="mt-2 flex items-center justify-between font-sans text-xs font-medium text-black/40">
                            <span>₹0</span>
                            <span>₹80,000+</span>
                          </div>

                          <div className="mx-auto mt-6 flex w-[180px] items-center justify-center gap-1 rounded-xl border border-black/10 bg-gray-50 px-3 py-2 shadow-inner transition-colors focus-within:border-[#5FB3B3] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#5FB3B3]/20">
                            <span className="font-sans text-xl font-medium text-black/60">₹</span>
                            <input
                              type="number"
                              min={BUDGET_MIN}
                              value={budget || ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                  setBudget(0);
                                  return;
                                }
                                const val = parseInt(raw, 10);
                                setBudget(Number.isNaN(val) ? 0 : val);
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (Number.isNaN(val) || val < BUDGET_MIN) setBudget(BUDGET_MIN);
                              }}
                              className="w-full bg-transparent p-0 text-center font-sans text-2xl font-bold text-black outline-none outline-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>

                        <aside className="rounded-xl bg-[#b9cc84] p-5 font-sans text-[12px] leading-[1.4] text-black/85 shadow-sm">
                          <p>
                            <strong>Remember</strong> that this amount must be deposited before your project begins with a student. This is to prevent fraudulent and unfair behaviours from the client side. Your payment will be held with us via escrow until project completion after which the money will be transferred to the student.
                          </p>
                          <p className="mt-2">
                            In case of any dissatisfaction with a student&apos;s performance, your money will be fully refunded to you by us.
                          </p>
                        </aside>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-8">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onBackToStepOne}
                        className="h-10 rounded-lg border border-black/20 px-6 text-sm text-black hover:bg-black/5"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-10 rounded-lg bg-black px-8 text-sm text-white hover:bg-black/90"
                      >
                        {isSubmitting ? "Please wait..." : "Preview Project"}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </div>

            {step === 1 && (
              <HelperBox />
            )}
          </div>
        </section>
        )}
      </main>
    </>
  );
}
