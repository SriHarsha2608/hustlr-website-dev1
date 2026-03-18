import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

export const formSchema = z.object({
  category: z.string().min(1, "A category is required"),

  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  dob: z
    .date({ required_error: "Date of birth is required" })
    .min(new Date("1900-01-01"), "Date of birth is too far in the past")
    .refine(
      (date) => {
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        const m = today.getMonth() - date.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
          return age - 1 >= 18;
        }
        return age >= 18;
      },
      { message: "You must be at least 18 years old" }
    ),
  phone: z.string().regex(/^\+91\d{10}$/, "Invalid phone number"),
  college: z
    .string()
    .min(3, "College is required")
    .max(80, "College name must be at most 80 characters")
    .regex(/^[A-Za-z0-9 .,&()'\-/]+$/, "College name contains invalid characters"),
  collegeEmail: z.string().email("Invalid email"),
  degree: z.string().min(1, "Degree is required"),
  branch: z.string().min(1, "Branch is required"),
  year: z.string().min(1, "Year is required"),
  cgpa: z
    .string()
    .refine((val) => /^\d+\.\d+$/.test(val), {
      message: "CGPA must include a decimal point (e.g., 8.25)",
    })
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num >= 6 && num <= 10;
      },
      {
        message: "CGPA must be between 6 and 10",
      }
    ),

  linkedin: z
    .string()
    .optional()
    .refine((val) => !val || (val.startsWith("https://") && val.includes("linkedin.com/in/")), "Must be a valid LinkedIn profile link (e.g., https://linkedin.com/in/username)"),
  github: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith("https://github.com/"), "Must be a valid GitHub profile link (e.g., https://github.com/username)"),
  awards: z.array(z.object({
    title: z.string().min(1, "Award title is required"),
    category: z.enum(["Scholarship", "Hackathon", "Competitive programming", "Academic award", "Open source"], {
      required_error: "Please select award category"
    }),
    organization: z.string().min(1, "Issuing organization is required"),
    month: z.string().min(1, "Issued month is required"),
    year: z.string().min(1, "Issued year is required"),
    certification: z.string().optional()
  })).optional(),
  skills: z.array(z.object({
    skill: z.string().min(1, "Skill name is required"),
    proficiency: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"], {
      required_error: "Please select proficiency level"
    })
  })).min(1, "Add at least one skill"),
  projects: z.array(z.object({
    title: z.string().min(1, "Project title is required"),
    type: z.enum(["Course", "Personal", "Internship", "Freelance", "Hackathon"], {
      required_error: "Please select project type"
    }),
    members: z.enum(["Solo", "Group"], {
      required_error: "Please select projects members"
    }),
    description: z.string().min(1, "Project description is required"),
    techStack: z.array(z.string()).min(1, "Add at least one technology"),
    startMonth: z.string().min(1, "Start month is required"),
    startYear: z.string().min(1, "Start year is required"),
    endMonth: z.string().min(1, "End month is required"),
    endYear: z.string().min(1, "End year is required"),
    githubLink: z.string().optional()
  })).optional(),
  experiences: z.array(z.object({
    title: z.string().min(1, "Job title is required"),
    employmentType: z.enum(["Part time", "Internship", "Freelancing", "Self Employed", "Apprenticeship"], {
      required_error: "Please select employment type"
    }),
    company: z.string().min(1, "Company or organization is required"),
    description: z.string().min(1, "Experience description is required"),
    skills: z.array(z.string()).min(1, "Add at least one skill"),
    startMonth: z.string().min(1, "Start month is required"),
    startYear: z.string().min(1, "Start year is required"),
    endMonth: z.string().min(1, "End month is required"),
    endYear: z.string().min(1, "End year is required")
  })).optional(),
  hackathons: z.array(z.object({
    name: z.string().min(1, "Hackathon name is required"),
    projectName: z.string().min(1, "Project name is required"),
    description: z.string().min(1, "Description is required"),
    placement: z.string().min(1, "Position claimed is required"),
    githubLink: z.string().min(1, "GitHub link is required"),
    type: z.string().min(1, "Hackathon type is required"),
    teamSize: z.string().min(1, "Team size is required"),
    role: z.string().min(1, "Role is required"),
    techStack: z.array(z.string()).min(1, "Add at least one technology"),
  })).optional(),
  openSource: z.array(z.object({
    githubProfile: z.string().min(1, "GitHub profile URL is required"),
    topPR1: z.string().min(1, "Merged PR #1 link is required"),
    topPR2: z.string().min(1, "Merged PR #2 link is required"),
    topPR3: z.string().min(1, "Merged PR #3 link is required"),
    programName: z.string().min(1, "Please select a program"),
    proofLink: z.string().optional(),
    impactPRLink: z.string().min(1, "Impact PR link is required"),
    impactDescription: z.string().min(1, "Impact description is required"),
    monthsContributing: z.string().min(1, "Months of contribution is required"),
  })).optional(),
  hasPublishedResearch: z.enum(["Yes", "No"], {
    required_error: "Please tell us if you have published any paper",
  }),
  researchPapers: z
    .array(
      z.object({
        title: z.string().min(1, "Paper title is required"),
        venue: z.string().min(1, "Journal / conference name is required"),
        rank: z.enum(["A*", "A", "B*", "B", "C", "Unranked"], {
          required_error: "Please select paper rank",
        }),
        year: z.string().min(1, "Publication year is required"),
        verificationLink: z.string().url("Enter a valid verification URL"),
      })
    )
    .optional(),
  codeforcesRating: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), "Codeforces rating must be a number"),
  codeforcesUserId: z.string().optional(),
  codechefRating: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), "CodeChef rating must be a number"),
  codechefUserId: z.string().optional(),
  hasQualifiedCpCompetitions: z.enum(["Yes", "No"], {
    required_error: "Please tell us if you qualified for competitions like ICPC",
  }),
  cpCompetitions: z
    .array(
      z.object({
        name: z.string().min(1, "Competition name is required"),
        achievement: z.string().min(1, "Qualification / achievement is required"),
        year: z.string().min(1, "Year is required"),
        verificationLink: z.string().url("Enter a valid verification URL").optional().or(z.literal("")),
      })
    )
    .optional(),
  studentId: z.string().min(1, "Student ID is required"),
  resume: z.string().min(1, "Resume is required"),
  transcript: z.string().min(1, "Transcript is required"),
}).superRefine((data, ctx) => {
  if (data.hasPublishedResearch === "Yes" && (!data.researchPapers || data.researchPapers.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["researchPapers"],
      message: "Add at least one published paper",
    });
  }

  if (data.hasQualifiedCpCompetitions === "Yes" && (!data.cpCompetitions || data.cpCompetitions.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cpCompetitions"],
      message: "Add at least one qualified competition",
    });
  }

  if (data.codeforcesRating && !data.codeforcesUserId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["codeforcesUserId"],
      message: "Codeforces User ID is required when rating is provided",
    });
  }

  if (data.codechefRating && !data.codechefUserId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["codechefUserId"],
      message: "CodeChef User ID is required when rating is provided",
    });
  }
});

