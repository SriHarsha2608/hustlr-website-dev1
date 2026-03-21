import Head from "next/head";
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
const BUDGET_MIN = 0;
const BUDGET_MAX = 80000;
const BUDGET_STEP = 500;
const PREVIEW_DELAY_MS = 1800;
const PROJECT_SUBMITTED_REDIRECT_DELAY_MS = 2500;
const MAX_SKILLS = 20;

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

export default function ClientJobPostPage({ clientEmail }: { clientEmail: string }) {
  const router = useRouter();
  const [view, setView] = useState<"form" | "loading" | "submitted">("form");
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [timelineEstimate, setTimelineEstimate] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [budget, setBudget] = useState(20000);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);
  const [isRequirementDropdownOpen, setIsRequirementDropdownOpen] = useState(false);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | "">("");
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const rawDraft = window.localStorage.getItem(JOB_POST_DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const parsed = JSON.parse(rawDraft) as Partial<JobPostDraft>;
      if (typeof parsed.title === "string") setTitle(parsed.title);
      if (typeof parsed.category === "string" && isValidProjectCategory(parsed.category)) {
        setCategory(parsed.category);
      }
      if (typeof parsed.description === "string") setDescription(parsed.description);
      if (typeof parsed.timelineEstimate === "string") setTimelineEstimate(parsed.timelineEstimate);
      if (typeof parsed.deliverables === "string") setDeliverables(parsed.deliverables);
      if (typeof parsed.budget === "number") setBudget(parsed.budget);
      if (Array.isArray(parsed.skills)) {
        const validSkills = parsed.skills.filter(
          (item): item is SkillItem =>
            typeof item?.name === "string" &&
            (item?.level === "Required" || item?.level === "Good to have"),
        );
        setSkills(validSkills);
      }
    } catch {
      // Keep defaults if parsing fails.
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.view === "submitted") {
      setView("submitted");
      scrollToTop();

      if (submittedTimerRef.current !== null) {
        window.clearTimeout(submittedTimerRef.current);
      }

      submittedTimerRef.current = window.setTimeout(() => {
        void router.push("/");
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

  function addSkill() {
    const normalized = selectedSkill.trim();
    if (!normalized) {
      toast.error("Please select a skill from the dropdown.");
      return;
    }

    if (skills.length >= MAX_SKILLS) {
      toast.error("You can only add 20 skills for a project.");
      return;
    }

    if (!skillLevel) {
      toast.error("Please select the requirement level (Required or Good to have).");
      return;
    }

    const alreadyExists = skills.some(
      (skill) => skill.name.toLowerCase() === normalized.toLowerCase(),
    );
    if (alreadyExists) {
      toast.error("This skill is already added.");
      return;
    }

    setSkills((prev) => [...prev, { name: normalized, level: skillLevel }]);
    setSelectedSkill("");
    setSkillSearchQuery("");
    setSkillLevel("");
  }

  function onCategoryChange(nextCategory: string) {
    if (!isValidProjectCategory(nextCategory) || nextCategory === category) {
      return;
    }

    setCategory(nextCategory);
    setSelectedSkill("");
    setSkillSearchQuery("");
    setIsSkillDropdownOpen(false);
  }

  function removeSkill(index: number) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function onSkillDropdownOpenChange(nextOpen: boolean) {
    if (nextOpen && !category) {
      toast.error("Select a project category first.");
      setIsSkillDropdownOpen(false);
      return;
    }

    setIsSkillDropdownOpen(nextOpen);
  }

  function onRequirementDropdownOpenChange(nextOpen: boolean) {
    if (nextOpen && !selectedSkill) {
      toast.error("Select the skill first.");
      setIsRequirementDropdownOpen(false);
      return;
    }

    setIsRequirementDropdownOpen(nextOpen);
  }

  function onRequirementLevelChange(value: string) {
    if (!selectedSkill) {
      toast.error("Select the skill first.");
      return;
    }

    setSkillLevel(value as SkillLevel);
  }

  function saveDraftToStorage() {
    const draft: JobPostDraft = {
      title: title.trim(),
      category,
      description: description.trim(),
      timelineEstimate: timelineEstimate.trim(),
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

    if (!skills.length) return "Please add at least one required skill.";

    return null;
  }

  function validateStepTwo() {
    if (!timelineEstimate.trim()) {
      return "Please enter the estimated timeline (for example: 2 months or 3 weeks).";
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

  const availableSkillOptions = useMemo(
    () => SKILLS_BY_CATEGORY[category] ?? [],
    [category],
  );

  const filteredSkillOptions = useMemo(
    () => availableSkillOptions.filter((skill) => doesSkillMatchQuery(skill, skillSearchQuery)),
    [availableSkillOptions, skillSearchQuery],
  );

  return (
    <>
      <Head>
        <title>Create Job Post - Hustlr</title>
      </Head>

      <Nav />

      <main className="min-h-screen bg-[#f4f4f4] pt-16 md:pt-20">
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
              Redirecting you to the homepage while we set up your dashboard..
            </p>
          </section>
        )}

        {view === "form" && (
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
                      <label htmlFor="job-post-title" className="block text-sm font-semibold text-black">Project Title</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Keep the title clear and specific so students understand the project quickly.
                      </p>
                      <Input
                        id="job-post-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-9 rounded-md border border-black/20 bg-[#e9e9e9] text-sm font-sans text-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="job-post-category" className="block text-sm font-semibold text-black">Project Category</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        This helps us match your project with students who have expertise in this area.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Select value={category} onValueChange={onCategoryChange}>
                          <SelectTrigger className="h-9 w-full rounded-md border border-black/20 bg-[#e9e9e9] text-sm font-sans text-black sm:w-[180px]">
                            <SelectValue placeholder="project category" />
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
                      <label htmlFor="job-post-description" className="block text-sm font-semibold text-black">Project Description</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Clear project descriptions attract better students.
                      </p>
                      <Textarea
                        id="job-post-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        placeholder={`Describe the project in detail.\n\nExample:\nWe are looking for a student developer to build a responsive landing page for our startup. The page should include a hero section, product overview, pricing section, and contact form. Students should be comfortable working with React and Tailwind CSS.`}
                        className="min-h-[110px] resize-none rounded-md border border-black/20 bg-[#e9e9e9] py-2 text-sm font-sans text-black"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-black">Required Skills</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Add the skills and their requirement for the project.
                      </p>

                      {!!skills.length && (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, index) => (
                            <div
                              key={`${skill.name}-${index}`}
                              className="inline-flex items-center gap-2 rounded-md bg-[#58b7ba]/25 px-3 py-1 text-xs font-semibold text-black"
                            >
                              <span>{skill.name}</span>
                              <span className="text-black/55">{skill.level}</span>
                              <button
                                type="button"
                                onClick={() => removeSkill(index)}
                                className="rounded p-[1px] text-black/60 transition-colors hover:bg-black/10 hover:text-black"
                                aria-label={`Remove ${skill.name}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex flex-1 items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={addSkill}
                            className="h-9 rounded-md border border-black/15 bg-[#e9e9e9] px-2 text-black hover:bg-[#dcdcdc]"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Popover open={isSkillDropdownOpen} onOpenChange={onSkillDropdownOpenChange}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={isSkillDropdownOpen}
                                className="h-9 w-full justify-between rounded-md border border-black/20 bg-[#e9e9e9] text-sm font-sans text-black hover:bg-[#e1e1e1]"
                              >
                                <span className="truncate text-left">
                                  {selectedSkill || (category ? "Search and select skill" : "Select category first")}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-70" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] border-black/20 p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  value={skillSearchQuery}
                                  onValueChange={setSkillSearchQuery}
                                  placeholder="Search skill (e.g. Nod)"
                                />
                                <CommandList>
                                  <CommandEmpty>No skills found for your search.</CommandEmpty>
                                  {filteredSkillOptions.map((skill) => (
                                    <CommandItem
                                      key={skill}
                                      value={skill}
                                      onSelect={() => {
                                        setSelectedSkill(skill);
                                        setIsSkillDropdownOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedSkill === skill ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      {skill}
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <Select
                          open={isRequirementDropdownOpen}
                          onOpenChange={onRequirementDropdownOpenChange}
                          value={skillLevel}
                          onValueChange={onRequirementLevelChange}
                        >
                          <SelectTrigger className="h-9 w-full rounded-md border border-black/20 bg-[#e9e9e9] text-sm font-sans text-black sm:w-[190px]">
                            <SelectValue placeholder="Choose Requirement" />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVEL_OPTIONS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    <div className="space-y-2">
                      <label className="block text-2xl font-semibold text-black">Timeline</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Choose the approximate time needed to complete the project.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="job-post-timeline" className="block text-sm font-semibold text-black">Weeks</label>
                      <Input
                        id="job-post-timeline"
                        value={timelineEstimate}
                        onChange={(e) => setTimelineEstimate(e.target.value)}
                        placeholder="e.g. 2 months or 3 weeks"
                        className="h-9 w-[120px] rounded-md border border-black/20 bg-[#e9e9e9] text-sm font-sans text-black"
                      />
                      <p className="text-[11px] text-[#58b7ba]">
                        Calculate the duration: eg 2 months or 3 weeks
                      </p>
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
                        placeholder={`Example:\n- Fully responsive landing page\n- Clean codebase\n- Deployment on Vercel`}
                        className="min-h-[110px] resize-none rounded-md border border-black/20 bg-[#e9e9e9] py-2 text-sm font-sans text-black"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="block text-2xl font-semibold text-black">Budget</label>
                      <p className="text-[11px] text-[#7e8f4f]">
                        Students will see this range before deciding to work on the project. Please ensure the budget is a fair compensation.
                      </p>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
                        <div className="pt-2">
                          <div className="relative h-7">
                            <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-black/80" />
                            <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-[1px]">
                              {Array.from({ length: 13 }).map((_, idx) => (
                                <span
                                  key={idx}
                                  className={`block w-[2px] ${idx % 3 === 0 ? "h-4 bg-black/85" : "h-2.5 bg-black/75"}`}
                                />
                              ))}
                            </div>
                          </div>

                          <input
                            type="range"
                            min={BUDGET_MIN}
                            max={BUDGET_MAX}
                            step={BUDGET_STEP}
                            value={budget}
                            onChange={(e) => setBudget(Number(e.target.value))}
                            className="mt-1 h-2 w-full cursor-pointer accent-black"
                          />

                          <div className="mt-1 flex items-center justify-between text-[11px] font-sans text-black/70">
                            <span>0</span>
                            <span>Above 80,000</span>
                          </div>

                          <div className="mx-auto mt-2 w-[130px] rounded-[8px] bg-[#e2e2e2] py-1 text-center font-sans text-xl text-black/85">
                            ₹{formattedBudget}
                          </div>
                        </div>

                        <aside className="relative rounded-tr-[6px] rounded-br-[6px] rounded-bl-[6px] bg-[#b9cc84] px-4 py-3 font-sans text-[12px] leading-[1.2] text-black/80 before:absolute before:-left-[20px] before:top-0 before:h-[20px] before:w-[20px] before:translate-x-px before:bg-[#b9cc84] before:[clip-path:polygon(100%_0,100%_100%,0_0)] before:content-['']">
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
              <aside className="relative h-fit w-full rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] bg-[#b9cc84] px-8 py-6 font-sans text-[16px] font-medium leading-[1.24] text-[#5d742d] md:mt-8 md:w-[385px] md:justify-self-end before:absolute before:-left-[26px] before:top-0 before:h-[26px] before:w-[26px] before:translate-x-px before:bg-[#b9cc84] before:[clip-path:polygon(100%_0,100%_100%,0_0)] before:content-['']">
                Our AI Job Post Helper will optimize your job post for tone, grammar, and phrasing. Fill in the basic details and leave the rest to us!
              </aside>
            )}
          </div>
        </section>
        )}
      </main>
    </>
  );
}
