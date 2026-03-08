import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Award } from "lucide-react";

type FileMeta = {
  name: string;
  size: number;
  url: string;
};

const fileFields = ["resume", "transcript", "studentId"];

/** Fields already shown by the ScoreSection / ScoreBreakdown components */
const scoringFields = ["scores", "final_score", "scored_at", "scoring_cache"];

/** Fields to hide from the student's application review view */
const hiddenFields = [
  "location",
  "createdAt",
  "status",
  "currentStage",
  "selectedProjectSanityId",
  "videoLink",
  "otherLinks",
  "projectDeadline",
];

/** Pretty labels for known field keys */
const fieldLabels: Record<string, string> = {
  id: "ID",
  category: "Category",
  name: "Name",
  email: "Email",
  college: "College",
  dob: "Date of Birth",
  cgpa: "CGPA",
  year: "Year",
  linkedin: "LinkedIn",
  github: "GitHub",
  location: "Location",
  resume: "Resume",
  transcript: "Transcript",
  studentId: "Student ID",
  isComplete: "Complete",
  createdAt: "Created At",
  status: "Status",
  currentStage: "Current Stage",
  selectedProjectSanityId: "Selected Project",
  videoLink: "Video Link",
  otherLinks: "Other Links",
  projectDeadline: "Project Deadline",
  phone: "Phone",
  collegeEmail: "College Email",
  degree: "Degree",
  branch: "Branch",
  hasPublishedResearch: "Published Research?",
  researchPapers: "Research Papers",
  codeforcesRating: "Codeforces Rating",
  codeforcesUserId: "Codeforces ID",
  codechefRating: "CodeChef Rating",
  codechefUserId: "CodeChef ID",
  hasQualifiedCpCompetitions: "CP Competitions?",
  cpCompetitions: "CP Competitions",
  experiences: "Experiences",
  hackathons: "Hackathons",
  openSource: "Open Source",
  skills: "Skills",
  awards: "Awards",
  projects: "Projects",
};

function formatLabel(key: string): string {
  return fieldLabels[key] || key;
}

/** GitHub SVG icon — matches the original form cards */
function GithubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/** Render a link if the value looks like a URL */
function MaybeLink({ value }: { value: string }) {
  if (/^https?:\/\//i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-black underline break-all">
        {value}
      </a>
    );
  }
  return <>{value}</>;
}

/** Render a skill badge — matches the original vetting form pills */
function SkillBadge({ skill, proficiency }: { skill: string; proficiency: string }) {
  return (
    <span className="inline-block bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium mr-1 mb-1">
      {skill} · {proficiency}
    </span>
  );
}

/** Card for a hackathon entry — matches HackathonInput card exactly */
function HackathonCard({ h, idx }: { h: Record<string, any>; idx: number }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Row 1: Name + Type + Placement */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <h3 className="font-semibold text-gray-900">{h.name || "Untitled"}</h3>
        {h.type && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#a1d7d7" }}>{h.type}</span>
        )}
        {h.placement && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f2d884", color: "#5a4b1a" }}>{h.placement}</span>
        )}
      </div>
      {/* Row 2: Project name + Role + Team */}
      {(h.projectName || h.role || h.teamSize) && (
        <div className="mb-2">
          <p className="text-sm text-gray-800">
            {h.projectName && <span className="font-medium">{h.projectName}</span>}
            {(h.role || h.teamSize) && (
              <span className="text-gray-500"> — {h.role}{h.teamSize ? ` • Team of ${h.teamSize}` : ""}</span>
            )}
          </p>
        </div>
      )}
      {/* Row 3: Tech Stack */}
      {h.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {h.techStack.map((t: string, i: number) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs text-gray-800" style={{ backgroundColor: "#deecb2" }}>{t}</span>
          ))}
        </div>
      )}
      {/* Row 4: Description */}
      {h.description && (
        <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">{h.description}</p>
      )}
      {/* Row 5: GitHub */}
      {h.githubLink && (
        <a href={h.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 hover:underline flex items-center gap-1">
          <GithubIcon /> View on GitHub
        </a>
      )}
    </div>
  );
}

