import React, { useState } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Award, Pencil } from "lucide-react";
import { FormFieldProp } from "../../lib/schemas/formSchema";
import UploadFileInput from "./UploadFile";
import { toast } from "sonner";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const AWARD_CATEGORIES = [
  "Scholarship",
  "Hackathon",
  "Competitive programming",
  "Academic award",
  "Open source"
];

interface AwardFormData {
  title: string;
  category: string;
  organization: string;
  month: string;
  year: string;
  certification?: string;
}

export function AwardsInput({ form, email, jwtToken }: { form: FormFieldProp; email: string; jwtToken: string }) {
  const awards = form.watch("awards") || [];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [awardForm, setAwardForm] = useState<AwardFormData>({
    title: "",
    category: "",
    organization: "",
    month: "",
    year: "",
    certification: ""
  });

  const resetForm = () => {
    setAwardForm({
      title: "",
      category: "",
      organization: "",
      month: "",
      year: "",
      certification: ""
    });
    setEditingIndex(null);
  };

  const openDialog = (index: number | null = null) => {
    if (index !== null) {
      setAwardForm(awards[index] as AwardFormData);
      setEditingIndex(index);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const saveAward = () => {
    const currentAwards = (form.getValues("awards") || []) as AwardFormData[];
    
    if (editingIndex !== null) {
      const updated = [...currentAwards];
      updated[editingIndex] = awardForm;
      form.setValue("awards", updated as any);
    } else {
      form.setValue("awards", [...currentAwards, awardForm] as any);
    }
    
    form.trigger("awards");
    setIsDialogOpen(false);
    resetForm();
  };

  const deleteAward = (index: number) => {
    const currentAwards = form.getValues("awards") || [];
    form.setValue("awards", currentAwards.filter((_, i) => i !== index));
    form.trigger("awards");
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

  return (
    <FormField
      control={form.control}
      name="awards"
      render={() => (
        <FormItem className="w-full max-w-2xl font-ovo">
          <div className="flex justify-between items-center mb-4">
            <FormLabel className="text-lg font-semibold text-gray-900">Awards & Achievements</FormLabel>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  onClick={() => openDialog()}
                  className="flex items-center gap-2 bg-accentBlue hover:bg-accentBlue/90 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Add Award
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingIndex !== null ? "Edit Award" : "Add New Award"}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Title */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Award or Achievement Title</label>
                    <Input
                      value={awardForm.title}
                      onChange={(e) => setAwardForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., First Prize in National Hackathon"
                      className="w-full"
                    />
                  </div>

                  {/* Category and Organization Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Award Category</label>
                      <Select
                        value={awardForm.category}
                        onValueChange={(value) => setAwardForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {AWARD_CATEGORIES.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Issuing Organization</label>
                      <Input
                        value={awardForm.organization}
                        onChange={(e) => setAwardForm(prev => ({ ...prev, organization: e.target.value }))}
                        placeholder="e.g., IEEE, Google, University"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Issued Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Issued Month</label>
                      <Select
                        value={awardForm.month}
                        onValueChange={(value) => setAwardForm(prev => ({ ...prev, month: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(month => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Issued Year</label>
                      <Select
                        value={awardForm.year}
                        onValueChange={(value) => setAwardForm(prev => ({ ...prev, year: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Certification Upload - Will be updated by UploadFileInput */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Upload Certification (Optional)</label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("File size must be less than 5MB");
                            e.target.value = "";
                            return;
                          }
                          // Handle file upload - this will be replaced with proper file upload
                          setAwardForm(prev => ({ ...prev, certification: file.name }));
                        }
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
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
                  <Button type="button" onClick={saveAward}>
                    {editingIndex !== null ? "Update Award" : "Add Award"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <FormControl>
            <div className="space-y-3">
              {(!Array.isArray(awards) || awards.length === 0) ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No awards added yet. Click "Add Award" to get started.
                </p>
              ) : (
                awards.map((award: any, index: number) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    {/* 1st Row: Title with Edit/Delete buttons */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <Award className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-gray-900">{award.title}</h3>
                          <p className="text-sm text-teal-600">{award.category}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openDialog(index)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAward(index)}
                          className="text-black hover:text-gray-700 p-1"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* 2nd Row: Organization and Date */}
                    <div className="ml-7">
                      <p className="text-sm text-gray-700 mb-1">
                        <span className="font-medium">{award.organization}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Issued: {award.month} {award.year}
                      </p>
                      {award.certification && (
                        <p className="text-xs text-blue-600 mt-1">
                          📎 Certification attached
                        </p>
                      )}
                    </div>
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
