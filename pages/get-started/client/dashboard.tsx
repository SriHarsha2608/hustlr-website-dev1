import Head from "next/head";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import {
  Star,
  Settings,
  LogOut,
  GitBranch,
  Plus,
  ChevronRight,
  Home,
  Search,
} from "lucide-react";
import { getClientEmailFromSSP } from "@/src/lib/clientAuthUtils";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { GetServerSideProps } from "next";

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

type DashboardProps = {
  clientEmail: string;
  companyName: string;
  jobPosts: JobPost[];
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

  const { data: posts } = await supabaseAdmin
    .from("job_posts")
    .select(
      "id, title, category, description, timeline_estimate, budget, skills, status, created_at"
    )
    .eq("client_email", clientEmail)
    .order("created_at", { ascending: false });

  return {
    props: {
      clientEmail,
      companyName: profile.company_name || "Your Company",
      jobPosts: posts || [],
    },
  };
};

/* ───────── Helpers ───────── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "published":
      return {
        label: "Matching",
        bg: "bg-[#b9cc84]",
        text: "text-white",
      };
    case "closed":
      return {
        label: "Completed",
        bg: "bg-gray-300",
        text: "text-gray-700",
      };
    default:
      return {
        label: "Draft",
        bg: "bg-[#c8c8a0]",
        text: "text-white",
      };
  }
}

/* ── Shadow — matches admin dashboard ── */
const CARD_SHADOW = "shadow-[-2px_4px_9px_rgba(0,0,0,0.40)]";

/* ───────── Component ───────── */