/** Card for a project entry — matches ProjectsInput card exactly */
function ProjectCard({ p, idx }: { p: Record<string, any>; idx: number }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Row 1: Title + Type + Members */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h3 className="font-semibold text-gray-900">{p.title || "Untitled"}</h3>
        {p.type && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#a1d7d7" }}>{p.type}</span>
        )}
        {p.members && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#a1d7d7" }}>{p.members}</span>
        )}
      </div>
      {/* Row 2: Tech Stack */}
      {p.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {p.techStack.map((t: string, i: number) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs text-gray-800" style={{ backgroundColor: "#deecb2" }}>{t}</span>
          ))}
        </div>
      )}
      {/* Row 3: Description */}
      {p.description && (
        <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">{p.description}</p>
      )}
      {/* Row 4: Timing */}
      {(p.startMonth || p.startYear) && (
        <p className="text-xs text-gray-500 mb-2">
          {p.startMonth} {p.startYear}{(p.endMonth || p.endYear) ? ` - ${p.endMonth} ${p.endYear}` : ""}
        </p>
      )}
      {/* Row 5: GitHub */}
      {p.githubLink && (
        <a href={p.githubLink} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 hover:underline flex items-center gap-1">
          <GithubIcon /> View on GitHub
        </a>
      )}
    </div>
  );
}

/** Card for an experience entry — matches ExperienceInput card exactly */
function ExperienceCard({ e, idx }: { e: Record<string, any>; idx: number }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Row 1: Title + Employment Type */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h3 className="font-semibold text-gray-900">{e.title || e.company || e.organization || "Untitled"}</h3>
        {e.employmentType && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#a1d7d7" }}>{e.employmentType}</span>
        )}
        {/* fallback for older data shape with .type */}
        {!e.employmentType && e.type && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#a1d7d7" }}>{e.type}</span>
        )}
      </div>
      {/* Row 2: Company + Duration */}
      <div className="mb-3">
        {(e.company || e.organization) && (
          <p className="text-sm text-gray-700">
            <span className="font-medium">{e.company || e.organization}</span>
          </p>
        )}
        {(e.startMonth || e.startYear) && (
          <p className="text-xs text-gray-500">
            {e.startMonth} {e.startYear}{(e.endMonth || e.endYear) ? ` - ${e.endMonth} ${e.endYear}` : ""}
          </p>
        )}
      </div>
      {/* Row 3: Skills */}
      {e.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {e.skills.map((s: string, i: number) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs text-gray-800" style={{ backgroundColor: "#deecb2" }}>{s}</span>
          ))}
        </div>
      )}
      {/* Row 4: Description */}
      {e.description && (
        <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">{e.description}</p>
      )}
    </div>
  );
}

/** Card for an award entry — matches AwardsInput card exactly */
function AwardCard({ a, idx }: { a: Record<string, any>; idx: number }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Row 1: Icon + Title + Category */}
      <div className="flex items-start gap-2 mb-2">
        <Award className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-gray-900">{a.title || "Untitled"}</h3>
          {a.category && <p className="text-sm text-teal-600">{a.category}</p>}
        </div>
      </div>
      {/* Row 2: Organization + Date */}
      <div className="ml-7">
        {a.organization && (
          <p className="text-sm text-gray-700 mb-1"><span className="font-medium">{a.organization}</span></p>
        )}
        {(a.month || a.year) && (
          <p className="text-xs text-gray-500">Issued: {a.month} {a.year}</p>
        )}
        {a.certification && (
          <p className="text-xs text-blue-600 mt-1">📎 Certification attached</p>
        )}
      </div>
    </div>
  );
}

/** Card for an open source contribution — matches OpenSourceInput card exactly */
function OpenSourceCard({ item, idx }: { item: Record<string, any>; idx: number }) {
  const monthsLabel = item.monthsContributing
    ? item.monthsContributing.includes("+")
      ? `${item.monthsContributing.replace('+', '')}+ months`
      : item.monthsContributing === "1"
        ? "1 month"
        : `${item.monthsContributing} months`
    : "";

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Header: GitHub username + Program badge + Duration badge */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h3 className="font-semibold text-gray-700">
          {item.githubProfile
            ? item.githubProfile.replace("https://github.com/", "").replace(/\/$/, "")
            : "GitHub Profile"}
        </h3>
        {item.programName && item.programName !== "None" && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#f2d884", color: "#5a4b1a" }}
          >
            {item.programName}
          </span>
        )}
        {monthsLabel && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: "#a1d7d7" }}
          >
            {monthsLabel}
          </span>
        )}
      </div>

      {/* Project name */}
      {item.projectName && (
        <h2 className="font-bold text-lg text-gray-900 mb-1 truncate">{item.projectName}</h2>
      )}

      {/* Impact description */}
      {item.impactDescription && (
        <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">{item.impactDescription}</p>
      )}

      {/* PR links */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[item.topPR1, item.topPR2, item.topPR3].map((pr: string, i: number) =>
          pr ? (
            <a
              key={i}
              href={pr}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-gray-800 hover:underline"
              style={{ backgroundColor: "#deecb2" }}
            >
              PR #{i + 1}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
            </a>
          ) : null
        )}
        {item.impactPRLink && (
          <a
            href={item.impactPRLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs hover:underline"
            style={{ backgroundColor: "#57B1B2", color: "#fff" }}
          >
            Impact PR
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        )}
      </div>

      {/* GitHub profile link */}
      {item.githubProfile && (
        <a
          href={item.githubProfile}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-700 hover:underline flex items-center gap-1"
        >
          <GithubIcon /> View Github Profile
        </a>
      )}
    </div>
  );
}