export type UploadFormFields = z.infer<typeof formSchema>;
export type FormFieldProp = UseFormReturn<UploadFormFields>;

export type PreloadedFileInfo = {
  name: string;
  size: number;
  url: string;
};

export type SupabaseVettingData = {
  // first round details
  email: string;
  name: string;
  category: string;
  phone?: string;
  collegeEmail?: string;
  degree?: string;
  branch?: string;
  college: string;
  year: string;
  dob: string;
  cgpa: number;
  linkedin?: string;
  github?: string;
  awards?: {
    title: string;
    category: string;
    organization: string;
    month: string;
    year: string;
    certification?: string;
  }[];
  skills: { skill: string; proficiency: string }[];
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
  openSource?: {
    githubProfile: string;
    topPR1: string;
    topPR2: string;
    topPR3: string;
    programName: string;
    proofLink?: string;
    impactPRLink: string;
    impactDescription: string;
    monthsContributing: string;
  }[];
  hasPublishedResearch?: "Yes" | "No";
  researchPapers?: {
    title: string;
    venue: string;
    rank: "A*" | "A" | "B*" | "B" | "C" | "Unranked";
    year: string;
    verificationLink: string;
  }[];
  codeforcesRating?: string;
  codeforcesUserId?: string;
  codechefRating?: string;
  codechefUserId?: string;
  hasQualifiedCpCompetitions?: "Yes" | "No";
  cpCompetitions?: {
    name: string;
    achievement: string;
    year: string;
    verificationLink?: string;
  }[];
  resume?: string;
  transcript?: string;
  studentId?: string;
  /* TODO: Migrate isComplete also to status */
  isComplete?: boolean; // tells if stage one is completed
  // used to determine application status
  status?: ApplicationStatus;
  // future-compatible pipeline fields (snake_case)
  current_stage?: PipelineStage;
  stage_status?: StageStatus;
  resume_score?: number | string;
  resume_decision?: StageStatus;
  test_project_status?: TestProjectStatus;
  decision_status?: StageStatus;
  decision_source?: DecisionSource;
  // camelCase mirrors for frontend/runtime compatibility
  decisionStatus?: "accepted" | "rejected" | "pending" | string;
  decisionSource?: "algorithm" | "admin_override" | string;
  decisionUpdatedAt?: string;
  decisionUpdatedBy?: string;
  resumeScore?: number | string;
  algorithmDecision?: "accepted" | "rejected" | "pending" | string;
  currentStage?: number;
  // scoring fields (added by migration 002)
  scores?: Record<string, any>;
  final_score?: number;
  scored_at?: string;
  // second round details
  selectedProjectSanityId?: JSON;
  videoLink?: string;
  otherLinks?: string;
  projectDeadline: string;
};

export type ApplicationStatus =
  | "not_completed"
  | "under_review" // means round 1 - submitted for review
  | "round_2_eligible" // means round 1 was accepted
  | "round_2_project_selected" // means round 2 project was selected
  | "round_2_under_review" // means round 2 project was submitted for review
  // verbose enough
  | "accepted" // both rounds were accepted and onboarding completed
  | "rejected";

export type PipelineStage =
  | "application_submitted"
  | "resume_screening"
  | "test_project"
  | "live_screening"
  | "accepted"
  | "rejected";

export type StageStatus = "pending" | "accepted" | "rejected";
export type TestProjectStatus =
  | "not_started"
  | "assigned"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected";
export type DecisionSource = "algorithm" | "admin_override";

export type Stage2Data = {
  email: string;
  status?: ApplicationStatus;
  currentStage: number;
  selectedProjectSanityId: string;
  videoLink?: string;
  otherLinks?: string;
};

export type Stage2ProjectSubmit = {
  status: ApplicationStatus;
  videoLink: string;
  otherLinks?: string;
};

export type GetVettingProgressResponse =
  | { success: true; data: SupabaseVettingData }
  | { success: false };

