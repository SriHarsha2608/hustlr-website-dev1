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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const PROJECT_TYPES = ["Course", "Personal", "Internship", "Freelance", "Hackathon"];

const PROJECT_CATEGORIES = [
  "AI / Machine Learning", "Data Science / Analytics", "Backend Engineering",
  "Frontend Engineering", "Full-Stack Engineering", "Systems Programming",
  "Distributed Systems", "Cloud / Platform Engineering", "DevOps / Infrastructure",
  "Cybersecurity", "SaaS", "Web Application", "Mobile Application",
  "Desktop Application", "APIs / SDKs", "Developer Tools",
  "Automation / Scripting", "Internal Tools", "Startup / MVP",
  "NLP", "Computer Vision", "Recommender Systems", "Time-Series",
  "Generative AI", "MLOps", "IoT", "Embedded Systems", "Robotics",
  "ECE / Hardware-Software", "Edge Computing", "UI / UX Design",
  "Product Design", "Visualization", "Game Development", "AR / VR"
];

const PROJECT_ROLES = [
  "Lead", "Co-Lead", "Frontend Developer", "Backend Developer",
  "Full-Stack Developer", "ML Engineer", "Data Analyst",
  "Designer", "DevOps", "Contributor", "Solo Developer", "Other"
];

interface ProjectFormData {
  title: string;
  type: string;
  members: string;
  role: string;
  description: string;
  techStack: string[];
  projectCategory: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  githubLink: string;
}

