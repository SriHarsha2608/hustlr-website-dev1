import React, { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Plus, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { FormFieldProp } from "../../lib/schemas/formSchema";
import { toast } from "sonner";



// Define your preloaded skills here
const PREDEFINED_SKILLS = [
  "Node.js", "React", "TypeScript", "Python", "Docker",
  "Tailwind CSS", "Next.js", "PostgreSQL", "AWS", "UI/UX Design"
];



export function SkillsProficiencyInput({ form }: { form: FormFieldProp }) {
  const skills = form.watch("skills") || [];
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});

  const addSkill = () => {
    const currentSkills = form.getValues("skills") || [];
    if (currentSkills.length >= 10) return;
    form.setValue("skills", [...currentSkills, { skill: "", proficiency: "Beginner" as const }]);
  };

  const removeSkill = (index: number) => {
    const currentSkills = form.getValues("skills") || [];
    form.setValue("skills", currentSkills.filter((_, i) => i !== index));
    form.trigger("skills");
  };

  const updateSkill = (index: number, field: "skill" | "proficiency", value: string) => {
    const currentSkills = form.getValues("skills") || [];

    // Prevent duplicate skill names
    if (field === "skill") {
      const isDuplicate = currentSkills.some(
        (s, i) => i !== index && s.skill.toLowerCase() === value.toLowerCase()
      );
      if (isDuplicate) {
        toast.error(`"${value}" is already added`);
        setOpenPopovers(prev => ({ ...prev, [index]: false }));
        return;
      }
    }

    const updated = [...currentSkills];
    updated[index] = { ...updated[index], [field]: value };
    form.setValue("skills", updated);
    form.trigger("skills");

    // Close the popover after selecting the skill
    if (field === "skill") {
      setOpenPopovers(prev => ({ ...prev, [index]: false }));
    }
  };

  return (
    <FormField
      control={form.control}
      name="skills"
      render={() => (
        <FormItem className="w-full max-w-2xl font-ovo">
          <FormLabel className="text-lg font-semibold text-gray-900">
            Skills <span className="text-xs font-medium " style={{ color: "#4d9a9a" }}>Add max 10 skills</span>
          </FormLabel>
          <FormControl>
            <div className="space-y-3 mt-4">
              {skills.map((skillItem: any, index: number) => (
                <div key={index} className="flex items-center gap-4">
                  {/* Skill Selection (Combobox) */}
                  <div className="flex items-center bg-[#F1F3F5] rounded-lg p-1 pr-2 min-w-[240px]">
                    <Popover
                      open={openPopovers[index] || false}
                      onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, [index]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          role="combobox"
                          className={cn(
                            "flex items-center justify-between h-9 px-3 rounded-md gap-2 transition-colors",
                            skillItem.skill
                              ? "bg-[#5FB3B3] text-white hover:bg-[#4d9a9a] hover:text-white"
                              : "bg-transparent text-gray-500"
                          )}
                        >
                          {skillItem.skill || "Select Skill"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[240px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search skill..." />
                          <CommandList>
                            <CommandEmpty>No skill found.</CommandEmpty>
                            <CommandGroup>
                              {PREDEFINED_SKILLS
                                .filter((skill) => {
                                  // Hide skills already added in other rows
                                  const selectedSkills = (form.getValues("skills") || [])
                                    .filter((_: any, i: number) => i !== index)
                                    .map((s: any) => s.skill.toLowerCase());
                                  return !selectedSkills.includes(skill.toLowerCase());
                                })
                                .map((skill) => (
                                  <CommandItem
                                    key={skill}
                                    value={skill}
                                    onSelect={(currentValue) => {
                                      updateSkill(index, "skill", currentValue);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        skillItem.skill === skill ? "opacity-100" : "opacity-0"
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
                  </div>

                  {/* Proficiency Dropdown - Normal Font */}
                  <Select
                    value={skillItem.proficiency}
                    onValueChange={(value) => updateSkill(index, "proficiency", value)}
                  >
                    <SelectTrigger className="w-[180px] bg-[#F1F3F5] border-none rounded-lg text-gray-900 h-11 focus:ring-0 font-normal">
                      <SelectValue placeholder="Choose Proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner" className="font-normal">Beginner</SelectItem>
                      <SelectItem value="Intermediate" className="font-normal">Intermediate</SelectItem>
                      <SelectItem value="Advanced" className="font-normal">Advanced</SelectItem>
                      <SelectItem value="Expert" className="font-normal">Expert</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Delete Skill Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSkill(index)}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 h-6 w-6 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* Add Skill Button Row */}
              {skills.length < 10 && (
                <div className="flex items-center gap-4 pt-2">
                  <Plus
                    className="w-5 h-5 cursor-pointer text-gray-400 hover:text-black"
                    onClick={addSkill}
                  />
                  <Button
                    type="button"
                    onClick={addSkill}
                    className="bg-accentBlue hover:bg-accentBlue/90 text-white justify-start px-4 py-2.5 rounded-lg h-11 min-w-[240px] font-normal"
                  >
                    Add Skill ({skills.length}/10)
                  </Button>
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}