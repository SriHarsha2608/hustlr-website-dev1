import React, { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Pencil, ExternalLink, Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { FormFieldProp } from "../../lib/schemas/formSchema";

const PROGRAMS = [
  "None", "Google Summer of Code (GSoC)", "Linux Foundation Mentorship Program (LFX)",
  "MLH Fellowship", "Open Source Promotion Plan (OSPP)", "Google Season of Docs (GSoD)",
  "Outreachy", "Season of KDE", "Free Software Foundation (FSF) Internship",
  "Linux Kernel Mentorship Program", "Linux Foundation Networking (LFN) Mentorship", "GNOME Summer of Code",
  "Alibaba Summer of Code", "FOSSASIA Codeheat", "FOSSASIA Internship Program",
  "Open Summer of Code", "Open Mainframe Project Mentorship Program", "CNCF Mentoring Initiatives",
  "X.Org Endless Vacation of Code (EVoC)", "Hyperledger Mentorship Program", "Julia Seasons of Contributions (JSoC)",
  "Summer of Haskell", "24 Pull Requests", "Apache Software Foundation Mentorship",
  "Mozilla Open Source Support (MOSS)", "Chromium Open Source Program", "GitHub Externship",
  "GitLab Open Source Program", "Red Hat Open Source Contest", "OpenStack Outreachy & Mentorship",
  "Kubernetes Mentorship Program", "Tor Summer of Privacy", "Processing Foundation Fellowship",
  "R Project Google Summer of Code", "NumFOCUS Small Development Grants", "Eclipse Foundation Contributor Program",
  "Debian Long Term Support (LTS)", "FreeBSD Project Grants", "Creative Commons Open Source Internship",
  "Wikimedia Phabricator Internship", "Fedora Summer Coding", "Haiku Code-In",
  "GirlScript Summer of Code (GSSoC)", "Social Summer of Code (SSoC)", "Script Winter of Code (SWoC)",
  "DevIncept Contributor Program", "Cross Winter of Code (CWOC)", "Other",
];

const MONTHS_OPTIONS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "12+", "24+", "36+",
];

interface OpenSourceFormData {
  projectName: string;
  githubProfile: string;
  topPR1: string;
  topPR2: string;
  topPR3: string;
  programName: string;
  proofLink: string;
  impactPRLink: string;
  impactDescription: string;
  monthsContributing: string;
}

const EMPTY_FORM: OpenSourceFormData = {
  projectName: "",
  githubProfile: "",
  topPR1: "",
  topPR2: "",
  topPR3: "",
  programName: "",
  proofLink: "",
  impactPRLink: "",
  impactDescription: "",
  monthsContributing: "",

};

