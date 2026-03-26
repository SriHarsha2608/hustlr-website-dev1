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

const SKILLS_OPTIONS = [
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

const EMPLOYMENT_TYPES = ["Part time", "Internship", "Freelancing", "Self Employed", "Apprenticeship"];

interface ExperienceFormData {
  title: string;
  employmentType: string;
  company: string;
  description: string;
  skills: string[];
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
}

export function ExperienceInput({ form }: { form: FormFieldProp }) {
  const experiences = form.watch("experiences") || [];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openSkillsPopover, setOpenSkillsPopover] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [experienceForm, setExperienceForm] = useState<ExperienceFormData>({
    title: "",
    employmentType: "",
    company: "",
    description: "",
    skills: [],
    startMonth: "",
    startYear: "",
    endMonth: "",
    endYear: ""
  });

  const resetForm = () => {
    setExperienceForm({
      title: "",
      employmentType: "",
      company: "",
      description: "",
      skills: [],
      startMonth: "",
      startYear: "",
      endMonth: "",
      endYear: ""
    });
    setEditingIndex(null);
  };

  const openDialog = (index: number | null = null) => {
    if (index !== null) {
      setExperienceForm(experiences[index] as ExperienceFormData);
      setEditingIndex(index);
    } else {
      resetForm();
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const saveExperience = () => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!experienceForm.title.trim()) errors.title = "Title is required";
    if (!experienceForm.employmentType) errors.employmentType = "Employment type is required";
    if (!experienceForm.company.trim()) errors.company = "Company is required";
    if (!experienceForm.description.trim()) {
      errors.description = "Description is required";
    } else if (experienceForm.description.trim().split(/\s+/).filter(Boolean).length > 500) {
      errors.description = "Description should not be more than 500 words";
    }
    if (experienceForm.skills.length === 0) errors.skills = "Add at least one skill";
    if (!experienceForm.startMonth) errors.startMonth = "Start month is required";
    if (!experienceForm.startYear) errors.startYear = "Start year is required";
    if (!experienceForm.endMonth) errors.endMonth = "End month is required";
    if (!experienceForm.endYear) errors.endYear = "End year is required";

    // Validate start date <= end date
    if (experienceForm.startYear && experienceForm.endYear) {
      const startYearNum = parseInt(experienceForm.startYear);
      const endYearNum = parseInt(experienceForm.endYear);
      if (startYearNum > endYearNum) {
        errors.date = "Start year must be less than or equal to end year";
      } else if (startYearNum === endYearNum && experienceForm.startMonth && experienceForm.endMonth) {
        const startMonthIdx = MONTHS.indexOf(experienceForm.startMonth);
        const endMonthIdx = MONTHS.indexOf(experienceForm.endMonth);
        if (startMonthIdx > endMonthIdx) {
          errors.date = "Start month must be before or same as end month";
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const currentExperiences = (form.getValues("experiences") || []) as ExperienceFormData[];

    if (editingIndex !== null) {
      const updated = [...currentExperiences];
      updated[editingIndex] = experienceForm;
      form.setValue("experiences", updated as any);
    } else {
      if (currentExperiences.length >= 3) return;
      form.setValue("experiences", [...currentExperiences, experienceForm] as any);
    }

    form.trigger("experiences");
    setIsDialogOpen(false);
    resetForm();
  };

  const deleteExperience = (index: number) => {
    const currentExperiences = form.getValues("experiences") || [];
    form.setValue("experiences", currentExperiences.filter((_: any, i: number) => i !== index));
    form.trigger("experiences");
  };

  const toggleSkill = (skill: string) => {
    setExperienceForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const removeSkill = (skill: string) => {
    setExperienceForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => (currentYear - i).toString());

  return (
    <FormField
      control={form.control}
      name="experiences"
      render={() => (
        <FormItem className="w-full max-w-2xl font-ovo">
          <div className="flex justify-between items-center mb-4">
            <FormLabel className="text-lg font-semibold text-gray-900">
              Experience <span className="text-xs font-medium" style={{ color: "#4d9a9a" }}>Add max 3 experiences</span>
            </FormLabel>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {experiences.length < 3 && (
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => openDialog()}
                    className="flex items-center gap-2 bg-accentBlue hover:bg-accentBlue/90 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add Experience ({experiences.length}/3)
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingIndex !== null ? "Edit Experience" : "Add New Experience"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Title - Full Width */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                    <Input
                      value={experienceForm.title}
                      onChange={(e) => setExperienceForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Software Developer"
                      className={cn("w-full", formErrors.title && "border-red-500")}
                    />
                    {formErrors.title && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
                    )}
                  </div>

                  {/* Employment Type and Company Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Employment Type</label>
                      <Select
                        value={experienceForm.employmentType}
                        onValueChange={(value) => setExperienceForm(prev => ({ ...prev, employmentType: value }))}
                      >
                        <SelectTrigger className={cn("w-full", formErrors.employmentType && "border-red-500")}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.employmentType && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.employmentType}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Company or Organization</label>
                      <Input
                        value={experienceForm.company}
                        onChange={(e) => setExperienceForm(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="e.g., Tech Solutions Inc."
                        className={cn("w-full", formErrors.company && "border-red-500")}
                      />
                      {formErrors.company && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.company}</p>
                      )}
                    </div>
                  </div>
                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                    <Textarea
                      value={experienceForm.description}
                      onChange={(e) => {
                        setExperienceForm(prev => ({ ...prev, description: e.target.value }));
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
                      placeholder="Describe your experience, your role, and key achievements..."
                      className={cn("w-full min-h-[100px] resize-y whitespace-pre-wrap break-words", formErrors.description && "border-red-500")}
                      rows={4}
                    />
                    <p className={cn("text-xs mt-1 text-right", experienceForm.description.trim().split(/\s+/).filter(Boolean).length > 500 ? "text-red-500" : "text-gray-400")}>
                      {experienceForm.description.trim().split(/\s+/).filter(Boolean).length} / 500 words
                    </p>
                    {formErrors.description && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>
                    )}
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Skills</label>
                    <Popover open={openSkillsPopover} onOpenChange={setOpenSkillsPopover}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring", formErrors.skills && "border-red-500")}
                        >
                          <span className="line-clamp-1">Select skills</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 relative" align="start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 h-7 w-7 p-0 z-10 text-gray-500 hover:text-gray-900 bg-transparent hover:bg-gray-100 rounded-md"
                          onClick={() => setOpenSkillsPopover(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Command>
                          <CommandInput placeholder="Search skill..." />
                          <CommandList>
                            <CommandEmpty>No skill found.</CommandEmpty>
                            <CommandGroup>
                              {SKILLS_OPTIONS.map((skill) => (
                                <CommandItem
                                  key={skill}
                                  value={skill}
                                  onSelect={() => toggleSkill(skill)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      experienceForm.skills.includes(skill) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {skill}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected Skills */}
                    {experienceForm.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {experienceForm.skills.map((skill) => (
                          <div
                            key={skill}
                            className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            {skill}
                            <X
                              className="w-3 h-3 cursor-pointer hover:text-red-600"
                              onClick={() => removeSkill(skill)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {formErrors.skills && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.skills}</p>
                    )}
                  </div>

                  {/* Start Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Start Month</label>
                      <Select
                        value={experienceForm.startMonth}
                        onValueChange={(value) => setExperienceForm(prev => ({ ...prev, startMonth: value }))}
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
                        value={experienceForm.startYear}
                        onValueChange={(value) => setExperienceForm(prev => ({ ...prev, startYear: value }))}
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
                        value={experienceForm.endMonth}
                        onValueChange={(value) => setExperienceForm(prev => ({ ...prev, endMonth: value }))}
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
                        value={experienceForm.endYear}
                        onValueChange={(value) => setExperienceForm(prev => ({ ...prev, endYear: value }))}
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
                  <Button type="button" onClick={saveExperience} disabled={!!formErrors.description}>
                    {editingIndex !== null ? "Update Experience" : "Add Experience"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <FormControl>
            <div className="space-y-3">
              {experiences.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No experiences added yet. Click &quot;Add Experience&quot; to get started.
                </p>
              ) : (
                experiences.map((experience: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >

                    {/* Top Row: Title, Employment Type + Actions */}
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{experience.title}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: "#a1d7d7" }}>
                          {experience.employmentType}
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-4">
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
                          onClick={() => deleteExperience(index)}
                          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 h-8 w-8 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Company Row */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">{experience.company}</p>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {experience.skills.map((skill: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-xs text-gray-800" style={{ backgroundColor: "#deecb2" }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 whitespace-pre-wrap break-words mb-3">
                      {experience.description}
                    </p>

                    {/* Timeline */}
                    <p className="text-xs font-medium text-gray-500 pt-2 border-gray-200">
                      {experience.startMonth} {experience.startYear} - {experience.endMonth} {experience.endYear}
                    </p>
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
