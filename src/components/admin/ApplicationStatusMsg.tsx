import { Badge } from "@/components/ui/badge";
import { SupabaseVettingData } from "../../lib/schemas/formSchema";

export function ApplicationStatusCard({ data }: { data: SupabaseVettingData }) {
  const { isComplete, status, currentStage, decisionStatus, decisionSource } =
    data;

  let message = "";
  let badge = "";
  let bgClass = "";
  let textClass = "";

  if (!status) {
    message = "This application does not yet have a defined status.";
    bgClass = "bg-gray-50 border border-gray-300";
    textClass = "text-gray-700";
    badge = "No Status";
  } else {
    switch (status) {
      case "not_completed":
        message = "This application's stage one is still in progress.";
        bgClass = "bg-yellow-50 border-yellow-300/80";
        textClass = "text-yellow-700";
        badge = "Stage 1 - Incomplete";
        break;
      case "under_review":
        message = "This application is currently under review for stage one.";
        bgClass = "bg-blue-50 border-blue-300/80";
        textClass = "text-blue-700";
        badge = "Stage 1 - Under Review";
        break;
      case "round_2_eligible":
        message = "This application is eligible for stage two.";
        bgClass = "bg-green-50 border-green-300/80";
        textClass = "text-green-700";
        badge = "Stage 2 - Eligible";
        break;
      case "round_2_project_selected":
        message = "Project selected for stage two.";
        bgClass = "bg-green-50 border-green-300/80";
        textClass = "text-green-700";
        badge = "Stage 2 - Project Selected";
        break;
      case "round_2_under_review":
        message = "Stage two submission is under review.";
        bgClass = "bg-blue-50 border-blue-300/80";
        textClass = "text-blue-700";
        badge = "Stage 2 - Under Review";
        break;
      case "accepted":
        message = "This application has been accepted.";
        bgClass = "bg-emerald-50 border-emerald-300/80";
        textClass = "text-emerald-700";
        badge = "Accepted";
        break;
      case "rejected":
        message = "This application has been rejected.";
        bgClass = "bg-red-50 border-red-300/80";
        textClass = "text-red-700";
        badge = "Rejected";
        break;
      default:
        message = "Unknown application status.";
        bgClass = "bg-gray-50 border-gray-300";
        textClass = "text-gray-700";
        badge = "Unknown";
    }
  }

  return (
    <div
      className={`rounded px-4 py-3 mt-4 text-center ${bgClass} ${textClass}`}
    >
      <p className="text-lg font-semibold">{message}</p>

      <div className="mt-2 space-x-2">
        <Badge>{badge}</Badge>
        {isComplete !== undefined && (
          <Badge variant={isComplete ? "default" : "outline"}>
            {isComplete ? "Stage 1 Complete" : "Stage 1 Incomplete"}
          </Badge>
        )}
        {currentStage && (
          <Badge variant="secondary">Current Stage: {currentStage}</Badge>
        )}
        {decisionStatus && (
          <Badge variant="outline">
            Decision Status: {String(decisionStatus).replace(/[_-]/g, " ")}
          </Badge>
        )}
        {decisionSource && (
          <Badge variant="outline">
            Decision Source:{" "}
            {decisionSource === "admin_override"
              ? "Admin Override"
              : String(decisionSource).replace(/[_-]/g, " ")}
          </Badge>
        )}
      </div>
    </div>
  );
}
