import {
  UploadFormFields as FormFields,
  DecisionSource,
  GetVettingProgressResponse,
  PipelineStage,
  StageStatus,
  Stage2Data,
  Stage2ProjectSubmit,
  SupabaseVettingData,
} from "./schemas/formSchema";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

import { db } from "./firebase-admin";
import { NextApiRequest } from "next";
import { verifyToken } from "@/src/lib/jwt";

// const USERS_COLLECTION = "users";
// const USER_DATA_SUBCOLLECTION = "userData";

// export const saveFinalVettingData = async (stageData: FormFields) => {
//   if (!stageData.email) {
//     throw new Error("Email is required to save vetting progress.");
//   }
//   const userRef = db.collection(USERS_COLLECTION).doc(stageData.email);
//   const vettingDataRef = userRef
//     .collection(USER_DATA_SUBCOLLECTION)
//     .doc("vettingData");

//   await vettingDataRef.set({ isComplete: true, ...stageData }, { merge: true });
// };

// export const saveOrUpdateVettingProgress = async (stageData: FormFields) => {
//   if (!stageData.email) {
//     throw new Error("Email is required to save vetting progress.");
//   }
//   const userRef = db.collection(USERS_COLLECTION).doc(stageData.email);
//   const vettingDataRef = userRef
//     .collection(USER_DATA_SUBCOLLECTION)
//     .doc("vettingData");

//   await vettingDataRef.set(
//     { isComplete: false, ...stageData },
//     { merge: true }
//   );
// };

export function extractEmailFromAuthHeader(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    return typeof payload === "string" ? null : payload.email;
  } catch {
    return null;
  }
}

const FUTURE_PIPELINE_KEYS = [
  "current_stage",
  "stage_status",
  "resume_score",
  "resume_decision",
  "test_project_status",
  "decision_status",
  "decision_source",
  "decisionStatus",
  "decisionSource",
  "resumeScore",
  "algorithmDecision",
  "decisionUpdatedAt",
  "decisionUpdatedBy",
];

function isUnknownColumnError(message?: string): boolean {
  if (!message) return false;
  return /column .* does not exist|could not find the .* column|schema cache/i.test(
    message
  );
}

function stripFuturePipelineFields(payload: Record<string, any>) {
  const next = { ...payload };
  FUTURE_PIPELINE_KEYS.forEach((key) => {
    delete next[key];
  });
  return next;
}

function mapLegacyStatusToStageStatus(status?: string): StageStatus {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected") return "rejected";
  return "pending";
}

function mapLegacyStatusToPipelineStage(
  status?: string,
  currentStage?: number
): PipelineStage {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected") return "rejected";
  if (!normalized || normalized === "not_completed") {
    return "application_submitted";
  }
  if (normalized === "under_review") {
    return "resume_screening";
  }
  if (
    normalized === "round_2_eligible" ||
    normalized === "round_2_project_selected" ||
    normalized === "round_2_under_review" ||
    (typeof currentStage === "number" && currentStage >= 2)
  ) {
    return "test_project";
  }
  if (currentStage === 1) {
    return "resume_screening";
  }
  return "application_submitted";
}

