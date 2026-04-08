export type SkillLevel = "Required" | "Good to have";

export type SkillItem = {
  name: string;
  level: SkillLevel;
};

export type JobPostDraft = {
  id?: string;
  title: string;
  category: string;
  description: string;
  timelineEstimate: string;
  deliverables: string;
  budget: number;
  skills: SkillItem[];
};

export type ClientProfile = {
  companyName: string;
  website: string;
  linkedin: string;
  industry: string;
  companySize: string;
  country: string;
  description: string;
  studentWorkReason: string;
};

export const JOB_POST_DRAFT_STORAGE_KEY = "hustlr.client.jobPostDraft";
export const CLIENT_PROFILE_STORAGE_KEY = "hustlr.client.profile";
