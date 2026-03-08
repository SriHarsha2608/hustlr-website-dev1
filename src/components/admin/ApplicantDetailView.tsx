import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupabaseVettingData } from "@/src/lib/schemas/formSchema";
import { Download, ExternalLink, FileText } from "lucide-react";

type FileMeta = {
  name: string;
  size: number;
  url: string;
};

type DecisionView = "Accepted" | "Rejected" | "Pending";

const RESUME_SCORE_KEYS = [
  "resumeScore",
  "resume_score",
  "screeningScore",
  "screening_score",
  "algorithmScore",
  "algorithm_score",
];

const ALGORITHM_DECISION_KEYS = [
  "algorithmDecision",
  "algorithm_decision",
  "resumeDecision",
  "resume_decision",
];

const DECISION_STATUS_KEYS = ["decisionStatus", "decision_status", "status"];
const DECISION_SOURCE_KEYS = ["decisionSource", "decision_source"];

const stringOrFallback = (value: unknown, fallback = "N/A"): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toTitleCase = (value: string): string =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

const normalizeDecision = (value: unknown): DecisionView => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "accepted" || normalized === "approve" || normalized === "approved") {
    return "Accepted";
  }
  if (normalized === "rejected" || normalized === "reject") {
    return "Rejected";
  }
  return "Pending";
};

const parseScore = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }
  return null;
};

function getFirstAvailableValue(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in data && data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }
  return null;
}

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

  const resumeScore = useMemo(() => {
    const value = getFirstAvailableValue(
      data as unknown as Record<string, unknown>,
      RESUME_SCORE_KEYS
    );
    return parseScore(value);
  }, [data]);

  const algorithmDecision = useMemo(() => {
    const explicitAlgorithmDecision = getFirstAvailableValue(
      data as unknown as Record<string, unknown>,
      ALGORITHM_DECISION_KEYS
    );
    if (explicitAlgorithmDecision !== null) {
      return normalizeDecision(explicitAlgorithmDecision);
    }

    const fallbackDecisionStatus = getFirstAvailableValue(
      data as unknown as Record<string, unknown>,
      DECISION_STATUS_KEYS
    );
    return normalizeDecision(fallbackDecisionStatus);
  }, [data]);

  const currentDecisionStatus = useMemo(() => {
    const decisionStatusRaw = getFirstAvailableValue(
      data as unknown as Record<string, unknown>,
      DECISION_STATUS_KEYS
    );
    return normalizeDecision(decisionStatusRaw);
  }, [data]);

  const decisionSource = useMemo(() => {
    const sourceRaw = getFirstAvailableValue(
      data as unknown as Record<string, unknown>,
      DECISION_SOURCE_KEYS
    );
    const normalized = String(sourceRaw || "algorithm")
      .trim()
      .toLowerCase();

    if (normalized === "admin_override") return "Admin Override";
    if (normalized === "algorithm") return "Algorithm";
    return toTitleCase(normalized);
  }, [data]);

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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={`${skill.skill}-${index}`} variant="secondary">
                  {skill.skill} ({skill.proficiency})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No skills submitted.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Work Experience</CardTitle>
        </CardHeader>
        <CardContent>
          {experiences.length > 0 ? (
            <div className="space-y-4">
              {experiences.map((experience, index) => (
                <div key={`${experience.title}-${index}`} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {experience.title} at {experience.company}
                    </h3>
                    <Badge variant="outline">{experience.employmentType}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTimeWindow(
                      experience.startMonth,
                      experience.startYear,
                      experience.endMonth,
                      experience.endYear
                    )}
                  </p>
                  <p className="mt-3 text-sm text-gray-700">{experience.description}</p>
                  {experience.skills?.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {experience.skills.map((skill, skillIndex) => (
                        <Badge key={`${skill}-${skillIndex}`} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No work experience submitted.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project, index) => (
                <div key={`${project.title}-${index}`} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {project.title}
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">{project.type}</Badge>
                      <Badge variant="outline">{project.members}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTimeWindow(
                      project.startMonth,
                      project.startYear,
                      project.endMonth,
                      project.endYear
                    )}
                  </p>
                  <p className="mt-3 text-sm text-gray-700">{project.description}</p>

                  {project.techStack?.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {project.techStack.map((tech, techIndex) => (
                        <Badge key={`${tech}-${techIndex}`} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {project.githubLink ? (
                    <a
                      href={project.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      View GitHub Link <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No projects submitted.</p>
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{resumeMeta.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(resumeMeta.size)}
                  </p>
                </div>
              </div>
              <Button asChild>
                <a href={resumeMeta.url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download Resume
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Resume not available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Resume Screening Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Resume Score:</span>{" "}
              {resumeScore !== null ? resumeScore : "N/A"}
            </p>
            <p>
              <span className="font-semibold">Algorithm Decision:</span>{" "}
              {algorithmDecision}
            </p>
            <p>
              <span className="font-semibold">Current Decision Status:</span>{" "}
              {currentDecisionStatus}
            </p>
            <p>
              <span className="font-semibold">Decision Source:</span>{" "}
              {decisionSource}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