export default function ClientDashboardPage({
  clientEmail,
  companyName,
  jobPosts,
}: DashboardProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeProjects = jobPosts.filter(
    (p) => p.status === "published" || p.status === "closed"
  );
  const draftProjects = jobPosts.filter((p) => p.status === "draft");

  /* Filter sidebar projects by search */
  const sidebarProjects = jobPosts.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.title || "").toLowerCase().includes(term) ||
      (p.category || "").toLowerCase().includes(term)
    );
  });

  return (
    <>
      <Head>
        <title>Client Dashboard - Hustlr</title>
        <meta
          name="description"
          content="Manage your projects and discover top student talent on Hustlr."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="min-h-screen min-w-0 bg-[#eaeaea] p-2 font-sans">
        <div className="flex min-h-[calc(100vh-1rem)] min-w-0 gap-2">
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
              className="mb-3 flex w-full items-center gap-2.5 rounded-lg bg-gray-900 px-3 py-2.5 text-left text-[13px] font-semibold text-white"
            >
              <Home className="h-4 w-4 text-gray-300" />
              Home
            </button>

            {/* Project list */}
            <nav className="space-y-1">
              {sidebarProjects.slice(0, 8).map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() =>
                    void router.push(
                      `/get-started/client/project/${post.id}`
                    )
                  }
                  className="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                    Project: {post.title || "Untitled"}
                  </span>
                </button>
              ))}
              {jobPosts.length === 0 && (
                <p className="px-3 text-[11px] text-gray-400">
                  No projects yet
                </p>
              )}
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
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-2xl bg-[#eaeaea] px-8 py-6">
          {/* Breadcrumb + Post button */}
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-gray-500">Home</p>
            <button
              type="button"
              onClick={() =>
                void router.push("/get-started/client/job-post?new=1")
              }
              className={`flex items-center gap-1.5 rounded-full bg-gray-900 px-6 py-2.5 text-[13px] font-semibold text-white ${CARD_SHADOW} transition-all hover:bg-gray-800`}
            >
              <Plus className="h-4 w-4" />
              Post A New Project
            </button>
          </div>

          {/* Title */}
          <h1 className="mt-2 text-[22px] font-bold text-gray-900">
            Client Dashboard
          </h1>

          {/* Welcome — TT Commons / DM Sans fallback */}
          <h2
            className="mt-5 max-w-full text-[34px] font-medium italic tracking-tight text-[#5FB3B3] break-words [overflow-wrap:anywhere]"
            style={{ fontFamily: "'TT Commons', 'DM Sans', sans-serif" }}
          >
            Welcome back, {companyName}
          </h2>
          <p className="mt-1 text-[14px] text-gray-600">
            Here&apos;s what&apos;s happening with your projects
          </p>

          {/* ── Stats Row ── */}
          <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Projects */}
            <article
              className={`rounded-xl border border-gray-200 bg-white p-5 ${CARD_SHADOW}`}
            >
              <p className="text-[14px] font-semibold text-[#5FB3B3]">
                Total Projects
              </p>
              <p className="mt-3 text-[48px] font-bold leading-none text-gray-900">
                {jobPosts.length}
              </p>
            </article>

            {/* Ratings + Reviews */}
            <article
              className={`rounded-xl border border-gray-200 bg-white p-5 ${CARD_SHADOW}`}
            >
              <p className="text-[14px] font-semibold text-[#5FB3B3]">
                Ratings
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[40px] font-bold leading-none text-gray-900">
                  0
                </span>
                <Star className="h-6 w-6 fill-[#d4a017] text-[#d4a017]" />
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-[#5FB3B3]">
                    Reviews
                  </p>
                  <button
                    type="button"
                    className="rounded-full bg-gray-200 px-3 py-0.5 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-300"
                  >
                    View
                  </button>
                </div>
                <p className="mt-1 text-[40px] font-bold leading-none text-gray-900">
                  0
                </p>
              </div>
            </article>

            {/* Manage Payments — spans 2 cols on large */}
            <article
              className={`rounded-xl border border-gray-200 bg-white p-5 ${CARD_SHADOW} sm:col-span-2`}
            >
              <p className="text-[14px] font-semibold text-[#5FB3B3]">
                Manage Payments
              </p>
              <div className="mt-4 space-y-0">
                {["View Transactions", "Deposit Funds", "Payment Setup"].map(
                  (label) => (
                    <button
                      key={label}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-gray-100 py-3 text-[14px] font-medium text-gray-800 transition-colors last:border-0 hover:text-[#5FB3B3]"
                    >
                      {label}
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </button>
                  )
                )}
              </div>
            </article>
          </div>

          {/* ── Active Projects ── */}
          <h3 className="mt-10 text-[18px] font-bold text-gray-900">
            Active Projects
          </h3>

          {activeProjects.length === 0 ? (
            <p className="mt-3 text-[13px] text-gray-400">
              No active projects yet. Post your first project to get started.
            </p>
          ) : (
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map((post) => {
                const badge = statusBadge(post.status);
                return (
                  <article
                    key={post.id}
                    onClick={() =>
                      void router.push(
                        `/get-started/client/project/${post.id}`
                      )
                    }
                    className={`group min-w-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white p-5 ${CARD_SHADOW} transition-shadow hover:shadow-[-3px_6px_14px_rgba(0,0,0,0.45)]`}
                  >
                    {/* Status badge */}
                    <div className="flex justify-end">
                      <span
                        className={`shrink-0 rounded-full px-3 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="mt-3 max-w-full text-[15px] font-bold leading-snug text-gray-900 break-words [overflow-wrap:anywhere]">
                      {post.title || "Untitled Project"}
                    </h4>

                    {/* Date */}
                    <p className="mt-2 text-[12px] text-gray-500">
                      {formatDate(post.created_at)}
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          {/* ── Drafts ── */}
          <h3 className="mt-10 text-[18px] font-bold text-gray-900">Drafts</h3>

          {draftProjects.length === 0 ? (
            <p className="mt-3 text-[13px] text-gray-400">
              No drafts at the moment.
            </p>
          ) : (
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {draftProjects.map((post) => (
                <article
                  key={post.id}
                  className={`group min-w-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white p-5 ${CARD_SHADOW} transition-shadow hover:shadow-[-3px_6px_14px_rgba(0,0,0,0.45)]`}
                  onClick={() =>
                    void router.push("/get-started/client/job-post?resume=1")
                  }
                >
                  {/* Draft badge */}
                  <div className="flex justify-end">
                    <span className="shrink-0 rounded-full bg-[#c8c8a0] px-3 py-0.5 text-[10px] font-bold text-white">
                      Draft
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="mt-3 max-w-full text-[15px] font-bold leading-snug text-gray-900 break-words [overflow-wrap:anywhere]">
                    {post.title || "-"}
                  </h4>

                  {/* Date */}
                  <p className="mt-2 text-[12px] text-gray-500">
                    {formatDate(post.created_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </main>
        </div>
      </div>
    </>
  );
}
