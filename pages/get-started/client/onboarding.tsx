import Head from "next/head";
import { FormEvent, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Nav from "@/src/components/Nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { CLIENT_PROFILE_STORAGE_KEY } from "@/src/lib/clientTypes";
import { getClientEmailFromSSP } from "@/src/lib/clientAuthUtils";
import { GetServerSideProps } from "next";
import { createClient } from "@/src/lib/supabase/auth/component";

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Marketing",
  "Ecommerce",
  "Consulting",
  "Other",
];

const SIZE_OPTIONS = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "200+ employees",
];

const COUNTRY_OPTIONS = ["India", "United States", "United Kingdom", "Singapore", "Australia"];
const LOADER_SEGMENTS = Array.from({ length: 12 }, (_, index) => index);

const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const clientEmail = getClientEmailFromSSP(context);
  if (!clientEmail) {
    return {
      redirect: { destination: "/get-started/client/verify", permanent: false },
    };
  }

  return { props: { clientEmail } };
};

export default function ClientOnboardingPage({ clientEmail }: { clientEmail: string }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [studentWorkReason, setStudentWorkReason] = useState("");
  const [viewState, setViewState] = useState<"form" | "loading" | "success">("form");
  const [isCompanyLocked, setIsCompanyLocked] = useState(false);
  const supabaseClientRef = useRef<ReturnType<typeof createClient> | null>(null);

  function getSupabaseClient() {
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
    }
    return supabaseClientRef.current;
  }

  useEffect(() => {
    const supabaseClient = getSupabaseClient();
    supabaseClient.auth.getUser().then(({ data, error }) => {
      if (!error && data?.user?.user_metadata?.companyName) {
        setCompanyName(data.user.user_metadata.companyName);
        setIsCompanyLocked(true);
      }
    });
  }, []);

  function validateOnboardingForm() {
    if (!companyName.trim()) return "Company Name is required.";
    if (companyName.trim().length < 2) return "Company Name must be at least 2 characters.";

    if (!website.trim()) return "Company Website is required.";
    if (!URL_REGEX.test(website.trim())) return "Please enter a valid Company Website URL.";

    if (!linkedin.trim()) return "Company LinkedIn is required.";
    if (!URL_REGEX.test(linkedin.trim())) return "Please enter a valid LinkedIn URL.";

    if (!industry) return "Please select your Industry.";
    if (!companySize) return "Please select your Company Size.";
    if (!country) return "Please select your Country.";

    if (!description.trim()) return "Company Description is required.";
    const wordCount = description.trim().split(/\s+/).length;
    if (wordCount > 50) return "Company Description must be 50 words or fewer.";

    return null;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validateOnboardingForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const profileData = {
      companyName: companyName.trim(),
      website: website.trim(),
      linkedin: linkedin.trim(),
      industry,
      companySize,
      country,
      description: description.trim(),
      studentWorkReason: studentWorkReason.trim(),
    };

    // Save to localStorage as a fast fallback
    try {
      window.localStorage.setItem(CLIENT_PROFILE_STORAGE_KEY, JSON.stringify(profileData));
    } catch {
      // non-critical; continue
    }

    setViewState("loading");

    // Persist to database
    try {
      const res = await fetch("/api/client/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profileData, email: clientEmail }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(error || "Failed to save profile. Please try again.");
        setViewState("form");
        return;
      }
    } catch {
      toast.error("Network error saving profile. Please try again.");
      setViewState("form");
      return;
    }

    setViewState("success");
  }

  if (viewState === "loading") {
    return (
      <>
        <Head>
          <title>Finalizing Onboarding - Hustlr</title>
        </Head>

        <Nav />

        <main className="min-h-screen bg-white pt-16 md:pt-20">
          <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
            <h1 className="font-serif text-5xl font-normal tracking-tight text-black/90 sm:text-6xl">
              Your Account Is Almost Ready..
            </h1>

            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="relative h-12 w-12 animate-spin">
                {LOADER_SEGMENTS.map((segment) => (
                  <span
                    key={segment}
                    className="absolute left-1/2 top-1/2 h-3.5 w-[3px] rounded-full bg-black"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${segment * 30}deg) translateY(-14px)`,
                      opacity: (segment + 1) / 12,
                    }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-semibold tracking-wide text-black/60">LOADING...</p>
            </div>

            <p className="mt-8 max-w-md text-xl font-semibold leading-relaxed text-black/70">
              hustlr is trusted by startups, researchers, and companies looking to work with the next generation of talent.
            </p>
          </section>
        </main>
      </>
    );
  }

  if (viewState === "success") {
    return (
      <>
        <Head>
          <title>Onboarding Complete - Hustlr</title>
        </Head>

        <Nav />

        <main className="min-h-screen bg-white pt-16 md:pt-20">
          <section className="mx-auto flex min-h-[72vh] w-full max-w-[1200px] flex-col items-center justify-center px-6 text-center">
            <div className="flex items-center gap-4">
              <h1 className="font-serif text-4xl font-bold tracking-tight text-black/90 sm:text-5xl">
                Your Hustlr Account Is Ready
              </h1>
              <img
                src="/images/celebration.png"
                alt="Celebration"
                className="h-16 w-16 object-contain mix-blend-multiply sm:h-20 sm:w-20"
              />
            </div>

            <p className="mt-16 text-[1.7rem] font-semibold leading-tight text-[#58b7ba] sm:text-[1.95rem]">
              You&apos;re Ready to Post Your First Project
            </p>
            <p className="mt-4 whitespace-nowrap text-[1.35rem] font-semibold leading-tight text-black/85 sm:text-[1.5rem]">
              You can now post a project and discover top student talent matched to your requirements.
            </p>

            <div className="mt-10 flex w-full max-w-xs flex-col gap-4">
              <Button
                type="button"
                onClick={() => router.push("/get-started/client/job-post")}
                className="h-11 rounded-2xl bg-black text-base font-semibold text-white hover:bg-black/90"
              >
                Post My First Project
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void router.push("/get-started/client/dashboard");
                }}
                className="h-11 rounded-2xl border-black/20 bg-transparent text-base font-semibold text-black hover:bg-black/5"
              >
                Go To Dashboard
              </Button>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Client Onboarding - Hustlr</title>
      </Head>

      <Nav />

      <main className="min-h-screen bg-white pt-16 md:pt-20">
        <section className="px-6 py-10 sm:px-10 md:px-14 lg:px-24">
          <div className="mx-auto w-full max-w-2xl font-ovo text-black">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-serif text-4xl font-normal tracking-tight text-black/90">
                Tell Us About Your Business
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
            <p className="mt-6 text-[1.4rem] font-semibold leading-tight text-black/85">
              Help students understand who they will be working with
            </p>
            <p className="mt-3 text-[1.2rem] font-semibold text-[#58b7ba]">
              Verified companies attract better student talent.
            </p>

            <form onSubmit={onSubmit} className="mt-12 space-y-7">
              <div className="space-y-2">
                <label htmlFor="onboarding-company-name" className="block text-sm font-semibold text-black">Company Name</label>
                <Input
                  id="onboarding-company-name"
                  required
                  value={companyName}
                  disabled={isCompanyLocked}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`border border-black/25 p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm ${
                    isCompanyLocked ? "bg-black/5 cursor-not-allowed opacity-80" : ""
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-website" className="block text-sm font-semibold text-black">Company Website</label>
                <Input
                  id="onboarding-website"
                  required
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="border border-black/25 p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-linkedin" className="block text-sm font-semibold text-black">Company LinkedIn</label>
                <Input
                  id="onboarding-linkedin"
                  required
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="border border-black/25 p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-industry" className="block text-sm font-semibold text-black">Industry</label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="border border-black/25 p-2 w-full md:w-[220px] font-sans shadow-sm shadow-black/30 text-black text-sm">
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-company-size" className="block text-sm font-semibold text-black">Company Size</label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger className="border border-black/25 p-2 w-full md:w-[220px] font-sans shadow-sm shadow-black/30 text-black text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-country" className="block text-sm font-semibold text-black">Country</label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="border border-black/25 p-2 w-full md:w-[220px] font-sans shadow-sm shadow-black/30 text-black text-sm">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="onboarding-description" className="block text-sm font-semibold text-black">Company Description</label>
                  <span className="text-xs text-black/55">Word limit: 50</span>
                </div>
                <Textarea
                  id="onboarding-description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Ex: We are a fintech startup building tools that help small businesses manage payments.`}
                  rows={3}
                  className="min-h-[84px] resize-none border border-black/25 p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="onboarding-student-work-reason" className="block text-sm font-semibold text-black">Why should students work with you?</label>
                <Textarea
                  id="onboarding-student-work-reason"
                  value={studentWorkReason}
                  onChange={(e) => setStudentWorkReason(e.target.value)}
                  placeholder={`Ex: Students get ownership, mentorship from senior team members, and real impact on live projects.`}
                  rows={3}
                  className="min-h-[84px] resize-none border border-black/25 p-2 w-full font-sans shadow-sm shadow-black/30 text-black text-sm"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={viewState !== "form"}
                  className="h-10 rounded-lg bg-black px-10 text-white hover:bg-black/90"
                >
                  {viewState !== "form" ? "Please wait..." : "Complete Onboarding"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
