import Head from "next/head";
import { GetServerSideProps } from "next";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  GitBranch,
  MessageCircle,
  LogOut,
  Home,
  Settings,
  Search,
  Users,
} from "lucide-react";
import { getClientEmailFromSSP } from "@/src/lib/clientAuthUtils";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

type JobPost = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

type StudentRow = {
  name: string;
  email: string;
  college: string;
};

type ChatPageProps = {
  clientEmail: string;
  companyName: string;
  project: JobPost;
  students: StudentRow[];
};

function shortlistStorageKey(clientEmail: string, projectId: string) {
  return `client-shortlist:${clientEmail}:${projectId}`;
}

function formatFirstChatted(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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
    .select("id, title, category, created_at")
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

  const { data: studentsRaw } = await supabaseAdmin
    .from("vettingapplications")
    .select("name, email, college")
    .not("name", "is", null)
    .not("email", "is", null);

  return {
    props: {
      clientEmail,
      companyName: profile.company_name || "Your Company",
      project,
      students: (studentsRaw || []) as StudentRow[],
    },
  };
};

export default function ClientProjectChatPage({
  clientEmail,
  project,
  students,
}: ChatPageProps) {
  const router = useRouter();
  const [shortlistedEmails, setShortlistedEmails] = useState<Set<string>>(new Set());
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [messageDraft, setMessageDraft] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(
        shortlistStorageKey(clientEmail, project.id)
      );
      if (!raw) {
        setShortlistedEmails(new Set());
        setSelectedEmail("");
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setShortlistedEmails(new Set());
        setSelectedEmail("");
        return;
      }
      const shortlist = new Set(parsed.filter((v) => typeof v === "string"));
      setShortlistedEmails(shortlist);
      if (shortlist.size > 0) {
        setSelectedEmail(Array.from(shortlist)[0]);
      } else {
        setSelectedEmail("");
      }
    } catch {
      setShortlistedEmails(new Set());
      setSelectedEmail("");
    }
  }, [clientEmail, project.id]);

  useEffect(() => {
    void router.prefetch("/get-started/client/dashboard");
    void router.prefetch("/get-started/client/job-post-review");
    void router.prefetch(`/get-started/client/project/${project.id}`);
  }, [router, project.id]);

  const shortlistedStudents = useMemo(
    () => students.filter((s) => shortlistedEmails.has(s.email)),
    [students, shortlistedEmails]
  );
  const filteredShortlistedStudents = useMemo(() => {
    if (!searchTerm.trim()) return shortlistedStudents;
    const term = searchTerm.toLowerCase();
    return shortlistedStudents.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(term) ||
        (s.college || "").toLowerCase().includes(term) ||
        (s.email || "").toLowerCase().includes(term)
    );
  }, [searchTerm, shortlistedStudents]);

  const selectedStudent =
    filteredShortlistedStudents.find((s) => s.email === selectedEmail) ||
    filteredShortlistedStudents[0];

  const projectName = project.title || "Project Name";

  return (
    <>
      <Head>
        <title>Chat with Students - Hustlr</title>
        <meta
          name="description"
          content={`Chat with shortlisted students for ${projectName}.`}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="min-h-screen bg-[#e9e9e9] p-2 font-sans">
        <div className="flex min-h-[calc(100vh-1rem)] gap-2">
          <aside className="flex w-[220px] shrink-0 flex-col justify-between rounded-2xl border border-gray-300 bg-white px-5 py-6">
            <div>
              <div className="mb-6 flex items-end gap-1">
                <span className="font-serif text-[30px] font-bold leading-none tracking-[-0.03em] text-gray-900">
                  hustlr
                </span>
                <span className="mb-[3px] text-[12px] font-medium text-gray-500">
                  Client
                </span>
              </div>

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
                  aria-label="Search chats"
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
                    placeholder="Search chats..."
                    onBlur={() => {
                      if (!searchTerm.trim()) setSearchOpen(false);
                    }}
                    className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-[12px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#5FB3B3] focus:ring-1 focus:ring-[#5FB3B3]/30 transition-colors"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void router.push("/get-started/client/dashboard")}
                className="mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100"
              >
                <Home className="h-4 w-4 text-gray-400" />
                Home
              </button>

              <div className="mb-3 flex w-full items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-left text-[12px] font-semibold text-white">
                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  Project:{" "}
                  {projectName.length > 12
                    ? `${projectName.slice(0, 12)}...`
                    : projectName}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-[13px]">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[#17171b] hover:bg-gray-100"
              >
                <Settings className="h-5 w-5" />
                Settings
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/client/auth/logout", { method: "POST" });
                  void router.push("/get-started/client/verify");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[#17171b] hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto rounded-2xl bg-[#eaeaea] px-8 py-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                <span
                  className="cursor-pointer hover:text-gray-700 transition-colors"
                  onClick={() => void router.push("/get-started/client/dashboard")}
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
                onClick={() => void router.push(`/get-started/client/job-post-review?id=${project.id}`)}
                className="rounded-2xl bg-[#57b1b2] px-8 py-3 text-[13px] font-semibold text-white shadow"
              >
                View Your Job Posting
              </button>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void router.push(`/get-started/client/project/${project.id}`)}
                className="flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-gray-900"
              >
                <Users className="h-4 w-4" />
                Applicants
              </button>
            </div>

            <h1 className="mt-4 text-[30px] font-bold text-black">Chat with Students</h1>

            <section className="mt-3 flex h-[calc(100vh-210px)] rounded-2xl bg-[#f4f4f4]">
              <div className="h-full w-[320px] shrink-0 border-r border-gray-300 bg-[#efefef]">
                <div className="h-full overflow-y-auto">
                {filteredShortlistedStudents.length === 0 ? (
                  <div className="px-6 py-7 text-[16px] text-gray-500">
                    {searchTerm.trim()
                      ? "No chats match your search."
                      : "No shortlisted students yet."}
                  </div>
                ) : (
                  filteredShortlistedStudents.map((student, index) => {
                    const active = selectedStudent?.email === student.email;
                    const statusColor = index % 3 === 0 ? "bg-[#9db95a]" : index % 3 === 1 ? "bg-[#d65252]" : "bg-[#b4b4b4]";
                    const dayLabel = index % 3 === 0 ? "Sun" : "Fri";
                    return (
                      <button
                        key={student.email}
                        type="button"
                        onClick={() => setSelectedEmail(student.email)}
                        className={`w-full border-b border-gray-300 px-6 py-4 text-left transition-colors ${
                          active ? "bg-[#d0d0d0]" : "hover:bg-[#e0e0e0]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-black">
                              {student.name}, <span className="font-normal">{student.college || "College"}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                            <span className="text-[11px] text-gray-600">{dayLabel}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
                </div>
              </div>

              <div className="relative flex flex-1 flex-col px-8 py-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => void router.push(`/get-started/client/project/${project.id}`)}
                    className="rounded-2xl bg-[#8bd2d2] px-7 py-2.5 text-[13px] font-semibold text-white shadow"
                  >
                    View Student Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => window.alert("Project confirmed.")}
                    className="rounded-2xl bg-[#a7bf5e] px-7 py-2.5 text-[13px] font-semibold text-white shadow"
                  >
                    Confirm Project
                  </button>
                </div>

                <div className="mt-10 text-center">
                  <h2 className="text-[44px] font-bold leading-tight text-black">
                    {selectedStudent?.name || "No student selected"}
                  </h2>
                  <p className="text-[36px] text-[#202020]">
                    {selectedStudent?.college || ""}
                  </p>
                  {selectedStudent && (
                    <p className="mt-3 text-[18px] text-[#232323]">
                      First chatted: {formatFirstChatted(new Date())}
                    </p>
                  )}
                </div>

                <div className="mt-auto">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-400 bg-white px-4 py-2.5">
                    <MessageCircle className="h-5 w-5 text-gray-500" />
                    <input
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      placeholder="Type a message..."
                      className="h-8 w-full bg-transparent text-[15px] outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
