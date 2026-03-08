"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CategoryRadio from "./CategoryRadio";
import {
  formSchema,
  GetVettingProgressResponse,
  SupabaseVettingData,
} from "../../lib/schemas/formSchema";
import { CollegeInput } from "./CollegeInput";
import DobInput from "./DobInput";
import PhoneInput from "./PhoneInput"; 
import { DegreeInput } from "./DegreeInput"; 
import { BranchInput } from "./BranchInput"; 
import { CollegeEmailInput } from "./CollegeEmailInput"; 
import { CgpaInput } from "./CgpaInput";
import { NameInput } from "./NameInput";
import { EmailInput } from "./EmailInput";
import { SkillsProficiencyInput } from "./SkillsProficiencyInput";
import { ProjectsInput } from "./ProjectsInput";
import { ExperienceInput } from "./ExperienceInput";
import { HackathonInput } from "./HackathonInput";
import { OpenSourceInput } from "./OpenSourceInput";
import { ResearchCompetitiveInput } from "./ResearchCompetitiveInput";
import { LinksInput } from "./LinksInput";
import { Hourglass } from "lucide-react";
import { CollegeYearInput } from "./CollegeYearInput";
import { AwardsInput } from "./AwardsInput";
import UploadFileInput from "./UploadFile";
import { NextRouter } from "next/router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const steps = [
  { 
    name: "Category Selection", 
    desc: "What do you do best? Your choice decides the type of projects you will be shown on Hustlr. You can only choose ONE category",
  },
  {
    name: "Tell us about yourself",
    desc: "We use this to verify your students status and understand your academic background",
  },
  {
    name: "Skills & Proficiency",
    desc: "The following questions help us better understand your skillset",
  },
  {
    name: "Projects",
    desc: "Showcase your best work and experience",
  },
  {
    name: "Experience",
    desc: "Tell us about your professional and practical experience",
  },
  {
    name: "Hackathons",
    desc: "Showcase hackathons you've participated in and your achievements",
  },
  {
    name: "Open Source",
    desc: "Tell us about your open source contributions and impact",
  },
  {
    name: "Research & Competitive Programming",
    desc: "Tell us about your research papers and competitive programming achievements",
  },
  {
    name: "Awards and Documents",
    desc: "We use this to learn more about your accolades and verify your documents",
  },
];

const stepVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.3 } },
};

