import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupabaseVettingData } from "@/src/lib/schemas/formSchema";
import { ExternalLink } from "lucide-react";

type FileMeta = {
  name: string;
  size: number;
  url: string;
};

const stringOrFallback = (value: unknown, fallback = "N/A"): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

function formatTimeWindow(
  startMonth?: string,
  startYear?: string,
  endMonth?: string,
  endYear?: string
) {
  const start = [startMonth, startYear].filter(Boolean).join(" ");
  const end = [endMonth, endYear].filter(Boolean).join(" ");
  if (!start && !end) return "N/A";
  return `${start || "N/A"} - ${end || "Present"}`;
}

function formatDate(value: unknown): string {
  if (!value) return "N/A";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default function ApplicantDetailView({
  data,
  jwtToken,
}: {
  data: SupabaseVettingData;
  jwtToken: string;
}) {
  const [resumeMeta, setResumeMeta] = useState<FileMeta | null>(null);
  const [resumeMetaLoading, setResumeMetaLoading] = useState(false);

  useEffect(() => {
    const resumePath = data.resume;
    if (!resumePath || typeof resumePath !== "string") return;

    const fetchResumeMeta = async () => {
      setResumeMetaLoading(true);
      try {
        if (resumePath.startsWith("applications/")) {
          const res = await fetch(
            `/api/file/metadata?path=${encodeURIComponent(resumePath)}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${jwtToken}` },
            }
          );
          const json = await res.json();
          if (res.ok && json?.file) {
            setResumeMeta(json.file);
          }
          return;
        }

        if (resumePath.startsWith("http")) {
          setResumeMeta({
            name: resumePath.split("/").pop() || "resume",
            size: 0,
            url: resumePath,
          });
        }
      } catch (error) {
        console.error("Failed to load resume metadata", error);
      } finally {
        setResumeMetaLoading(false);
      }
    };

    fetchResumeMeta();
  }, [data.resume, jwtToken]);

  const basicInformation = [
    { label: "Name", value: stringOrFallback(data.name) },
    { label: "Email", value: stringOrFallback(data.email) },
    { label: "Phone", value: stringOrFallback(data.phone) },
    { label: "University", value: stringOrFallback(data.college) },
    { label: "College Email", value: stringOrFallback(data.collegeEmail) },
    { label: "Degree", value: stringOrFallback(data.degree) },
    { label: "Branch", value: stringOrFallback(data.branch) },
    { label: "Year", value: stringOrFallback(data.year) },
    { label: "CGPA", value: data.cgpa ? String(data.cgpa) : "N/A" },
    { label: "Date of Birth", value: formatDate(data.dob) },
    {
      label: "LinkedIn",
      value: stringOrFallback(data.linkedin),
    },
    {
      label: "GitHub",
      value: stringOrFallback(data.github),
    },
  ];

  const skills = data.skills || [];
  const experiences = data.experiences || [];
  const projects = data.projects || [];
  const hackathons = data.hackathons || [];
  const openSource = data.openSource || [];
  const researchPapers = data.researchPapers || [];

  return (
    <div className="space-y-5 font-sans">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {basicInformation.map((item) => (
              <div key={item.label}>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-gray-900 break-all">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Skills ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={`${skill.skill}-${index}`}
                  className="px-3 py-1 rounded-full text-sm text-white font-medium"
                  style={{ backgroundColor: "#5FB3B3" }}
                >
                  {skill.skill} ({skill.proficiency})
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No skills submitted.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Work Experience ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Work Experience</CardTitle>
        </CardHeader>
        <CardContent>
          {experiences.length > 0 ? (
            <div className="space-y-3">
              {experiences.map((experience, index) => (
                <div
                  key={`${experience.title}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {/* Top Row: Title + Employment Type badge */}
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{experience.title}</h3>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{ backgroundColor: "#a1d7d7" }}
                      >
                        {experience.employmentType}
                      </span>
                    </div>
                  </div>

                  {/* Company Row */}
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700">{experience.company}</p>
                  </div>

                  {/* Skills */}
                  {experience.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {experience.skills.map((skill, skillIndex) => (
                        <span
                          key={`${skill}-${skillIndex}`}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-800"
                          style={{ backgroundColor: "#deecb2" }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-sm text-gray-600 whitespace-pre-wrap break-words mb-3">
                    {experience.description}
                  </p>

                  {/* Timeline */}
                  <p className="text-xs font-medium text-gray-500 pt-2 border-gray-200">
                    {formatTimeWindow(
                      experience.startMonth,
                      experience.startYear,
                      experience.endMonth,
                      experience.endYear
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No work experience submitted.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Projects ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((project, index) => (
                <div
                  key={`${project.title}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {/* Row 1: Title + Type + Members badges */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate min-w-0">{project.title}</h3>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{ backgroundColor: "#a1d7d7" }}
                      >
                        {project.type}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{ backgroundColor: "#a1d7d7" }}
                      >
                        {project.members}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Tech Stack */}
                  {project.techStack?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.techStack.map((tech, techIndex) => (
                        <span
                          key={`${tech}-${techIndex}`}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-800"
                          style={{ backgroundColor: "#deecb2" }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Row 3: Description */}
                  <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">{project.description}</p>

                  {/* Row 4: Timing */}
                  <p className="text-xs text-gray-500 mb-2">
                    {project.startMonth} {project.startYear} - {project.endMonth} {project.endYear}
                  </p>

                  {/* Row 5: GitHub Link */}
                  {project.githubLink && (
                    <a
                      href={project.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-700 hover:underline flex items-center gap-1"
                    >
                      <GitHubIcon className="w-4 h-4" />
                      View on GitHub
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No projects submitted.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Hackathons ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Hackathons</CardTitle>
        </CardHeader>
        <CardContent>
          {hackathons.length > 0 ? (
            <div className="space-y-3">
              {hackathons.map((hackathon, index) => (
                <div
                  key={`${hackathon.name}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {/* Row 1: Hackathon Name + Type badge + Placement badge */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate min-w-0">{hackathon.name}</h3>
                      {hackathon.type && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ backgroundColor: "#a1d7d7" }}
                        >
                          {hackathon.type}
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: "#f2d884", color: "#5a4b1a" }}
                      >
                        {hackathon.placement}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Project Name + Role + Team Size */}
                  <div className="mb-2">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{hackathon.projectName}</span>
                      {(hackathon.role || hackathon.teamSize) && (
                        <span className="text-gray-500">
                          {hackathon.role && ` — ${hackathon.role}`}
                          {hackathon.teamSize && ` • Team of ${hackathon.teamSize}`}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Row 3: Tech Stack badges */}
                  {hackathon.techStack?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {hackathon.techStack.map((tech, techIndex) => (
                        <span
                          key={`${tech}-${techIndex}`}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-800"
                          style={{ backgroundColor: "#deecb2" }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Row 4: Description */}
                  <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">{hackathon.description}</p>

                  {/* Row 5: GitHub Link */}
                  {hackathon.githubLink && (
                    <a
                      href={hackathon.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-700 hover:underline flex items-center gap-1"
                    >
                      <GitHubIcon className="w-4 h-4" />
                      View on GitHub
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hackathons submitted.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Open Source Contributions ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Open Source Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {openSource.length > 0 ? (
            <div className="space-y-3">
              {openSource.map((os, index) => {
                const monthsLabel = os.monthsContributing
                  ? os.monthsContributing.toString().includes("+")
                    ? `${os.monthsContributing.toString().replace('+', '')}+ months`
                    : os.monthsContributing === "1"
                      ? "1 month"
                      : `${os.monthsContributing} months`
                  : "";

                const githubProfile = typeof os.githubProfile === "string" ? os.githubProfile : "";

                return (
                  <div
                    key={`${os.programName}-${index}`}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <h3 className="font-semibold text-gray-700 truncate min-w-0">
                          {githubProfile
                            ? githubProfile.replace("https://github.com/", "").replace(/\/$/, "")
                            : "GitHub Profile"}
                        </h3>
                        {os.programName && os.programName !== "None" && (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{ backgroundColor: "#f2d884", color: "#5a4b1a" }}
                          >
                            {os.programName}
                          </span>
                        )}
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ backgroundColor: "#a1d7d7" }}
                        >
                          {monthsLabel}
                        </span>
                      </div>
                    </div>

                    {/* Project Name */}
                    {(os as any).projectName && (
                      <h2 className="font-bold text-lg text-gray-900 mb-1 truncate">{(os as any).projectName}</h2>
                    )}

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">
                      {os.impactDescription}
                    </p>

                    {/* PR Links */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[os.topPR1, os.topPR2, os.topPR3].map((pr, i) =>
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
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : null
                      )}
                      {os.impactPRLink && (
                        <a
                          href={os.impactPRLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs hover:underline"
                          style={{ backgroundColor: "#57B1B2", color: "#fff" }}
                        >
                          Impact PR
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* GitHub Profile Link */}
                    {githubProfile && (
                      <a
                        href={githubProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-700 hover:underline flex items-center gap-1"
                      >
                        <GitHubIcon className="w-4 h-4" />
                        View GitHub Profile
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No open source contributions submitted.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Research Papers ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Research Papers</CardTitle>
        </CardHeader>
        <CardContent>
          {researchPapers.length > 0 ? (
            <div className="space-y-3">
              {researchPapers.map((paper, index) => (
                <div
                  key={`${paper.title}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{paper.title}</h3>
                      <p className="text-sm text-gray-700 truncate">{paper.venue}</p>
                      <p className="text-xs text-gray-600 mt-1">Rank: {paper.rank} | Year: {paper.year}</p>
                      {paper.verificationLink && (
                        <a
                          href={paper.verificationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-700 hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Verification
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No research papers submitted.</p>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Resume</CardTitle>
        </CardHeader>
        <CardContent>
          {resumeMetaLoading ? (
            <p className="text-sm text-gray-500">Loading resume...</p>
          ) : resumeMeta ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{resumeMeta.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(resumeMeta.size)}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="text-black border-gray-300">
                <a
                  href={
                    (() => {
                      try {
                        const u = new URL(resumeMeta.url);
                        return u.protocol === "http:" || u.protocol === "https:" ? resumeMeta.url : "#";
                      } catch {
                        return resumeMeta.url.startsWith("/") ? resumeMeta.url : "#";
                      }
                    })()
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Resume
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Resume not available.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
