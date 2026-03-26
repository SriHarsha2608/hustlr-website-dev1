import React, { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Check, X, Pencil, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { FormFieldProp } from "../../lib/schemas/formSchema";

const HACKATHON_TYPES = ["International", "National", "Regional", "Local", "Online"];

const PLACEMENTS = [
  "Winner", "1st Runner Up", "2nd Runner Up",
  "Top 5", "Top 10", "Top 20",
  "Finalist", "Honorable Mention",
  "Best Use of Sponsor Tech", "Best Design",
  "Most Innovative", "People's Choice",
  "Participant"
];

const HACKATHON_ROLES = [
  "Lead", "Co-Lead", "Frontend Developer", "Backend Developer",
  "Full-Stack Developer", "ML Engineer", "Data Analyst",
  "Designer", "DevOps", "Contributor", "Solo Participant", "Other"
];

const TEAM_SIZES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];

const TECH_STACK_OPTIONS = [
  "C", "C++", "Java", "Python", "JavaScript", "TypeScript",
  "Go", "Rust", "Kotlin", "Swift", "PHP", "R",
  "Bash/Shell", "MATLAB", "Solidity", "React", "Next.js", "Vue",
  "Angular", "Svelte", "Tailwind CSS", "Material-UI", "Bootstrap", "Framer Motion",
  "SASS/SCSS", "Node.js", "Express", "NestJS", "Django", "Flask",
  "FastAPI", "Spring Boot", ".NET", "Rails", "GraphQL", "TensorFlow",
  "PyTorch", "Scikit-learn", "Pandas/NumPy", "OpenCV", "HuggingFace", "LangChain",
  "OpenAI API", "Keras", "NLTK", "PostgreSQL", "MySQL", "SQLite",
  "MongoDB", "Redis", "Firestore", "DynamoDB", "Supabase", "Elasticsearch",
  "Neo4j", "Docker", "Kubernetes", "GitHub Actions", "AWS", "GCP",
  "Azure", "Firebase", "Vercel", "Netlify", "Nginx", "React Native",
  "Flutter", "SwiftUI", "Jetpack Compose", "Expo", "Arduino", "ESP32",
  "Raspberry Pi", "STM32", "FPGA", "REST API", "Kafka", "RabbitMQ",
  "Figma", "Other",
];

interface HackathonFormData {
  name: string;
  projectName: string;
  description: string;
  placement: string;
  githubLink: string;
  type: string;
  teamSize: string;
  role: string;
  techStack: string[];
}