export default function VettingForm({
  step,
  setStep,
  email,
  jwtToken,
  vettingProgressResponse,
  setSuccess,
  router,
}: {
  step: number;
  setStep: (s: number) => void;
  email: string;
  jwtToken: string;
  vettingProgressResponse: GetVettingProgressResponse | null;
  setSuccess: (success: boolean) => void;
  router: NextRouter;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const stepFields: Record<number, (keyof z.infer<typeof formSchema>)[]> = {
    0: ["category"],
    1: [
      "name",
      "email",
      "dob",
      "phone",
      "college",
      "collegeEmail",
      "degree",
      "branch",
      "year",
      "cgpa",
      "resume",
      "transcript",
      "studentId",
    ],
    2: ["skills"],
    3: ["projects"],
    4: ["experiences"],
    5: ["hackathons"],
    6: ["openSource"],
    7: [
      "hasPublishedResearch",
      "researchPapers",
      "codeforcesRating",
      "codeforcesUserId",
      "codechefRating",
      "codechefUserId",
      "hasQualifiedCpCompetitions",
      "cpCompetitions",
    ],
    8: ["linkedin", "github", "awards"],
  };

  const initialData: Partial<SupabaseVettingData> =
    vettingProgressResponse?.success ? vettingProgressResponse.data : {};

  // console.log("Vetting REsponse rvd in vettingForm: ", initialData);

  const calculteStartingStep = () => {
    if (!initialData || Object.keys(initialData).length === 0) return 0;

    // Check each step's fields to find the first incomplete step
    for (let s = 0; s < Object.keys(stepFields).length; s++) {
      const fields = stepFields[s];
      const allFilled = fields.every((field) => {
        const value = initialData[field as keyof SupabaseVettingData];
        if (value === undefined || value === null || value === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      });
      if (!allFilled) return s;
    }
    // All steps filled — return last step
    return Object.keys(stepFields).length - 1;
  };

  useEffect(() => {
    if (initialData && setStep) {
      setStep(calculteStartingStep());
    }
  }, []);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      category: initialData?.category || "",
      name: initialData?.name || "",
      email: initialData?.email || email,
      phone: initialData?.phone || "",            
      collegeEmail: initialData?.collegeEmail || "", 
      degree: initialData?.degree || "",          
      branch: initialData?.branch || "",           
      college: initialData?.college || "",
      year: initialData?.year || "",
      linkedin: initialData?.linkedin || "",
      github: initialData?.github || "",
      awards: (initialData?.awards || []) as any[],
      dob: initialData?.dob ? new Date(initialData.dob) : new Date(),
      cgpa:
        initialData?.cgpa !== undefined && initialData?.cgpa !== null
          ? String(Number(initialData.cgpa).toFixed(2))
          : "",
      skills: (initialData?.skills || []) as { skill: string; proficiency: "Beginner" | "Intermediate" | "Advanced" | "Expert"}[],
      projects: (initialData?.projects || []) as any[],
      experiences: (initialData?.experiences || []) as any[],
      hackathons: (initialData?.hackathons || []) as any[],
      openSource: (initialData as any)?.openSource || [] as any[],
      hasPublishedResearch: (initialData as any)?.hasPublishedResearch || "",
      researchPapers: (initialData as any)?.researchPapers || [] as any[],
      codeforcesRating: (initialData as any)?.codeforcesRating || "",
      codeforcesUserId: (initialData as any)?.codeforcesUserId || "",
      codechefRating: (initialData as any)?.codechefRating || "",
      codechefUserId: (initialData as any)?.codechefUserId || "",
      hasQualifiedCpCompetitions: (initialData as any)?.hasQualifiedCpCompetitions || "",
      cpCompetitions: (initialData as any)?.cpCompetitions || [] as any[],
      resume: initialData?.resume || "",
      transcript: initialData?.transcript || "",
      studentId: initialData?.studentId || "",
    },
  });

  // Save current form data to backend (no validation required)
  const saveFormData = useCallback(async () => {
    try {
      const formData = form.getValues();
      const res = await fetch("/api/application/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(formData),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [form, jwtToken]);

  // Auto-save on page refresh or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const formData = form.getValues();
      const blob = new Blob([JSON.stringify(formData)], { type: "application/json" });
      navigator.sendBeacon(
        `/api/application/save?beacon=true&token=${encodeURIComponent(jwtToken)}`,
        blob
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form, jwtToken]);

  const next = async () => {
    setSubmitting(true);

    const fieldsToValidate = stepFields[step];
    const isValid = await form.trigger(fieldsToValidate);

    // Always save current data, even if validation fails
    const saved = await saveFormData();

    if (isValid) {
      if (saved) {
        toast.success("Vetting data saved successfully");
        console.log("Vetting data saved successfully");
      } else {
        toast.error("Failed to save vetting data.");
      }
      if (step < steps.length - 1) {
        setStep(step + 1);
      }
    } else {
      if (saved) {
        toast.info("Progress saved. Please fix the errors to continue.");
      }
      console.log("Validation Errors", form.formState.errors);
      toast.error("Please fix the errors in the form.");
      form.setError("root", { message: "Please fix the errors above." });
    }
    setSubmitting(false);
  };

  const prev = () => {
    if (setStep && typeof step === "number") setStep(Math.max(step - 1, 0));
  };

  const onSubmit = async () => {
    setSubmitting(true);
    const isValid = await form.trigger();
    console.log("hallo submutting");
    if (isValid) {
      const res = await fetch("/api/application/save?final=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(form.getValues()),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        console.log("Vetting data saved successfully");

        setTimeout(() => {
          router.push("/get-started/student/application/status");
        }, 1000);
      } else {
        toast.error("Failed to submit vetting data.");
        console.log("error saving vetting data:", data);
      }
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          toast.error("Please fix the errors in the form.");
          console.log("Form validation errors:", errors);
        })}
        className="space-y-6 font-ovo"
      >
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <CategoryRadio form={form} />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-5"
            >
              <NameInput form={form} /> 
              <EmailInput form={form} /> 
              <DobInput form={form} />
              <PhoneInput form={form} />
              <CollegeInput form={form} />
              <CollegeEmailInput form={form} />
              <DegreeInput form={form} />
              <BranchInput form={form} />
              <CollegeYearInput form={form} />
              <CgpaInput form={form} />              
              <UploadFileInput
                title="Resume"
                form={form}
                email={email}
                name={"resume"}
                jwtToken={jwtToken}
              />
              <UploadFileInput
                title="Transcript"
                form={form}
                email={email}
                name={"transcript"}
                jwtToken={jwtToken}
              />
              <UploadFileInput
                title="Student ID"
                form={form}
                email={email}
                name={"studentId"}
                jwtToken={jwtToken}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-5"
            >
              <SkillsProficiencyInput form={form} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-5"
            >
              <ProjectsInput form={form} />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step-4"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-5"
            >
              <ExperienceInput form={form} />
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step-5"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-5"
            >
              <HackathonInput form={form} />
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step-6"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-5"
            >
              <OpenSourceInput form={form} />
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="step-7"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-5"
            >
              <ResearchCompetitiveInput form={form} />
            </motion.div>
          )}

          {step === 8 && (
            <motion.div
              key="step-8"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-3"
            >
              <LinksInput form={form} />
              <AwardsInput form={form} email={email} jwtToken={jwtToken} />
            </motion.div>
          )}

          {/*step === 3 && (
            <motion.div
              key="step-3"
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col justify-center items-center"
            >
              <Hourglass className="size-14 mb-5" />
              <p className="text-center text-black font-medium">
                We're reviewing your profile carefully. Only the top candidates
                make it through. Expect to hear back within 1 to 2 working days.
                <br />
                <br />
                Keep an eye on your email, or check back here for updates.
                Hustlr is a curated network of India's top student freelancers.
                If you're selected, you'll move on to the next round — closer to
                becoming part of the top 5 percent.
              </p>
            </motion.div>
          ) */}
        </AnimatePresence>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prev}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={next}>
              {submitting ? "Saving Progress..." : "Next"}
              {/* Next */}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewOpen(true)}
              >
                Review
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Review Modal */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">Review Your Application</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Go through your details carefully before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto pr-2">
            <div className="flex flex-col gap-8 py-2">

              {/* Category */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Category</p>
                <Separator />
                <CategoryRadio form={form} />
              </div>

              {/* Personal Info */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Personal Info</p>
                <Separator />
                <NameInput form={form} />
                <EmailInput form={form} />
                <DobInput form={form} />
                <PhoneInput form={form} />
                <CollegeInput form={form} />
                <CollegeEmailInput form={form} />
                <DegreeInput form={form} />
                <BranchInput form={form} />
                <CollegeYearInput form={form} />
                <CgpaInput form={form} />
                <UploadFileInput title="Resume" form={form} email={email} name="resume" jwtToken={jwtToken} />
                <UploadFileInput title="Transcript" form={form} email={email} name="transcript" jwtToken={jwtToken} />
                <UploadFileInput title="Student ID" form={form} email={email} name="studentId" jwtToken={jwtToken} />
              </div>

              {/* Skills */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Skills &amp; Proficiency</p>
                <Separator />
                <SkillsProficiencyInput form={form} />
              </div>

              {/* Projects */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Projects</p>
                <Separator />
                <ProjectsInput form={form} />
              </div>

              {/* Experience */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Experience</p>
                <Separator />
                <ExperienceInput form={form} />
              </div>

              {/* Hackathons */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Hackathons</p>
                <Separator />
                <HackathonInput form={form} />
              </div>

              {/* Open Source */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Open Source</p>
                <Separator />
                <OpenSourceInput form={form} />
              </div>

              {/* Research & Competitive Programming */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Research &amp; Competitive Programming</p>
                <Separator />
                <ResearchCompetitiveInput form={form} />
              </div>

              {/* Links & Awards */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Links &amp; Awards</p>
                <Separator />
                <LinksInput form={form} />
                <AwardsInput form={form} email={email} jwtToken={jwtToken} />
              </div>

            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await saveFormData();
                setIsReviewOpen(false);
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await saveFormData();
                setIsReviewOpen(false);
                setIsConfirmOpen(true);
              }}
            >
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Are you sure?</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Once you submit, you will not be able to edit your details in any further rounds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setIsReviewOpen(true);
              }}
            >
              No, wait
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                setIsConfirmOpen(false);
                onSubmit();
              }}
            >
              {submitting ? "Submitting..." : "OK, Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