/** Card for a research paper / CP competition entry */
function GenericItemCard({ item, idx }: { item: Record<string, any>; idx: number }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold text-gray-900 mb-1">{item.title || item.name || item.competition || "Entry"}</h3>
      {Object.entries(item)
        .filter(([k]) => !["title", "name", "competition"].includes(k))
        .map(([k, v]) => (
          <p key={k} className="text-sm text-gray-600">
            <span className="font-medium">{k}:</span> {typeof v === "string" ? v : JSON.stringify(v)}
          </p>
        ))}
    </div>
  );
}



/** Render a complex value (array or object) with proper formatting */
function FormattedValue({ fieldKey, value }: { fieldKey: string; value: any }) {
  // Empty arrays
  if (Array.isArray(value) && value.length === 0) {
    return <span className="text-gray-400 italic">None</span>;
  }

  // Skills — render as badges
  if (fieldKey === "skills" && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((s: any, i: number) => (
          <SkillBadge key={i} skill={s.skill} proficiency={s.proficiency} />
        ))}
      </div>
    );
  }

  // Hackathons
  if (fieldKey === "hackathons" && Array.isArray(value)) {
    return <div>{value.map((h, i) => <HackathonCard key={i} h={h} idx={i} />)}</div>;
  }

  // Projects
  if (fieldKey === "projects" && Array.isArray(value)) {
    return <div>{value.map((p, i) => <ProjectCard key={i} p={p} idx={i} />)}</div>;
  }

  // Experiences
  if (fieldKey === "experiences" && Array.isArray(value)) {
    return <div>{value.map((e, i) => <ExperienceCard key={i} e={e} idx={i} />)}</div>;
  }

  // Awards
  if (fieldKey === "awards" && Array.isArray(value)) {
    return <div>{value.map((a, i) => <AwardCard key={i} a={a} idx={i} />)}</div>;
  }

  // Generic arrays of objects (researchPapers, cpCompetitions, openSource, etc.)
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
    return <div>{value.map((item, i) => <GenericItemCard key={i} item={item} idx={i} />)}</div>;
  }

  // Generic arrays of primitives
  if (Array.isArray(value)) {
    return <span>{value.join(", ")}</span>;
  }

  // Plain objects — render as key-value list
  if (typeof value === "object" && value !== null) {
    return (
      <div className="text-sm space-y-0.5">
        {Object.entries(value).map(([k, v]) => (
          <p key={k}>
            <span className="font-medium">{k}:</span>{" "}
            {typeof v === "string" ? v : JSON.stringify(v)}
          </p>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export default function VettingDataDisplay({
  data,
  jwtToken,
}: {
  data: Record<string, any>;
  jwtToken: string;
}) {
  const [fileMeta, setFileMeta] = useState<Record<string, FileMeta | null>>({});

  useEffect(() => {
    const fetchFileMeta = async () => {
      const meta: Record<string, FileMeta | null> = {};
      await Promise.all(
        fileFields.map(async (field) => {
          const path = data[field];
          if (typeof path === "string" && path.startsWith("applications/")) {
            try {
              const res = await fetch(
                `/api/file/metadata?path=${encodeURIComponent(path)}`,
                { method: "GET", headers: { Authorization: `Bearer ${jwtToken}` } }
              );
              const result = await res.json();
              meta[field] = res.ok ? result.file : null;
            } catch {
              console.error(`Failed to fetch ${field} metadata`);
              meta[field] = null;
            }
          } else {
            meta[field] = null;
          }
        })
      );
      setFileMeta(meta);
    };
    fetchFileMeta();
  }, [data]);

  /** Render a single scalar field as a labelled row */
  function FieldRow({ label, value, fieldKey }: { label: string; value: any; fieldKey: string }) {
    if (value === null || value === undefined || value === "") {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500 font-medium">{label}</span>
          <span className="text-sm text-gray-400 italic">—</span>
        </div>
      );
    }
    if (typeof value === "boolean") {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500 font-medium">{label}</span>
          <span className="text-sm">{value ? "Yes" : "No"}</span>
        </div>
      );
    }
    if (typeof value === "string") {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-500 font-medium">{label}</span>
          <span className="text-sm"><MaybeLink value={value} /></span>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <div className="text-sm"><FormattedValue fieldKey={fieldKey} value={value} /></div>
      </div>
    );
  }

  /** Render a file field with download link */
  function FileRow({ fieldKey }: { fieldKey: string }) {
    const meta = fileMeta[fieldKey];
    const label = formatLabel(fieldKey);
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {meta ? (
          <a href={meta.url} target="_blank" rel="noopener noreferrer" className="text-sm text-black underline">
            {meta.name}
          </a>
        ) : (
          <span className="text-sm text-gray-400 italic">Not submitted</span>
        )}
      </div>
    );
  }

  const d = data;

  return (
    <div className="flex flex-col gap-8 py-2 mt-4">

      {/* Category */}
      {d.category && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Category</p>
          <Separator />
          <span className="inline-block bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium w-fit">
            {d.category}
          </span>
        </div>
      )}

      {/* Personal Info */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Personal Info</p>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Name" value={d.name} fieldKey="name" />
          <FieldRow label="Email" value={d.email} fieldKey="email" />
          <FieldRow label="Date of Birth" value={d.dob} fieldKey="dob" />
          <FieldRow label="Phone" value={d.phone} fieldKey="phone" />
          <FieldRow label="College" value={d.college} fieldKey="college" />
          <FieldRow label="College Email" value={d.collegeEmail} fieldKey="collegeEmail" />
          <FieldRow label="Degree" value={d.degree} fieldKey="degree" />
          <FieldRow label="Branch" value={d.branch} fieldKey="branch" />
          <FieldRow label="Year" value={d.year} fieldKey="year" />
          <FieldRow label="CGPA" value={d.cgpa} fieldKey="cgpa" />
          <FieldRow label="LinkedIn" value={d.linkedin} fieldKey="linkedin" />
          <FieldRow label="GitHub" value={d.github} fieldKey="github" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
          <FileRow fieldKey="resume" />
          <FileRow fieldKey="transcript" />
          <FileRow fieldKey="studentId" />
        </div>
      </div>

      {/* Skills & Proficiency */}
      {d.skills && d.skills.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Skills &amp; Proficiency</p>
          <Separator />
          <div className="flex flex-wrap gap-1">
            {d.skills.map((s: any, i: number) => (
              <SkillBadge key={i} skill={s.skill} proficiency={s.proficiency} />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Projects</p>
        <Separator />
        {d.projects && d.projects.length > 0
          ? d.projects.map((p: any, i: number) => <ProjectCard key={i} p={p} idx={i} />)
          : <span className="text-sm text-gray-400 italic">None submitted</span>}
      </div>

      {/* Experience */}
      {d.experiences && d.experiences.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Experience</p>
          <Separator />
          {d.experiences.map((e: any, i: number) => <ExperienceCard key={i} e={e} idx={i} />)}
        </div>
      )}

      {/* Hackathons */}
      {d.hackathons && d.hackathons.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Hackathons</p>
          <Separator />
          {d.hackathons.map((h: any, i: number) => <HackathonCard key={i} h={h} idx={i} />)}
        </div>
      )}

      {/* Open Source */}
      {d.openSource && d.openSource.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Open Source</p>
          <Separator />
          {d.openSource.map((item: any, i: number) => <OpenSourceCard key={i} item={item} idx={i} />)}
        </div>
      )}

      {/* Research & Competitive Programming */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Research &amp; Competitive Programming</p>
        <Separator />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Has Published Research?" value={d.hasPublishedResearch} fieldKey="hasPublishedResearch" />
          <FieldRow label="Qualified CP Competitions?" value={d.hasQualifiedCpCompetitions} fieldKey="hasQualifiedCpCompetitions" />
          <FieldRow label="Codeforces Rating" value={d.codeforcesRating} fieldKey="codeforcesRating" />
          <FieldRow label="Codeforces ID" value={d.codeforcesUserId} fieldKey="codeforcesUserId" />
          <FieldRow label="CodeChef Rating" value={d.codechefRating} fieldKey="codechefRating" />
          <FieldRow label="CodeChef ID" value={d.codechefUserId} fieldKey="codechefUserId" />
        </div>
        {d.researchPapers?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Research Papers</p>
            {d.researchPapers.map((item: any, i: number) => <GenericItemCard key={i} item={item} idx={i} />)}
          </div>
        )}
        {d.cpCompetitions?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">CP Competitions</p>
            {d.cpCompetitions.map((item: any, i: number) => <GenericItemCard key={i} item={item} idx={i} />)}
          </div>
        )}
      </div>

      {/* Awards & Documents */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Awards &amp; Documents</p>
        <Separator />
        {d.awards && d.awards.length > 0
          ? d.awards.map((a: any, i: number) => <AwardCard key={i} a={a} idx={i} />)
          : <span className="text-sm text-gray-400 italic">None submitted</span>}
      </div>

    </div>
  );
}


