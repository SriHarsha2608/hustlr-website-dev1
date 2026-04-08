import Head from "next/head";
import { useRouter } from "next/router";
import { useRef, useState, useEffect } from "react";
import {
  Star,
  Settings,
  LogOut,
  GitBranch,
  MessageSquare,
  Home,
  Search,
  Bookmark,
  X,
  MapPin,
  GraduationCap,
  ExternalLink,
  Github,
  Linkedin,
  Rocket,
} from "lucide-react";
import { getClientEmailFromSSP } from "@/src/lib/clientAuthUtils";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { GetServerSideProps } from "next";
import { toast } from "sonner";

/* ───────── Types ───────── */

type JobPost = {
  id: string;
  title: string;
  category: string;
  description: string;
  timeline_estimate: string;
  budget: number;
  skills: { name: string; level: string }[];
  status: string;
  created_at: string;
};

type StudentRow = {
  name: string;
  email: string;
  college: string;
  year: string;
  category: string;
  skills: { skill: string; proficiency: string }[];
  final_score: number | null;
  status: string | null;
  linkedin?: string;
  github?: string;
  degree?: string;
  branch?: string;
  awards?: {
    title: string;
    category: string;
    organization: string;
    month: string;
    year: string;
  }[];
  projects?: {
    title: string;
    type: string;
    members: string;
    description: string;
    techStack: string[];
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
    githubLink?: string;
  }[];
  experiences?: {
    title: string;
    employmentType: string;
    company: string;
    description: string;
    skills: string[];
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
  }[];
  hackathons?: {
    name: string;
    projectName: string;
    description: string;
    placement: string;
    githubLink: string;
    type: string;
    teamSize: string;
    role: string;
    techStack: string[];
  }[];
};

type ProjectPageProps = {
  clientEmail: string;
  companyName: string;
  project: JobPost;
  allProjects: JobPost[];
  students: StudentRow[];
};

/* ───────── SSR ───────── */

export const getServerSideProps: GetServerSideProps = async (context) => {
  const clientEmail = getClientEmailFromSSP(context);
  if (!clientEmail) {
    return {
      redirect: { destination: "/get-started/client/verify", permanent: false },
    };
  }

  const { data: profile } = await supabaseAdmin
    .from("client_profiles")
    .select("company_name")
    .eq("email", clientEmail)
    .maybeSingle();

  if (!profile) {
    return {
      redirect: {
        destination: "/get-started/client/onboarding",
        permanent: false,
      },
    };
  }

  const projectId = context.params?.id as string;

  const { data: project } = await supabaseAdmin
    .from("job_posts")
    .select(
      "id, title, category, description, timeline_estimate, budget, skills, status, created_at"
    )
    .eq("id", projectId)
    .eq("client_email", clientEmail)
    .maybeSingle();

  if (!project) {
    return {
      redirect: {
        destination: "/get-started/client/dashboard",
        permanent: false,
      },
    };
  }

  const { data: allPosts } = await supabaseAdmin
    .from("job_posts")
    .select(
      "id, title, category, description, timeline_estimate, budget, skills, status, created_at"
    )
    .eq("client_email", clientEmail)
    .order("created_at", { ascending: false });

  /* Fetch top 100 students from vettingapplications ordered by final_score desc */
  const { data: studentsRaw } = await supabaseAdmin
    .from("vettingapplications")
    .select(
      "name, email, college, year, category, skills, final_score, status, projects, experiences, linkedin, github, degree, branch, awards, hackathons"
    )
    .not("name", "is", null)
    .order("final_score", { ascending: false, nullsFirst: false })
    .limit(100);

  return {
    props: {
      clientEmail,
      companyName: profile.company_name || "Your Company",
      project,
      allProjects: allPosts || [],
      students: (studentsRaw || []) as StudentRow[],
    },
  };
};

/* ───────── Helpers ───────── */

/* Skill pill color — light teal bg with dark teal text */
const SKILL_COLOR = { bg: "#DFF0F0", text: "#3d8a8c" };

function formatScore(score: number | null): string {
  if (score == null) return "N/A";
  return `${Math.round(score)}%`;
}

function normalizeSkillName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function getProjectRequiredSkills(project: JobPost): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const skill of Array.isArray(project.skills) ? project.skills : []) {
    const name = typeof skill?.name === "string" ? skill.name.trim() : "";
    if (!name) continue;
    const key = normalizeSkillName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }

  return out;
}

