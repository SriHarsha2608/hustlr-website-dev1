import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SCORING_CONFIG,
  ScoringAlgorithmConfig,
  ScoringFactor,
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
  const [config, setConfig] = useState<ScoringAlgorithmConfig>(
    DEFAULT_SCORING_CONFIG
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/algorithm-config", {
          headers: { Authorization: `Bearer ${jwtToken}` },
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load algorithm config");
        }
        if (!isMounted) return;
        setConfig(json.config || DEFAULT_SCORING_CONFIG);
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
        (sum: number, factor: ScoringFactor) => sum + Number(factor.weight || 0),
        0
      ),
    [config.factors]
  );

  const updateFactorWeight = (key: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      factors: prev.factors.map((factor) =>
        factor.key === key
          ? { ...factor, weight: Number.isFinite(value) ? Math.round(value) : 0 }
          : factor
      ),
    }));
  };

  const applyChanges = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/algorithm-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          threshold: config.threshold,
          factors: config.factors.map((factor) => ({
            key: factor.key,
            weight: Math.round(Number(factor.weight)),
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to update algorithm config");
      }
      setConfig(json.config || config);
      toast.success("Scoring config updated. Re-score applicants to apply weight changes.");
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
            Scoring Algorithm Weights
          </h2>
          <p className="text-xs text-[#747474] mt-1">
            Adjust category weights (whole numbers). Re-score applicants after
            saving to apply changes.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#747474]">Loading scoring config...</p>
      ) : (
        <div className="space-y-3">
          {/* Threshold input */}
          <div className="grid gap-2 rounded-md border border-[#dfdfdf] bg-white p-3 sm:grid-cols-[1fr_120px]">
            <div>
              <p className="text-sm font-medium text-[#1f1f1f]">
                Pass Threshold
              </p>
              <p className="text-xs text-[#757575]">
                Minimum score (0–100%) an applicant needs to pass Stage 1
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[#666]">
                Threshold %
              </p>
              <Input
                type="number"
                step="1"
                min={0}
                max={100}
                value={config.threshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setConfig((prev) => ({
                    ...prev,
                    threshold: Number.isFinite(val)
                      ? Math.max(0, Math.min(100, Math.round(val)))
                      : 0,
                  }));
                }}
                className="h-9 bg-white text-sm"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e5e5e5]" />

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
                  step="1"
                  min={0}
                  max={200}
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
              totalWeight > 0
                ? "text-emerald-700 font-semibold"
                : "text-amber-700 font-semibold"
            }
          >
            {totalWeight}
          </span>
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfig(DEFAULT_SCORING_CONFIG)}
            disabled={saving || loading}
            className="text-sm"
          >
            Set to Default
          </Button>
          <Button
            type="button"
            onClick={applyChanges}
            disabled={saving || loading || totalWeight <= 0}
            className="text-sm"
          >
            {saving ? "Applying..." : "Apply Changes"}
          </Button>
        </div>
      </div>
    </section>
  );
}
