import Head from "next/head";
import { FormEvent, useState } from "react";
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

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsCompleting(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    router.push("/");
  }

  if (isCompleting) {
    return (
      <>
        <Head>
          <title>Finalizing Onboarding - Hustlr</title>
        </Head>

        <Nav />

        <main className="min-h-screen bg-[#f4f4f4] pt-16 md:pt-20">
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

  return (
    <>
      <Head>
        <title>Client Onboarding - Hustlr</title>
      </Head>

      <Nav />

      <main className="min-h-screen bg-[#f4f4f4] pt-16 md:pt-20">
        <section className="px-6 py-10 sm:px-10 md:px-14 lg:px-24">
          <div className="w-full max-w-2xl font-sans text-black">
            <h1 className="font-serif text-4xl font-normal tracking-tight text-black/90">
              Tell Us About Your Business
            </h1>
            <p className="mt-6 text-[1.4rem] font-semibold leading-tight text-black/85">
              Help students understand who they will be working with
            </p>
            <p className="mt-3 text-[1.2rem] font-semibold text-[#58b7ba]">
              Verified companies attract better student talent.
            </p>

            <form onSubmit={onSubmit} className="mt-12 space-y-7">
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-8 rounded-md border-black/10 bg-[#eaeaea] text-sm text-black placeholder:text-black/45"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Company Website</label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="h-8 rounded-md border-black/10 bg-[#eaeaea] text-sm text-black placeholder:text-black/45"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Company LinkedIn</label>
                <Input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="h-8 rounded-md border-black/10 bg-[#eaeaea] text-sm text-black placeholder:text-black/45"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Industry</label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="h-8 w-full md:w-[220px] rounded-md border-black/10 bg-[#eaeaea] text-sm text-black">
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
                <label className="block text-sm font-semibold">Company Size</label>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger className="h-8 w-full md:w-[220px] rounded-md border-black/10 bg-[#eaeaea] text-sm text-black">
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
                <label className="block text-sm font-semibold">Country</label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-8 w-full md:w-[220px] rounded-md border-black/10 bg-[#eaeaea] text-sm text-black">
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
                  <label className="block text-sm font-semibold">Company Description</label>
                  <span className="text-xs text-black/55">Word limit: 50</span>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Briefly explain what your company does
Ex: We are a fintech startup building tools that help small businesses manage payments.`}
                  rows={3}
                  className="min-h-[84px] resize-none rounded-md border-black/10 bg-[#eaeaea] py-2 text-sm text-black placeholder:text-black/45"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isCompleting}
                  className="h-10 rounded-lg bg-black px-10 text-white hover:bg-black/90"
                >
                  {isCompleting ? "Please wait..." : "Complete Onboarding"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