function buildFuturePipelineFields(raw: Record<string, any>) {
  const status = raw.status;
  const currentStageNumber =
    typeof raw.currentStage === "number" ? raw.currentStage : 1;
  const stageStatus = mapLegacyStatusToStageStatus(
    raw.stage_status || raw.stageStatus || raw.decision_status || raw.decisionStatus || status
  );
  const pipelineStage =
    raw.current_stage ||
    mapLegacyStatusToPipelineStage(status, raw.currentStage || currentStageNumber);
  const decisionSource = (
    raw.decision_source ||
    raw.decisionSource ||
    "algorithm"
  ) as DecisionSource;
  const resumeScoreValue =
    raw.resume_score !== undefined ? raw.resume_score : raw.resumeScore;
  const resumeScore =
    typeof resumeScoreValue === "string" && resumeScoreValue.trim()
      ? Number(resumeScoreValue)
      : typeof resumeScoreValue === "number"
      ? resumeScoreValue
      : null;
  const resumeDecision =
    raw.resume_decision ||
    raw.resumeDecision ||
    raw.algorithmDecision ||
    stageStatus;

  return {
    current_stage: pipelineStage,
    stage_status: stageStatus,
    resume_score: Number.isFinite(resumeScore) ? resumeScore : null,
    resume_decision: resumeDecision,
    test_project_status:
      raw.test_project_status || raw.testProjectStatus || "not_started",
    decision_status:
      raw.decision_status || raw.decisionStatus || mapLegacyStatusToStageStatus(status),
    decision_source: decisionSource,
    decisionStatus:
      raw.decisionStatus || raw.decision_status || mapLegacyStatusToStageStatus(status),
    decisionSource: decisionSource,
    resumeScore: Number.isFinite(resumeScore) ? resumeScore : undefined,
    algorithmDecision:
      raw.algorithmDecision || raw.resume_decision || mapLegacyStatusToStageStatus(status),
  };
}

export function prepareVettingData(raw: any): SupabaseVettingData {
  const cgpaAsNumber =
    typeof raw.cgpa === "string" ? parseFloat(raw.cgpa) : raw.cgpa;
  const futureFields = buildFuturePipelineFields(raw);

  return {
    ...raw,
    cgpa: cgpaAsNumber,
    isComplete: false,
    currentStage: typeof raw.currentStage === "number" ? raw.currentStage : 1,
    ...futureFields,
  };
}

export async function checkIfExists(email: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("vettingapplications")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function markAsComplete(data: SupabaseVettingData) {
  const payload: Record<string, any> = {
    ...data,
    ...buildFuturePipelineFields({
      ...data,
      status: "under_review",
      currentStage: 1,
      current_stage: "resume_screening",
      stage_status: "pending",
      decision_source: data.decision_source || data.decisionSource || "algorithm",
    }),
    cgpa: parseFloat(data.cgpa as any),
    isComplete: true,
    status: "under_review",
    currentStage: 1,
  };

  let { error } = await supabaseAdmin
    .from("vettingapplications")
    .update(payload)
    .eq("email", data.email);

  if (error && isUnknownColumnError(error.message)) {
    const fallbackPayload = stripFuturePipelineFields(payload);
    const fallback = await supabaseAdmin
      .from("vettingapplications")
      .update(fallbackPayload)
      .eq("email", data.email);
    error = fallback.error;
  }

  if (error) throw error;
}

export async function updateVettingData(
  data:
    | SupabaseVettingData
    | Stage2Data
    | (Stage2ProjectSubmit & { email: string })
) {
  const payload: Record<string, any> = {
    ...data,
    ...buildFuturePipelineFields(data as Record<string, any>),
  };
  let { error } = await supabaseAdmin
    .from("vettingapplications")
    .update(payload)
    .eq("email", data.email);

  if (error && isUnknownColumnError(error.message)) {
    const fallbackPayload = stripFuturePipelineFields(payload);
    const fallback = await supabaseAdmin
      .from("vettingapplications")
      .update(fallbackPayload)
      .eq("email", data.email);
    error = fallback.error;
  }

  if (error) throw error;
}

export async function insertVettingData(data: SupabaseVettingData) {
  const payload: Record<string, any> = {
    ...data,
    ...buildFuturePipelineFields(data as Record<string, any>),
  };

  let { error } = await supabaseAdmin
    .from("vettingapplications")
    .insert(payload);

  if (error && isUnknownColumnError(error.message)) {
    const fallbackPayload = stripFuturePipelineFields(payload);
    const fallback = await supabaseAdmin
      .from("vettingapplications")
      .insert(fallbackPayload);
    error = fallback.error;
  }

  if (error) throw error;
}

export const getVettingProgress = async (
  email: string
): Promise<GetVettingProgressResponse> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("vettingapplications")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) return { success: false };

    return {
      success: true,
      data: {
        ...data,
      },
    };
  } catch (err) {
    console.error("getVettingProgress failed:", err);
    return { success: false };
  }
};