export function HackathonInput({ form }: { form: FormFieldProp }) {
  const hackathons = form.watch("hackathons") || [];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openTechPopover, setOpenTechPopover] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [hackathonForm, setHackathonForm] = useState<HackathonFormData>({
    name: "",
    projectName: "",
    description: "",
    placement: "",
    githubLink: "",
    type: "",
    teamSize: "",
    role: "",
    techStack: [],
  });

  const resetForm = () => {
    setHackathonForm({
      name: "",
      projectName: "",
      description: "",
      placement: "",
      githubLink: "",
      type: "",
      teamSize: "",
      role: "",
      techStack: [],
    });
    setEditingIndex(null);
  };

  const openDialog = (index: number | null = null) => {
    if (index !== null) {
      setHackathonForm(hackathons[index] as HackathonFormData);
      setEditingIndex(index);
    } else {
      resetForm();
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const saveHackathon = () => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!hackathonForm.name.trim()) errors.name = "Hackathon name is required";
    if (!hackathonForm.projectName.trim()) errors.projectName = "Project name is required";
    if (!hackathonForm.description.trim()) {
      errors.description = "Description is required";
    } else if (hackathonForm.description.trim().split(/\s+/).filter(Boolean).length > 500) {
      errors.description = "Description should not be more than 500 words";
    }
    if (!hackathonForm.placement) errors.placement = "Placement is required";
    if (!hackathonForm.type) errors.type = "Hackathon type is required";
    if (!hackathonForm.teamSize) errors.teamSize = "Team size is required";
    if (!hackathonForm.role) errors.role = "Your role is required";
    if (hackathonForm.techStack.length === 0) errors.techStack = "Add at least one technology";

    // Validate GitHub link
    if (!hackathonForm.githubLink.trim()) {
      errors.githubLink = "GitHub link is required";
    } else if (!hackathonForm.githubLink.startsWith("https://github.com/")) {
      errors.githubLink = "GitHub link must start with https://github.com/";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const currentHackathons = (form.getValues("hackathons") || []) as HackathonFormData[];

    if (editingIndex !== null) {
      const updated = [...currentHackathons];
      updated[editingIndex] = hackathonForm;
      form.setValue("hackathons", updated as any);
    } else {
      if (currentHackathons.length >= 3) return;
      form.setValue("hackathons", [...currentHackathons, hackathonForm] as any);
    }

    form.trigger("hackathons");
    setIsDialogOpen(false);
    resetForm();
  };

  const deleteHackathon = (index: number) => {
    const currentHackathons = form.getValues("hackathons") || [];
    form.setValue("hackathons", currentHackathons.filter((_: any, i: number) => i !== index));
    form.trigger("hackathons");
  };

  const toggleTech = (tech: string) => {
    setHackathonForm(prev => ({
      ...prev,
      techStack: prev.techStack.includes(tech)
        ? prev.techStack.filter(t => t !== tech)
        : [...prev.techStack, tech]
    }));
  };

  const removeTech = (tech: string) => {
    setHackathonForm(prev => ({
      ...prev,
      techStack: prev.techStack.filter(t => t !== tech)
    }));
  };

  return (
    <FormField
      control={form.control}
      name="hackathons"
      render={() => (
        <FormItem className="w-full max-w-2xl font-ovo">
          <div className="flex justify-between items-center mb-4">
            <FormLabel className="text-lg font-semibold text-gray-900">
              Hackathons <span className="text-xs font-medium" style={{ color: "#4d9a9a" }}>Add max 3 hackathons</span>
            </FormLabel>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {hackathons.length < 3 && (
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => openDialog()}
                    className="flex items-center gap-2 bg-accentBlue hover:bg-accentBlue/90 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add Hackathon ({hackathons.length}/3)
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingIndex !== null ? "Edit Hackathon" : "Add New Hackathon"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Hackathon Name + Type Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Hackathon Name</label>
                      <Input
                        value={hackathonForm.name}
                        onChange={(e) => setHackathonForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Megathon 2026"
                        className={cn("w-full", formErrors.name && "border-red-500")}
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                      <Select
                        value={hackathonForm.type}
                        onValueChange={(value) => setHackathonForm(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.type && "border-red-500")}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {HACKATHON_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.type && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.type}</p>
                      )}
                    </div>
                  </div>

                  {/* Project Name */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Project Built</label>
                    <Input
                      value={hackathonForm.projectName}
                      onChange={(e) => setHackathonForm(prev => ({ ...prev, projectName: e.target.value }))}
                      placeholder="e.g., MediScan — AI-powered health diagnostics"
                      className={cn("w-full", formErrors.projectName && "border-red-500")}
                    />
                    {formErrors.projectName && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.projectName}</p>
                    )}
                  </div>

                  {/* Placement, Team Size, Role Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Placement</label>
                      <Select
                        value={hackathonForm.placement}
                        onValueChange={(value) => setHackathonForm(prev => ({ ...prev, placement: value }))}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.placement && "border-red-500")}>
                          <SelectValue placeholder="Select placement" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLACEMENTS.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.placement && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.placement}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Team Size</label>
                      <Select
                        value={hackathonForm.teamSize}
                        onValueChange={(value) => setHackathonForm(prev => ({ ...prev, teamSize: value }))}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.teamSize && "border-red-500")}>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEAM_SIZES.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.teamSize && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.teamSize}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Your Role</label>
                      <Select
                        value={hackathonForm.role}
                        onValueChange={(value) => setHackathonForm(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.role && "border-red-500")}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {HACKATHON_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.role && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.role}</p>
                      )}
                    </div>
                  </div>

                  {/* Tech Stack - Searchable */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tech Stack</label>
                    <Popover open={openTechPopover} onOpenChange={setOpenTechPopover}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring", formErrors.techStack && "border-red-500")}
                        >
                          <span className="line-clamp-1">Select technologies</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 relative" align="start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 h-7 w-7 p-0 z-10 text-gray-500 hover:text-gray-900 bg-transparent hover:bg-gray-100 rounded-md"
                          onClick={() => setOpenTechPopover(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Command>
                          <CommandInput placeholder="Search technology..." />
                          <CommandList>
                            <CommandEmpty>No technology found.</CommandEmpty>
                            <CommandGroup>
                              {TECH_STACK_OPTIONS.map((tech) => (
                                <CommandItem
                                  key={tech}
                                  value={tech}
                                  onSelect={() => toggleTech(tech)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      hackathonForm.techStack.includes(tech) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {tech}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {hackathonForm.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hackathonForm.techStack.map((tech) => (
                          <div
                            key={tech}
                            className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"

                          >
                            {tech}
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-red-600"
                              onClick={() => removeTech(tech)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {formErrors.techStack && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.techStack}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                    <Textarea
                      value={hackathonForm.description}
                      onChange={(e) => {
                        setHackathonForm(prev => ({ ...prev, description: e.target.value }));
                        const wordCount = e.target.value.trim().split(/\s+/).filter(Boolean).length;
                        if (wordCount > 500) {
                          setFormErrors(prev => ({ ...prev, description: "Description should not be more than 500 words" }));
                        } else {
                          setFormErrors(prev => { const { description, ...rest } = prev; return rest; });
                        }
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      placeholder="What problem did you solve? What did you build? What was your contribution?"
                      className={cn("w-full min-h-[100px] resize-y whitespace-pre-wrap break-words", formErrors.description && "border-red-500")}
                      rows={4}
                    />
                    <p className={cn("text-xs mt-1 text-right", hackathonForm.description.trim().split(/\s+/).filter(Boolean).length > 500 ? "text-red-500" : "text-gray-400")}>
                      {hackathonForm.description.trim().split(/\s+/).filter(Boolean).length} / 500 words
                    </p>
                    {formErrors.description && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>
                    )}
                  </div>

                  {/* GitHub Link */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">GitHub Link</label>
                    <Input
                      value={hackathonForm.githubLink}
                      onChange={(e) => setHackathonForm(prev => ({ ...prev, githubLink: e.target.value }))}
                      placeholder="https://github.com/username/hackathon-project"
                      className={cn("w-full", formErrors.githubLink && "border-red-500")}
                    />
                    {formErrors.githubLink && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.githubLink}</p>
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
                  <Button type="button" onClick={saveHackathon} disabled={!!formErrors.description}>
                    {editingIndex !== null ? "Update Hackathon" : "Add Hackathon"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <FormControl>
            <div className="space-y-3">
              {hackathons.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No hackathons added yet. Click &quot;Add Hackathon&quot; to get started.
                </p>
              ) : (
                hackathons.map((hackathon: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* Row 1: Hackathon Name + Type badge + Placement badge + Edit/Delete */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate min-w-0">{hackathon.name}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: "#a1d7d7" }}>{hackathon.type}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "#f2d884", color: "#5a4b1a" }}> {hackathon.placement}</span>
                      </div>
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
                          onClick={() => deleteHackathon(index)}
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 h-8 w-8 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Row 2: Project Name + Role + Team Size */}
                    <div className="mb-2">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{hackathon.projectName}</span>
                        <span className="text-gray-500"> — {hackathon.role} • Team of {hackathon.teamSize}</span>
                      </p>
                    </div>

                    {/* Row 3: Tech Stack badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {hackathon.techStack?.map((tech: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-800"
                          style={{ backgroundColor: "#deecb2" }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

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
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        View on GitHub
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