export function ProjectsInput({ form }: { form: FormFieldProp }) {
  const projects = form.watch("projects") || [];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openTechPopover, setOpenTechPopover] = useState(false);
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [projectForm, setProjectForm] = useState<ProjectFormData>({
    title: "",
    type: "",
    members: "",
    role: "",
    description: "",
    techStack: [],
    projectCategory: "",
    startMonth: "",
    startYear: "",
    endMonth: "",
    endYear: "",
    githubLink: ""
  });

  const resetForm = () => {
    setProjectForm({
      title: "",
      type: "",
      members: "",
      role: "",
      description: "",
      techStack: [],
      projectCategory: "",
      startMonth: "",
      startYear: "",
      endMonth: "",
      endYear: "",
      githubLink: ""
    });
    setEditingIndex(null);
  };

  const openDialog = (index: number | null = null) => {
    if (index !== null) {
      setProjectForm(projects[index] as ProjectFormData);
      setEditingIndex(index);
    } else {
      resetForm();
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const saveProject = () => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!projectForm.title.trim()) errors.title = "Project title is required";
    if (!projectForm.type) errors.type = "Project type is required";
    if (!projectForm.members) errors.members = "Members is required";
    if (!projectForm.role) errors.role = "Your role is required";
    if (!projectForm.description.trim()) {
      errors.description = "Description is required";
    } else if (projectForm.description.trim().split(/\s+/).filter(Boolean).length > 500) {
      errors.description = "Description should not be more than 500 words";
    }
    if (projectForm.techStack.length === 0) errors.techStack = "Add at least one technology";
    if (!projectForm.projectCategory) errors.projectCategory = "Project category is required";
    if (!projectForm.startMonth) errors.startMonth = "Start month is required";
    if (!projectForm.startYear) errors.startYear = "Start year is required";
    if (!projectForm.endMonth) errors.endMonth = "End month is required";
    if (!projectForm.endYear) errors.endYear = "End year is required";

    // Validate start date <= end date
    if (projectForm.startYear && projectForm.endYear) {
      const startYearNum = parseInt(projectForm.startYear);
      const endYearNum = parseInt(projectForm.endYear);
      if (startYearNum > endYearNum) {
        errors.date = "Start year must be less than or equal to end year";
      } else if (startYearNum === endYearNum && projectForm.startMonth && projectForm.endMonth) {
        const startMonthIdx = MONTHS.indexOf(projectForm.startMonth);
        const endMonthIdx = MONTHS.indexOf(projectForm.endMonth);
        if (startMonthIdx > endMonthIdx) {
          errors.date = "Start month must be before or same as end month";
        }
      }
    }

    // Validate end date is not in the future
    if (projectForm.endYear && projectForm.endMonth) {
      const now = new Date();
      const endYearNum = parseInt(projectForm.endYear);
      const endMonthIdx = MONTHS.indexOf(projectForm.endMonth);
      if (endYearNum > now.getFullYear() || (endYearNum === now.getFullYear() && endMonthIdx > now.getMonth())) {
        errors.date = "End date cannot be in the future";
      }
    }

    // Validate GitHub link
    if (!projectForm.githubLink.trim()) {
      errors.githubLink = "GitHub link is required";
    } else if (!projectForm.githubLink.startsWith("https://github.com/")) {
      errors.githubLink = "GitHub link must start with https://github.com/";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const currentProjects = (form.getValues("projects") || []) as ProjectFormData[];

    if (editingIndex !== null) {
      const updated = [...currentProjects];
      updated[editingIndex] = projectForm;
      form.setValue("projects", updated as any);
    } else {
      if (currentProjects.length >= 5) return;
      form.setValue("projects", [...currentProjects, projectForm] as any);
    }

    form.trigger("projects");
    setIsDialogOpen(false);
    resetForm();
  };

  const deleteProject = (index: number) => {
    const currentProjects = form.getValues("projects") || [];
    form.setValue("projects", currentProjects.filter((_, i) => i !== index));
    form.trigger("projects");
  };

  const toggleTech = (tech: string) => {
    setProjectForm(prev => ({
      ...prev,
      techStack: prev.techStack.includes(tech)
        ? prev.techStack.filter(t => t !== tech)
        : [...prev.techStack, tech]
    }));
  };

  const removeTech = (tech: string) => {
    setProjectForm(prev => ({
      ...prev,
      techStack: prev.techStack.filter(t => t !== tech)
    }));
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => (currentYear - i).toString());

  return (
    <FormField
      control={form.control}
      name="projects"
      render={() => (
        <FormItem className="w-full max-w-2xl font-ovo">
          <div className="flex justify-between items-center mb-4">
            <FormLabel className="text-lg font-semibold text-gray-900">
              Projects <span className="text-xs font-medium" style={{ color: "#4d9a9a" }}>Add max 5 projects</span>
            </FormLabel>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {projects.length < 5 && (
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => openDialog()}
                    className="flex items-center gap-2 bg-accentBlue hover:bg-accentBlue/90 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add Project ({projects.length}/5)
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingIndex !== null ? "Edit Project" : "Add New Project"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Title - Full Width */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Project Title</label>
                    <Input
                      value={projectForm.title}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., E-commerce Platform"
                      className={cn("w-full", formErrors.title && "border-red-500")}
                    />
                    {formErrors.title && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
                    )}
                  </div>

                  {/* Type, Members, and Role Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Project Type</label>
                      <Select
                        value={projectForm.type}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.type && "border-red-500")}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.type && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Members</label>
                      <Select
                        value={projectForm.members}
                        onValueChange={(value) => {
                          setProjectForm(prev => ({
                            ...prev,
                            members: value,
                            role: value === "Solo" ? "Solo Developer" : prev.role === "Solo Developer" ? "" : prev.role,
                          }));
                        }}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.members && "border-red-500")}>
                          <SelectValue placeholder="Select members type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Solo">Solo</SelectItem>
                          <SelectItem value="Group">Group</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.members && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.members}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Your Role</label>
                      <Select
                        value={projectForm.role}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, role: value }))}
                        disabled={projectForm.members === "Solo"}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.role && "border-red-500")}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_ROLES.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.role && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.role}</p>
                      )}
                    </div>
                  </div>
                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                    <Textarea
                      value={projectForm.description}
                      onChange={(e) => {
                        setProjectForm(prev => ({ ...prev, description: e.target.value }));
                        const wordCount = e.target.value.trim().split(/\s+/).filter(Boolean).length;
                        if (wordCount > 500) {
                          setFormErrors(prev => ({ ...prev, description: "Description should not be more than 500 words" }));
                        } else {
                          setFormErrors(prev => { const { description, ...rest } = prev; return rest; });
                        }
                        // Auto-resize
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      placeholder="Describe your project, your role, and key achievements..."
                      className={cn("w-full min-h-[100px] resize-y whitespace-pre-wrap break-words", formErrors.description && "border-red-500")}
                      rows={4}
                    />
                    <p className={cn("text-xs mt-1 text-right", projectForm.description.trim().split(/\s+/).filter(Boolean).length > 500 ? "text-red-500" : "text-gray-400")}>
                      {projectForm.description.trim().split(/\s+/).filter(Boolean).length} / 500 words
                    </p>
                    {formErrors.description && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>
                    )}
                  </div>

                  {/* Tech Stack */}
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
                                      projectForm.techStack.includes(tech) ? "opacity-100" : "opacity-0"
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

                    {/* Selected Tech Stack */}
                    {projectForm.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {projectForm.techStack.map((tech) => (
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

                  {/* Project Category */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Project Category</label>
                    <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring", formErrors.projectCategory && "border-red-500")}
                        >
                          <span className={cn("line-clamp-1", !projectForm.projectCategory && "text-muted-foreground")}>
                            {projectForm.projectCategory || "Select category"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search category..." />
                          <CommandList>
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                              {PROJECT_CATEGORIES.map((cat) => (
                                <CommandItem
                                  key={cat}
                                  value={cat}
                                  onSelect={() => {
                                    setProjectForm(prev => ({ ...prev, projectCategory: cat }));
                                    setOpenCategoryPopover(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      projectForm.projectCategory === cat ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {cat}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {formErrors.projectCategory && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.projectCategory}</p>
                    )}
                  </div>

                  {/* Start Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Start Month</label>
                      <Select
                        value={projectForm.startMonth}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, startMonth: value }))}
                      >
                        <SelectTrigger className={cn(formErrors.startMonth && "border-red-500")}>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(month => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.startMonth && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.startMonth}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Start Year</label>
                      <Select
                        value={projectForm.startYear}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, startYear: value }))}
                      >
                        <SelectTrigger className={cn(formErrors.startYear && "border-red-500")}>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.startYear && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.startYear}</p>
                      )}
                    </div>
                  </div>

                  {/* End Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">End Month</label>
                      <Select
                        value={projectForm.endMonth}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, endMonth: value }))}
                      >
                        <SelectTrigger className={cn(formErrors.endMonth && "border-red-500")}>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(month => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.endMonth && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.endMonth}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">End Year</label>
                      <Select
                        value={projectForm.endYear}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, endYear: value }))}
                      >
                        <SelectTrigger className={cn(formErrors.endYear && "border-red-500")}>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.endYear && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.endYear}</p>
                      )}
                    </div>
                  </div>
                  {formErrors.date && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.date}</p>
                  )}

                  {/* GitHub Link */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">GitHub Link</label>
                    <Input
                      value={projectForm.githubLink}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, githubLink: e.target.value }))}
                      placeholder="https://github.com/username/project"
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
                  <Button type="button" onClick={saveProject} disabled={!!formErrors.description}>
                    {editingIndex !== null ? "Update Project" : "Add Project"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <FormControl>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No projects added yet. Click "Add Project" to get started.
                </p>
              ) : (
                projects.map((project: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* 1st Row: Title - Type - Members with Edit/Delete buttons */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate min-w-0">{project.title}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: "#a1d7d7" }}>{project.type}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: "#a1d7d7" }}>{project.members}</span>
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
                          onClick={() => deleteProject(index)}
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 h-8 w-8 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 2nd Row: Tech Stack */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.techStack.map((tech: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-800" style={{ backgroundColor: "#deecb2" }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* 3rd Row: Description */}
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap break-words">{project.description}</p>

                    {/* 4th Row: Timing */}
                    <p className="text-xs text-gray-500 mb-2">
                      {project.startMonth} {project.startYear} - {project.endMonth} {project.endYear}
                    </p>

                    {/* 5th Row: GitHub Link */}
                    {project.githubLink && (
                      <a
                        href={project.githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-black-600 hover:underline flex items-center gap-1"
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