function getCandidateSkillNames(student: StudentRow): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const addSkill = (value: string | undefined | null) => {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) return;
    const key = normalizeSkillName(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(name);
  };

  for (const skill of Array.isArray(student.skills) ? student.skills : []) {
    if (typeof skill === "string") {
      addSkill(skill);
    } else {
      addSkill(skill?.skill);
    }
  }

  for (const exp of Array.isArray(student.experiences) ? student.experiences : []) {
    for (const skill of Array.isArray(exp.skills) ? exp.skills : []) {
      addSkill(skill);
    }
  }

  for (const proj of Array.isArray(student.projects) ? student.projects : []) {
    for (const skill of Array.isArray(proj.techStack) ? proj.techStack : []) {
      addSkill(skill);
    }
  }

  for (const hack of Array.isArray(student.hackathons) ? student.hackathons : []) {
    for (const skill of Array.isArray(hack.techStack) ? hack.techStack : []) {
      addSkill(skill);
    }
  }

  return out;
}

function getSkillMatch(student: StudentRow, requiredSkills: string[]) {
  const requiredSet = new Set(requiredSkills.map((s) => normalizeSkillName(s)).filter(Boolean));
  if (!requiredSet.size) {
    return { matchedCount: 0, totalCount: 0, matchedSkills: [] as string[] };
  }

  const candidateSkills = getCandidateSkillNames(student);
  const matchedSkills = candidateSkills.filter((skill) =>
    requiredSet.has(normalizeSkillName(skill)),
  );

  return {
    matchedCount: matchedSkills.length,
    totalCount: requiredSet.size,
    matchedSkills,
  };
}

function hasSimilarProjectExperience(
  student: StudentRow,
  requiredSkills: string[],
  thresholdPercent = 75,
) {
  const requiredSet = new Set(requiredSkills.map((s) => normalizeSkillName(s)).filter(Boolean));
  if (!requiredSet.size) return false;

  const projects = Array.isArray(student.projects) ? student.projects : [];
  if (!projects.length) return false;

  for (const proj of projects) {
    const techStack = Array.isArray(proj.techStack) ? proj.techStack : [];
    const projectSkillSet = new Set(
      techStack.map((s) => normalizeSkillName(s)).filter(Boolean),
    );

    if (!projectSkillSet.size) continue;

    let matched = 0;
    for (const required of requiredSet) {
      if (projectSkillSet.has(required)) matched += 1;
    }

    const matchPercent = (matched / requiredSet.size) * 100;
    if (matchPercent >= thresholdPercent) {
      return true;
    }
  }

  return false;
}

/* Shadow — matches admin dashboard exactly */
const CARD_SHADOW = "shadow-[-2px_4px_9px_rgba(0,0,0,0.40)]";

function shortlistStorageKey(clientEmail: string, projectId: string) {
  return `client-shortlist:${clientEmail}:${projectId}`;
}

function starredStorageKey(clientEmail: string, projectId: string) {
  return `client-starred:${clientEmail}:${projectId}`;
}

/* ───────── Component ───────── */

