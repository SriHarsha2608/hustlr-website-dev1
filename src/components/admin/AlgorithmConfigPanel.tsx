import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_RESUME_SCREENING_CONFIG,
  ResumeScreeningConfig,
  ScreeningFactor,
} from "@/src/lib/algorithmConfig";
import { toast } from "sonner";

export default function AlgorithmConfigPanel({
  jwtToken,
  isOpen,
  onThresholdChange,
}: {
  jwtToken: string;
  isOpen: boolean;
  onThresholdChange?: (value: number) => void;
}) {
  const [config, setConfig] = useState<ResumeScreeningConfig>(
    DEFAULT_RESUME_SCREENING_CONFIG
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadConfig = async () => {
      setLoading(true);
      setWarning(null);
      try {
        const response = await fetch("/api/admin/algorithm-config", {
          headers: { Authorization: `Bearer ${jwtToken}` },
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load algorithm config");
        }
        if (!isMounted) return;
        setConfig(json.config || DEFAULT_RESUME_SCREENING_CONFIG);
        if (json.warning) {
          setWarning(json.warning);
          toast.warning(json.warning);
        }
      } catch (error: any) {
        if (!isMounted) return;
        toast.error(error?.message || "Failed to load algorithm config");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [isOpen, jwtToken]);

  const totalWeight = useMemo(
    () =>
      config.factors.reduce(
        (sum: number, factor: ScreeningFactor) => sum + Number(factor.weight || 0),
        0
      ),
    [config.factors]
  );

  const updateFactorWeight = (key: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      factors: prev.factors.map((factor) =>
        factor.key === key
          ? { ...factor, weight: Number.isFinite(value) ? value : 0 }
          : factor
      ),
    }));
  };

  const applyChanges = async () => {
    setSaving(true);
    setWarning(null);
    try {
      const response = await fetch("/api/admin/algorithm-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          threshold: Number(config.threshold),
          factors: config.factors.map((factor) => ({
            ...factor,
            weight: Number(factor.weight),
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to update algorithm config");
      }
      setConfig(json.config || config);
      if (json.warning) {
        setWarning(json.warning);
        toast.warning(json.warning);
      } else {
        toast.success("Algorithm config updated successfully.");
      }
      if (onThresholdChange && typeof json.config?.threshold === "number") {
        onThresholdChange(json.config.threshold);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update algorithm config");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <section className="rounded-[12px] border border-[#d2d2d2] bg-[#f7f7f7] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-[#2f2f2f]">
            Resume Screening Algorithm
          </h2>
          <p className="text-xs text-[#747474] mt-1">
            Changes apply only to future applicants. Existing records are not
            auto-updated.
          </p>
          {warning ? (
            <p className="mt-1 text-xs text-amber-700">{warning}</p>
          ) : null}
        </div>

        <div className="min-w-[220px]">
          <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[#666]">
            Resume Screening Threshold
          </p>
          <Input
            type="number"
            min={0}
            max={100}
            value={config.threshold}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                threshold: Math.max(
                  0,
                  Math.min(100, Number(e.target.value || prev.threshold))
                ),
              }))
            }
            className="h-9 bg-white text-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#747474]">Loading algorithm factors...</p>
      ) : (
        <div className="space-y-3">
          {config.factors.map((factor) => (
            <div
              key={factor.key}
              className="grid gap-2 rounded-md border border-[#dfdfdf] bg-white p-3 sm:grid-cols-[1fr_120px]"
            >
              <div>
                <p className="text-sm font-medium text-[#1f1f1f]">
                  {factor.label}
                </p>
                <p className="text-xs text-[#757575]">{factor.description}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[#666]">
                  Weight
                </p>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={factor.weight}
                  onChange={(e) =>
                    updateFactorWeight(
                      factor.key,
                      Number.isFinite(Number(e.target.value))
                        ? Number(e.target.value)
                        : 0
                    )
                  }
                  className="h-9 bg-white text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#666]">
          Total Weight:{" "}
          <span
            className={
              Math.abs(totalWeight - 1) < 0.001
                ? "text-emerald-700 font-semibold"
                : "text-amber-700 font-semibold"
            }
          >
            {totalWeight.toFixed(2)}
          </span>
        </p>
        <Button
          type="button"
          onClick={applyChanges}
          disabled={saving || loading}
          className="text-sm"
        >
          {saving ? "Applying..." : "Apply Changes"}
        </Button>
      </div>
    </section>
  );
}