export function OpenSourceInput({ form }: { form: FormFieldProp }) {
  const openSourceEntries = ((form.watch as any)("openSource") || []) as OpenSourceFormData[];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [openProgramPopover, setOpenProgramPopover] = useState(false);

  const [osForm, setOsForm] = useState<OpenSourceFormData>({ ...EMPTY_FORM });

  const setField = <K extends keyof OpenSourceFormData>(field: K, value: OpenSourceFormData[K]) => {
    setOsForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const isValidGitHubPrLink = (value: string) =>
    value.startsWith("https://github.com/") && value.includes("/pull/");

  const resetForm = () => {
    setOsForm({ ...EMPTY_FORM });
    setEditingIndex(null);
  };

  const openDialog = (index: number | null = null) => {
    if (index !== null) {
      setOsForm(openSourceEntries[index]);
      setEditingIndex(index);
    } else {
      resetForm();
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const saveEntry = () => {
    const errors: Record<string, string> = {};

    if (!osForm.projectName.trim()) errors.projectName = "Project name is required";

    if (!osForm.githubProfile.trim()) {
      errors.githubProfile = "GitHub profile URL is required";
    } else if (!osForm.githubProfile.startsWith("https://github.com/")) {
      errors.githubProfile = "Must start with https://github.com/";
    }

    if (!osForm.programName) errors.programName = "Please select a program";

    if (!osForm.topPR1.trim()) {
      errors.topPR1 = "Merged PR #1 link is required";
    } else if (!isValidGitHubPrLink(osForm.topPR1)) {
      errors.topPR1 = "Must be a valid GitHub pull request link";
    }

    if (!osForm.topPR2.trim()) {
      errors.topPR2 = "Merged PR #2 link is required";
    } else if (!isValidGitHubPrLink(osForm.topPR2)) {
      errors.topPR2 = "Must be a valid GitHub pull request link";
    }

    if (!osForm.topPR3.trim()) {
      errors.topPR3 = "Merged PR #3 link is required";
    } else if (!isValidGitHubPrLink(osForm.topPR3)) {
      errors.topPR3 = "Must be a valid GitHub pull request link";
    }

    if (!osForm.impactPRLink.trim()) {
      errors.impactPRLink = "Impact PR link is required";
    } else if (!isValidGitHubPrLink(osForm.impactPRLink)) {
      errors.impactPRLink = "Must be a valid GitHub pull request link";
    }

    if (!osForm.impactDescription.trim()) {
      errors.impactDescription = "Impact description is required";
    } else if (osForm.impactDescription.trim().split(/\s+/).filter(Boolean).length > 500) {
      errors.impactDescription = "Description should not be more than 500 words";
    }

    if (!osForm.monthsContributing.trim()) {
      errors.monthsContributing = "Months of contribution is required";
    } else {
      const num = parseInt(osForm.monthsContributing);
      if (isNaN(num) || num < 1) errors.monthsContributing = "Must be at least 1 month";
    }

    // Check for duplicate PR links across the top 3 PRs
    const topPrLinks = [osForm.topPR1, osForm.topPR2, osForm.topPR3].filter(Boolean);
    const uniqueTopLinks = new Set(topPrLinks.map(l => l.trim().toLowerCase()));
    if (uniqueTopLinks.size < topPrLinks.length) {
      if (!errors.topPR1) errors.topPR1 = "Top 3 PR links must be unique";
      if (!errors.topPR2) errors.topPR2 = "Top 3 PR links must be unique";
      if (!errors.topPR3) errors.topPR3 = "Top 3 PR links must be unique";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const current = ((form.getValues as any)("openSource") || []) as OpenSourceFormData[];

    if (editingIndex !== null) {
      const updated = [...current];
      updated[editingIndex] = osForm;
      (form.setValue as any)("openSource", updated);
    } else {
      if (current.length >= 3) return;
      (form.setValue as any)("openSource", [...current, osForm]);
    }

    (form.trigger as any)("openSource");
    setIsDialogOpen(false);
    resetForm();
  };

  const deleteEntry = (index: number) => {
    const current = ((form.getValues as any)("openSource") || []) as OpenSourceFormData[];
    (form.setValue as any)("openSource", current.filter((_: any, i: number) => i !== index));
    (form.trigger as any)("openSource");
  };

  return (
    <FormField
      control={form.control}
      name={"openSource" as any}
      render={() => (
        <FormItem className="w-full max-w-2xl font-ovo">
          <div className="flex justify-between items-center mb-4">
            <FormLabel className="text-lg font-semibold text-gray-900">
              Open Source <span className="text-xs font-medium" style={{ color: "#4d9a9a" }}>Add max 3 contributions</span>
            </FormLabel>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {openSourceEntries.length < 3 && (
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => openDialog()}
                    className="flex items-center gap-2 bg-accentBlue hover:bg-accentBlue/90 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add Contribution ({openSourceEntries.length}/3)
                  </Button>
                </DialogTrigger>
              )}

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingIndex !== null ? "Edit Contribution" : "Add New Contribution"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Project Name & GitHub Profile Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Project Name</label>
                      <Input
                        value={osForm.projectName || ""}
                        onChange={(e) => setField("projectName", e.target.value)}
                        placeholder="e.g., React, Kubernetes..."
                        className={cn("w-full", formErrors.projectName && "border-red-500")}
                      />
                      {formErrors.projectName && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.projectName}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">GitHub Profile Link</label>
                      <Input
                        value={osForm.githubProfile}
                        onChange={(e) => setField("githubProfile", e.target.value)}
                        placeholder="https://github.com/username"
                        className={cn("w-full", formErrors.githubProfile && "border-red-500")}
                      />
                      {formErrors.githubProfile && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.githubProfile}</p>
                      )}
                    </div>
                  </div>

                  {/* Months Contributing */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Months Contributing</label>
                    <Select
                      value={osForm.monthsContributing}
                      onValueChange={(value) => setField("monthsContributing", value)}
                    >
                      <SelectTrigger className={cn("w-full md:w-1/2", formErrors.monthsContributing && "border-red-500")}>
                        <SelectValue placeholder="Select months" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_OPTIONS.map(m => (
                          <SelectItem key={m} value={m}>
                            {m} {m.includes("+") ? "months" : m === "1" ? "month" : "months"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.monthsContributing && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.monthsContributing}</p>
                    )}
                  </div>

                  {/* Top 3 Merged PR Links */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Top 3 Merged PR Links</label>
                    <div className="space-y-2">
                      {([1, 2, 3] as const).map((num) => {
                        const field = `topPR${num}` as keyof OpenSourceFormData;
                        return (
                          <div key={num}>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
                                style={{ backgroundColor: "#a1d7d7" }}
                              >
                                {num}
                              </span>
                              <Input
                                value={osForm[field]}
                                onChange={(e) => setField(field, e.target.value)}
                                placeholder="https://github.com/org/repo/pull/123"
                                className={cn("w-full", formErrors[field] && "border-red-500")}
                              />
                            </div>
                            {formErrors[field] && (
                              <p className="text-sm text-red-500 mt-1 ml-7">{formErrors[field]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Program + Proof Link Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Program Name</label>
                      <Popover open={openProgramPopover} onOpenChange={setOpenProgramPopover}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring",
                              osForm.programName ? "text-foreground" : "text-muted-foreground",
                              formErrors.programName && "border-red-500"
                            )}
                          >
                            <span className="line-clamp-1 text-left">{osForm.programName || "Search programs..."}</span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search program..." />
                            <CommandList>
                              <CommandEmpty>No program found.</CommandEmpty>
                              <CommandGroup>
                                {PROGRAMS.map((program) => (
                                  <CommandItem
                                    key={program}
                                    value={program}
                                    onSelect={() => {
                                      setOsForm((p) => ({
                                        ...p,
                                        programName: program,
                                        proofLink: program === "None" ? "" : p.proofLink,
                                      }));
                                      setFormErrors((prev) => {
                                        if (!prev.programName) return prev;
                                        const next = { ...prev };
                                        delete next.programName;
                                        return next;
                                      });
                                      setOpenProgramPopover(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        osForm.programName === program ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {program}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {formErrors.programName && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.programName}</p>
                      )}
                    </div>

                    {osForm.programName && osForm.programName !== "None" && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Official Proof Link</label>
                        <Input
                          value={osForm.proofLink}
                          onChange={(e) => setField("proofLink", e.target.value)}
                          placeholder="https://summerofcode.withgoogle.com/..."
                          className={cn("w-full", formErrors.proofLink && "border-red-500")}
                        />
                        {formErrors.proofLink && (
                          <p className="text-sm text-red-500 mt-1">{formErrors.proofLink}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Impact PR Link */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Biggest Impact PR Link</label>
                    <Input
                      value={osForm.impactPRLink}
                      onChange={(e) => setField("impactPRLink", e.target.value)}
                      placeholder="https://github.com/org/repo/pull/456"
                      className={cn("w-full", formErrors.impactPRLink && "border-red-500")}
                    />
                    {formErrors.impactPRLink && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.impactPRLink}</p>
                    )}
                  </div>

                  {/* Impact Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">What did you do &amp; why does it matter?</label>
                    <Textarea
                      value={osForm.impactDescription}
                      onChange={(e) => {
                        setField("impactDescription", e.target.value);
                        const wordCount = e.target.value.trim().split(/\s+/).filter(Boolean).length;
                        if (wordCount > 500) {
                          setFormErrors(prev => ({ ...prev, impactDescription: "Description should not be more than 500 words" }));
                        } else {
                          setFormErrors(prev => { const { impactDescription, ...rest } = prev; return rest; });
                        }
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      placeholder="e.g., Fixed a memory leak in the core rendering engine that improved performance by 40% for 50k+ users..."
                      className={cn("w-full min-h-[100px] resize-y whitespace-pre-wrap break-words", formErrors.impactDescription && "border-red-500")}
                      rows={4}
                    />
                    <p className={cn("text-xs mt-1 text-right", osForm.impactDescription.trim().split(/\s+/).filter(Boolean).length > 500 ? "text-red-500" : "text-gray-400")}>
                      {osForm.impactDescription.trim().split(/\s+/).filter(Boolean).length} / 500 words
                    </p>
                    {formErrors.impactDescription && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.impactDescription}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={saveEntry} disabled={!!formErrors.impactDescription}>
                    {editingIndex !== null ? "Update Contribution" : "Add Contribution"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <FormControl>
            <div className="space-y-3">
              {openSourceEntries.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No contributions added yet. Click &quot;Add Contribution&quot; to get started.
                </p>
              ) : (
                openSourceEntries.map((entry: OpenSourceFormData, index: number) => {
                  const monthsLabel = entry.monthsContributing
                    ? entry.monthsContributing.includes("+")
                      ? `${entry.monthsContributing.replace('+', '')}+ months`
                      : entry.monthsContributing === "1"
                        ? "1 month"
                        : `${entry.monthsContributing} months`
                    : "";

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      {/* Header Row */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                          <h3 className="font-semibold text-gray-700 truncate min-w-0">
                            {entry.githubProfile.replace("https://github.com/", "").replace(/\/$/, "") || "GitHub Profile"}
                          </h3>
                          {entry.programName && entry.programName !== "None" && (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: "#f2d884", color: "#5a4b1a" }}
                            >
                              {entry.programName}
                            </span>
                          )}
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0"
                            style={{ backgroundColor: "#a1d7d7" }}
                          >
                            {monthsLabel}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(index)}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 h-8 w-8 rounded-md transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEntry(index)}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 h-8 w-8 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {entry.projectName && (
                        <h2 className="font-bold text-lg text-gray-900 mb-1 truncate">{entry.projectName}</h2>
                      )}

                      <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">
                        {entry.impactDescription}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {[entry.topPR1, entry.topPR2, entry.topPR3].map((pr, i) =>
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
                        {entry.impactPRLink && (
                          <a
                            href={entry.impactPRLink}
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

                      {entry.githubProfile && (
                        <a
                          href={entry.githubProfile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-700 hover:underline flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                          View Github Profile
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