export default function ClientProjectPage({
  clientEmail,
  companyName,
  project,
  allProjects,
  students,
}: ProjectPageProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<
    "all" | "starred" | "shortlisted"
  >("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [starredEmails, setStarredEmails] = useState<Set<string>>(new Set());
  const [shortlistedEmails, setShortlistedEmails] = useState<Set<string>>(new Set());
  const [expandedStudent, setExpandedStudent] = useState<StudentRow | null>(null);
  const [isShortlisting, setIsShortlisting] = useState(false);
  const [showShortlistConfirm, setShowShortlistConfirm] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(
        shortlistStorageKey(clientEmail, project.id)
      );
      if (!raw) {
        setShortlistedEmails(new Set());
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setShortlistedEmails(new Set(parsed.filter((v) => typeof v === "string")));
      } else {
        setShortlistedEmails(new Set());
      }
    } catch {
      setShortlistedEmails(new Set());
    }
  }, [clientEmail, project.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(
        starredStorageKey(clientEmail, project.id)
      );
      if (!raw) {
        setStarredEmails(new Set());
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setStarredEmails(new Set(parsed.filter((v) => typeof v === "string")));
      } else {
        setStarredEmails(new Set());
      }
    } catch {
      setStarredEmails(new Set());
    }
  }, [clientEmail, project.id]);

  const persistShortlistedEmails = (next: Set<string>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      shortlistStorageKey(clientEmail, project.id),
      JSON.stringify(Array.from(next))
    );
  };

  const persistStarredEmails = (next: Set<string>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      starredStorageKey(clientEmail, project.id),
      JSON.stringify(Array.from(next))
    );
  };

  /* Lock body scroll when modal is open */
  useEffect(() => {
    if (expandedStudent || showShortlistConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [expandedStudent, showShortlistConfirm]);

  useEffect(() => {
    void router.prefetch("/get-started/client/dashboard");
    void router.prefetch("/get-started/client/job-post-review");
    void router.prefetch(`/get-started/client/project/${project.id}/chat`);
  }, [router, project.id]);

  const projectName = project.title || "Project Name";
  const requiredSkillNames = getProjectRequiredSkills(project);
  const expandedCandidateSkills = expandedStudent
    ? getCandidateSkillNames(expandedStudent)
    : [];
  const expandedSkillMatch = expandedStudent
    ? getSkillMatch(expandedStudent, requiredSkillNames)
    : null;
  const expandedMatchedSkillSet = new Set(
    (expandedSkillMatch?.matchedSkills || []).map((skill) => normalizeSkillName(skill)),
  );

  /* Filter students by tab */
  const displayStudents =
    activeFilter === "starred"
      ? students.filter((s) => starredEmails.has(s.email))
      : activeFilter === "shortlisted"
      ? students.filter((s) => shortlistedEmails.has(s.email))
      : students;

  /* Filter sidebar projects by search */
  const sidebarProjects = allProjects.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.title || "").toLowerCase().includes(term) ||
      (p.category || "").toLowerCase().includes(term)
    );
  });

  const toggleStar = (email: string) => {
    setStarredEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      persistStarredEmails(next);
      return next;
    });
  };

  return (
    <>
      <Head>
        <title>{projectName} - Hustlr</title>
        <meta
          name="description"
          content={`Student recommendations for ${projectName} on Hustlr.`}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="min-h-screen bg-[#eaeaea] p-2 font-sans">
        <div className="flex min-h-[calc(100vh-1rem)] gap-2">
        {/* ────────── Sidebar ────────── */}
        <aside className="flex w-[220px] shrink-0 flex-col justify-between rounded-2xl border border-gray-300 bg-white px-5 py-6">
          <div>
            {/* Branding */}
            <div className="mb-6 flex items-end gap-1">
              <span className="font-serif text-[30px] font-bold leading-none tracking-[-0.03em] text-gray-900">
                hustlr
              </span>
              <span className="mb-[3px] text-[12px] font-medium text-gray-500">
                Client
              </span>
            </div>

            {/* ── Animated Search Bar ── */}
            <div className="relative mb-3 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setTimeout(() => searchInputRef.current?.focus(), 200);
                    } else {
                      setSearchTerm("");
                    }
                    return next;
                  });
                }}
                className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Search projects"
              >
                <Search className="h-4 w-4" />
              </button>

              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  width: searchOpen ? "calc(100% - 36px)" : "0px",
                  opacity: searchOpen ? 1 : 0,
                }}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search projects…"
                  onBlur={() => {
                    if (!searchTerm.trim()) {
                      setSearchOpen(false);
                    }
                  }}
                  className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[12px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#5FB3B3] focus:ring-1 focus:ring-[#5FB3B3]/30 transition-colors"
                />
              </div>
            </div>

            {/* Home link */}
            <button
              type="button"
              onClick={() => void router.push("/get-started/client/dashboard")}
              className="mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              <Home className="h-4 w-4 text-gray-400" />
              Home
            </button>

            {/* Projects */}
            <nav className="space-y-1">
              {sidebarProjects.slice(0, 6).map((post) => {
                const isActive = post.id === project.id;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() =>
                      void router.push(
                        `/get-started/client/project/${post.id}`
                      )
                    }
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                      isActive
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <GitBranch
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive ? "text-gray-300" : "text-gray-400"
                      }`}
                    />
                    <span className="truncate">
                      Project: {post.title || "Untitled"}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom links */}
          <div className="space-y-1 text-[13px]">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-medium text-gray-700 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Settings
            </button>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/client/auth/logout", { method: "POST" });
                void router.push("/get-started/client/verify");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-medium text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              Logout
            </button>
          </div>
        </aside>

        {/* ────────── Main Content ────────── */}
        <main className="flex-1 overflow-y-auto rounded-2xl bg-[#eaeaea] px-8 py-6">
          {/* Top row — breadcrumb + View Job Posting */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span
                className="cursor-pointer hover:text-gray-700 transition-colors"
                onClick={() =>
                  void router.push("/get-started/client/dashboard")
                }
              >
                Home
              </span>
              <span className="mx-1 text-gray-400">/</span>
              Projects
              <span className="mx-1 text-gray-400">/</span>
              <span className="font-medium text-gray-700">{projectName}</span>
              <span className="mx-1.5 text-gray-300">|</span>
            </p>

            <button
              type="button"
              onClick={() =>
                void router.push(`/get-started/client/job-post-review?id=${project.id}`)
              }
              className="rounded-xl bg-[#57B1B2] px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#4a9a9b]"
            >
              View Your Job Posting
            </button>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                void router.push(`/get-started/client/project/${project.id}/chat`)
              }
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-gray-900"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
          </div>

          {/* Heading */}
          <h1 className="mt-4 text-[22px] font-bold text-gray-900">
            Your Student Recommendations
          </h1>

          {/* Filter glider */}
          {(() => {
            const FILTERS = [
              { key: "all" as const, label: "Show All" },
              { key: "starred" as const, label: "Starred" },
              { key: "shortlisted" as const, label: "Shortlisted" },
            ];
            const activeIdx = FILTERS.findIndex(
              (f) => f.key === activeFilter
            );

            return (
              <div className="relative mt-4 grid grid-cols-3 rounded-full bg-[#97D9DA] p-[3px]" style={{ width: "320px" }}>
                {/* Sliding indicator */}
                <div
                  className="absolute top-[3px] bottom-[3px] rounded-full bg-[#57B1B2] transition-all duration-300 ease-in-out"
                  style={{
                    width: `calc(${100 / FILTERS.length}% - 2px)`,
                    left: `calc(${(activeIdx * 100) / FILTERS.length}% + 3px)`,
                  }}
                />

                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`relative z-10 flex items-center justify-center rounded-full py-1.5 text-[12px] font-semibold transition-colors duration-300 ${
                      activeFilter === filter.key
                        ? "text-white"
                        : "text-[#2a7a7b]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            );
          })()}

          <p className="mt-3 text-[13px] text-gray-500">
            Showing {displayStudents.length} profiles
          </p>

          {/* ── Student Cards Grid ── */}
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayStudents.map((student, idx) => {
              const isTopThree = idx < 3;
              const rank = idx + 1;
              const isStarred = starredEmails.has(student.email);
              const isShortlisted = shortlistedEmails.has(student.email);
              const skillsList = Array.isArray(student.skills)
                ? student.skills.slice(0, 3)
                : [];
              const hasProjects =
                Array.isArray(student.projects) && student.projects.length > 0;
              const skillMatch = getSkillMatch(student, requiredSkillNames);
              const similarProjectExperience = hasSimilarProjectExperience(
                student,
                requiredSkillNames,
                75,
              );

              return (
                <article
                  key={student.email}
                  className={`relative flex flex-col justify-between rounded-xl bg-white p-5 ${CARD_SHADOW} overflow-visible border-2 transition-all ${isShortlisted ? 'border-emerald-500/30' : 'border-transparent'}`}
                >
                  {/* Shortlisted Indicator */}
                  {isShortlisted && (
                    <div className="absolute top-0 right-0 -mr-1 -mt-1 rounded-bl-xl rounded-tr-xl bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                      SHORTLISTED
                    </div>
                  )}
                  {/* Rank bookmark — top 3 only */}
                  {isTopThree && (
                    <div className="absolute -left-5 -top-7 flex flex-col items-center">
                      <div className="relative">
                        <Bookmark className="h-14 w-10 fill-gray-900 text-gray-900" />
                        <span className="absolute inset-0 flex items-center justify-center text-[16px] font-bold text-white pb-2">
                          {rank}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div>
                    <div className="flex items-start gap-2">
                      {/* Star — clickable */}
                      <button
                        type="button"
                        onClick={() => toggleStar(student.email)}
                        className="mt-0.5 shrink-0"
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            isStarred
                              ? "fill-[#d4a017] text-[#d4a017]"
                              : "text-gray-300 hover:text-gray-400"
                          }`}
                        />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-[16px] font-bold leading-tight text-gray-900">
                            {student.name || "Unknown Student"}
                          </h3>
                          <span className="text-[13px] font-semibold text-[#5FB3B3]">
                            {formatScore(student.final_score)} score
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] font-semibold text-gray-700">
                          {student.college || "Unknown College"}
                          {student.year ? `, Year ${student.year} ` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Skill pills */}
                    {skillsList.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {skillsList.map((s, sIdx) => {
                          const skillName =
                            typeof s === "string"
                              ? s
                              : s?.skill || "Skill";
                          return (
                            <span
                              key={sIdx}
                              className="rounded px-2.5 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor: SKILL_COLOR.bg,
                                color: SKILL_COLOR.text,
                              }}
                            >
                              {skillName}
                            </span>
                          );
                        })}
                        {Array.isArray(student.skills) &&
                          student.skills.length > 3 && (
                            <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              +{student.skills.length - 3} more
                            </span>
                          )}
                      </div>
                    )}

                    {/* Summary */}
                    <p className="mt-3 text-[12px] leading-relaxed text-gray-600">
                      {hasProjects
                        ? `Built ${student.projects!.length}+ project${student.projects!.length > 1 ? "s" : ""} including ${student.projects![0].title}`
                        : student.category
                        ? `${student.category} student`
                        : "Student applicant"}
                    </p>

                    {/* Stats */}
                    <div className="mt-4 space-y-1 text-[12px] text-gray-700">
                      <p>
                        <span className="font-bold">Skill Match:</span>{" "}
                        {skillMatch.totalCount > 0
                          ? `${skillMatch.matchedCount}/${skillMatch.totalCount} matched`
                          : "No required skills listed"}
                      </p>
                      <p>
                        <span className="font-bold">
                          Similar Project Experience:
                        </span>{" "}
                        <span
                          className={
                            similarProjectExperience ? "text-[#5FB3B3]" : "text-gray-500"
                          }
                        >
                          {similarProjectExperience ? "Yes" : "No"}
                        </span>
                      </p>
                      <p>
                        <span className="font-bold">Reliability:</span>{" "}
                        <span
                          className={
                            student.final_score != null &&
                            student.final_score >= 70
                              ? "text-[#5FB3B3]"
                              : student.final_score != null &&
                                student.final_score >= 40
                              ? "text-[#d4a017]"
                              : "text-gray-500"
                          }
                        >
                          {student.final_score != null &&
                          student.final_score >= 70
                            ? "High"
                            : student.final_score != null &&
                              student.final_score >= 40
                            ? "Medium"
                            : "Low"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Expand Profile button */}
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setExpandedStudent(student)}
                      className="rounded-lg bg-gray-700 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-gray-600"
                    >
                      Expand Profile
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {displayStudents.length === 0 && (
            <div className="mt-10 text-center">
              <p className="text-[14px] text-gray-400">
                {activeFilter === "starred"
                  ? "No starred students yet. Click the star icon to save profiles."
                  : "No student profiles available at this time."}
              </p>
            </div>
          )}
        </main>
        </div>
      </div>

      {/* ────────── Expanded Profile Modal ────────── */}
      {expandedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setExpandedStudent(null)}
        >
          <div
            className="relative mx-4 max-h-[90vh] w-full max-w-[820px] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setExpandedStudent(null)}
              className="absolute right-5 top-5 flex items-center gap-1 text-[13px] font-medium text-gray-600 hover:text-gray-1000 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* ── Header ── */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[28px] font-bold text-gray-900">
                    {expandedStudent.name}
                  </h2>
                  <span className="rounded-full bg-[#C7DA8E] px-4 py-1 text-[13px] font-bold text-gray-900">
                    {formatScore(expandedStudent.final_score)} Score
                  </span>
                  {expandedStudent.github && (
                    <a
                      href={expandedStudent.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="GitHub"
                    >
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                  )}
                  {expandedStudent.linkedin && (
                    <a
                      href={expandedStudent.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="LinkedIn"
                    >
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#0077B5]" fill="currentColor"><path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.58a2.06 2.06 0 11.01-4.13 2.06 2.06 0 01-.01 4.13zM20.45 20.45h-3.56v-5.61c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.15 1.46-2.15 2.97v5.7h-3.56V9h3.42v1.56h.05c.48-.9 1.63-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28h-.02z"/></svg>
                    </a>
                  )}
                </div>

                {/* College + Degree */}
                <div className="mt-3 space-y-1">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
                    <MapPin className="h-4 w-4 text-black" />
                    {expandedStudent.college || "Unknown College"}
                  </p>
                  <p className="flex items-center gap-2 text-[14px] font-medium text-gray-800">
                    <GraduationCap className="h-4 w-4 text-black" />
                    {expandedStudent.degree || expandedStudent.category || "Student"}
                    {expandedStudent.branch ? ` - ${expandedStudent.branch}` : ""}
                    {expandedStudent.year ? `, Year ${expandedStudent.year}` : ""}
                  </p>
                </div>

                {/* All skills summary */}
                {expandedCandidateSkills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {expandedCandidateSkills.map((skillName, i) => {
                      const isMatched = expandedMatchedSkillSet.has(normalizeSkillName(skillName));
                      return (
                        <span
                          key={i}
                          className="rounded-full px-3 py-0.5 text-[11px] font-bold text-[#3d8a8c]"
                          style={{ backgroundColor: isMatched ? "#C7DA8E" : "#DFF0F0" }}
                          title={isMatched ? "Matches project requirement" : "Candidate skill"}
                        >
                          {skillName}
                        </span>
                      );
                    })}
                  </div>
                )}

                {expandedSkillMatch && expandedSkillMatch.totalCount > 0 && (
                  <p className="mt-3 text-[13px] font-semibold text-gray-700">
                    Skill Match: {expandedSkillMatch.matchedCount}/{expandedSkillMatch.totalCount} matched
                  </p>
                )}
              </div>
            </div>

            {/* ── Experience Section ── */}
            {Array.isArray(expandedStudent.experiences) && expandedStudent.experiences.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[18px] font-bold text-gray-900">Experience</h3>
                <div className="mt-3 space-y-3">
                  {expandedStudent.experiences.map((exp, i) => {
                    const duration = exp.startMonth && exp.startYear && exp.endMonth && exp.endYear
                      ? `${exp.startMonth} ${exp.startYear} - ${exp.endMonth} ${exp.endYear}`
                      : "";
                    return (
                      <div key={i} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-bold text-gray-900">{exp.title}</span>
                              <span className="rounded-full bg-[#DFF0F0] px-2.5 py-0.5 text-[10px] font-bold text-[#3d8a8c]">
                                {exp.employmentType}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[13px] font-medium text-gray-600">
                              {exp.company}
                            </p>
                          </div>
                          {duration && (
                            <span className="shrink-0 text-[12px] text-gray-500">{duration}</span>
                          )}
                        </div>
                        {Array.isArray(exp.skills) && exp.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {exp.skills.map((sk, si) => (
                              <span key={si} className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-gray-800" style={{ backgroundColor: "#C7DA8E" }}>
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                        {exp.description && (
                          <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{exp.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Projects Section ── */}
            {Array.isArray(expandedStudent.projects) && expandedStudent.projects.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[18px] font-bold text-gray-900">Projects</h3>
                <div className="mt-3 space-y-3">
                  {expandedStudent.projects.map((proj, i) => {
                    const date = proj.startMonth && proj.startYear
                      ? `${proj.startMonth} ${proj.startYear}${proj.endMonth && proj.endYear ? ` - ${proj.endMonth} ${proj.endYear}` : ""}`
                      : "";
                    return (
                      <div key={i} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[14px] font-bold text-gray-900">{proj.title}</span>
                            {proj.type && (
                              <span className="rounded-full bg-[#DFF0F0] px-2.5 py-0.5 text-[10px] font-bold text-[#3d8a8c]">
                                {proj.type === "Personal" ? "Personal Project" : proj.type}
                              </span>
                            )}
                            {proj.members && (
                              <span className="rounded-full bg-[#E8E8D8] px-2.5 py-0.5 text-[10px] font-bold text-gray-600">
                                {proj.members}
                              </span>
                            )}
                          </div>
                          {date && (
                            <span className="shrink-0 text-[12px] text-gray-500">{date}</span>
                          )}
                        </div>
                        {Array.isArray(proj.techStack) && proj.techStack.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {proj.techStack.map((t, ti) => (
                              <span key={ti} className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-gray-800" style={{ backgroundColor: "#C7DA8E" }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {proj.description && (
                          <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{proj.description}</p>
                        )}
                        {proj.githubLink && (
                          <a
                            href={proj.githubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Repository"
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Hackathons Section ── */}
            {Array.isArray(expandedStudent.hackathons) && expandedStudent.hackathons.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[18px] font-bold text-gray-900">Hackathons</h3>
                <div className="mt-3 space-y-3">
                  {expandedStudent.hackathons.map((hack, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-bold text-gray-900">{hack.name}</span>
                        <span className="rounded-full bg-[#DFF0F0] px-2.5 py-0.5 text-[10px] font-bold text-[#3d8a8c]">
                          {hack.type}
                        </span>
                        <span className="rounded-full bg-[#E8E8D8] px-2.5 py-0.5 text-[10px] font-bold text-gray-600">
                          {hack.placement}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-medium text-gray-600">
                        {hack.projectName} · {hack.role} · Team of {hack.teamSize}
                      </p>
                      {Array.isArray(hack.techStack) && hack.techStack.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {hack.techStack.map((t, ti) => (
                            <span key={ti} className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-gray-800" style={{ backgroundColor: "#C7DA8E" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {hack.description && (
                        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{hack.description}</p>
                      )}
                      {hack.githubLink && (
                        <a 
                          href={hack.githubLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title="View Repository"
                        >
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Awards Section ── */}
            {Array.isArray(expandedStudent.awards) && expandedStudent.awards.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[18px] font-bold text-gray-900">Awards</h3>
                <div className="mt-3 space-y-2">
                  {expandedStudent.awards.map((aw, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-gray-900">{aw.title}</span>
                        <span className="rounded-full bg-[#DFF0F0] px-2.5 py-0.5 text-[10px] font-bold text-[#3d8a8c]">
                          {aw.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-gray-600">
                        {aw.organization} · {aw.month} {aw.year}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              {/* ── Shortlist Button ── */}
              <button
                type="button"
                onClick={() => {
                  if (shortlistedEmails.has(expandedStudent!.email)) {
                    toast.info(`${expandedStudent?.name} is already shortlisted.`);
                  } else {
                    setShowShortlistConfirm(true);
                  }
                }}
                className={`rounded-xl px-8 py-3 text-[14px] font-bold text-white shadow-md transition-colors ${shortlistedEmails.has(expandedStudent?.email || '') ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-900 hover:bg-gray-800'}`}
              >
                {shortlistedEmails.has(expandedStudent?.email || '') ? 'Shortlisted ✓' : 'Shortlist Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortlistConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="mx-4 w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-2xl text-center">
            
            <h3 className="text-2xl font-bold text-gray-900">Great Choice!</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              <strong>{expandedStudent?.name}</strong>'s profile will appear in the chat window where you can talk to the him/her before finalizing whether you want to work with him/her.  
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                disabled={isShortlisting}
                onClick={async () => {
                  setIsShortlisting(true);
                  // Simulate exciting "thinking" step
                  await new Promise(r => setTimeout(r, 1200));
                  
                  // Add to shortlistedEmails
                  if (expandedStudent) {
                    setShortlistedEmails((prev) => {
                      const next = new Set(prev).add(expandedStudent.email);
                      persistShortlistedEmails(next);
                      return next;
                    });
                  }
                  
                  setIsShortlisting(false);
                  setShowShortlistConfirm(false);
                  setExpandedStudent(null);
                  toast.success(`${expandedStudent?.name} has been added to your shortlist.`);
                }}
                className={`flex items-center justify-center rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all ${isShortlisting ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98] hover:bg-black'}`}
              >
                {isShortlisting ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Shortlisting…
                  </>
                ) : (
                  "Shortlist Now"
                )}
              </button>
              
              <button
                type="button"
                disabled={isShortlisting}
                onClick={() => setShowShortlistConfirm(false)}
                className="rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                No, go back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
