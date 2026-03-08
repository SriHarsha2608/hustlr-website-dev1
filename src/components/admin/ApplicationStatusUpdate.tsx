"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type OverrideStatus = "accepted" | "rejected";

function formatStatus(value: string): string {
  if (!value) return "Pending";
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDecisionSource(value?: string): string {
  if (!value) return "Algorithm";
  if (value === "admin_override") return "Admin Override";
  if (value === "algorithm") return "Algorithm";
  return formatStatus(value);
}

function ConfirmActionModal({
  action,
  description,
  onConfirm,
  loading,
  children,
}: {
  action: "Approve" | "Reject";
  description: string;
  onConfirm: () => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md font-sans">
        <DialogHeader>
          <DialogTitle>{action} Application</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">{description}</p>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={action === "Reject" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (action === "Approve" ? "Approving..." : "Rejecting...") : action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_TO_STAGE: Record<string, number> = {
  not_completed: 1,
  under_review: 1,
  round_2_eligible: 2,
  round_2_project_selected: 2,
  round_2_under_review: 2,
  accepted: 3,
  rejected: 3,
};

export function StatusUpdateForm({
  currentStatus,
  currentDecisionSource,
  email,
  jwtToken,
}: {
  currentStatus: string;
  currentDecisionSource?: string;
  email: string;
  jwtToken: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [decisionSource, setDecisionSource] = useState(
    currentDecisionSource || "algorithm"
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleOverride = async (newStatus: OverrideStatus) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/updateApplicationStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          email,
          status: newStatus,
          currentStage: STATUS_TO_STAGE[newStatus],
          decisionStatus: newStatus,
          decisionSource: "admin_override",
          algorithmDecision: status,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error || "Failed to override decision");
        setMessage(json.error || "Failed to override decision");
        return;
      }

      setStatus(newStatus);
      setDecisionSource("admin_override");

      if (json.warning) {
        toast.warning(json.warning);
      }

      toast.success(
        `Decision overridden to ${formatStatus(
          newStatus
        )}. Source set to Admin Override.`
      );
      setMessage("Manual override applied successfully. Refreshing...");
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (error) {
      console.error(error);
      toast.error("Failed to override decision");
      setMessage("Failed to override decision");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-lg mx-auto px-10 pb-12">
      <div className="rounded-lg border bg-gray-50/30 p-6 font-sans">
        <h2 className="text-xl font-semibold">Manual Override Controls</h2>
        <p className="mt-1 text-sm text-gray-600">
          Override the automated decision for this applicant.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
          <p>
            <span className="font-medium">Decision Status:</span>{" "}
            {formatStatus(status)}
          </p>
          <p>
            <span className="font-medium">Decision Source:</span>{" "}
            {formatDecisionSource(decisionSource)}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ConfirmActionModal
            action="Approve"
            loading={loading}
            description="This will set the applicant status to Accepted, update stage status, and mark decision source as Admin Override."
            onConfirm={() => handleOverride("accepted")}
          >
            <Button type="button" disabled={loading}>
              Approve
            </Button>
          </ConfirmActionModal>

          <ConfirmActionModal
            action="Reject"
            loading={loading}
            description="This will set the applicant status to Rejected, update stage status, and mark decision source as Admin Override."
            onConfirm={() => handleOverride("rejected")}
          >
            <Button type="button" variant="destructive" disabled={loading}>
              Reject
            </Button>
          </ConfirmActionModal>
        </div>

        {message ? <p className="mt-4 text-sm text-gray-700">{message}</p> : null}
      </div>
    </div>
  );
}
