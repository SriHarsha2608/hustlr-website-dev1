"use client";

import type React from "react";
import { Path, UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Upload, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  FormFieldProp,
  PreloadedFileInfo,
  UploadFormFields,
} from "../../lib/schemas/formSchema";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const fileField = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    "File size must be less than 5MB"
  )
  .refine(
    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png, .webp and .pdf files are accepted"
  );

// For multiple fields:
const formSchema = z.object({
  studentId: fileField.optional().nullable(),
  resume: fileField.optional().nullable(),
  transcript: fileField.optional().nullable(),
});

export default function UploadFileInput({
  title,
  form,
  email,
  name,
  jwtToken,
}: {
  title: string;
  form: FormFieldProp;
  email: string;
  name: Path<UploadFormFields>;
  jwtToken: string;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreloadedFile, setLocalPreloadedFile] =
    useState<PreloadedFileInfo | null>(null);

  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchFileMeta = async () => {
      setFetching(true);

      if (typeof form.getValues(name) !== "string") return; // path not set
      const pathInBucket = form.getValues(name);
      if (typeof pathInBucket !== "string") return;

      try {
        const res = await fetch(
          `/api/file/metadata?path=${encodeURIComponent(pathInBucket)}`,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`, // Inject your token here
            },
          }
        );

        const data = await res.json();
        if (!res.ok) {
          console.error("Error fetching file metadata", data.error);
          return;
        }

        const fileMeta = data.file;

        const fakeFile = new File([""], fileMeta.name, {
          type: "application/octet-stream",
          lastModified: Date.now(),
        });
        Object.defineProperty(fakeFile, "size", {
          value: fileMeta.size,
          writable: false,
        });

        setLocalPreloadedFile(() => ({
          name: fileMeta.name,
          size: fileMeta.size,
          url: fileMeta.url,
        }));

        setSelectedFile(fakeFile);
      } catch (err) {
        console.error("Failed to fetch preloaded file meta", err);
      } finally {
        setFetching(false);
      }
    };

    fetchFileMeta();
  }, [uploading]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 5MB");
      event.target.value = "";
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error("Only .jpg, .jpeg, .png, .webp and .pdf files are accepted");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);

    try {
      const res = await fetch(`/api/file/upload?field=${name}`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        console.error(result.error || "Upload failed");
        toast.error(result.error || "Upload failed");
        return;
      }

      form.setValue(name as any, result.pathInBucket);
      form.trigger(name as any);
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("File upload error", error);
      toast.error("Something went wrong while uploading.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async () => {
    if (!email) {
      console.error("Email missing — cannot delete file");
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/file/delete?field=${name}&email=${email}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to delete file");
      }

      setSelectedFile(null);
      setLocalPreloadedFile(null);
      form.setValue(name as any, null); // or result.url if that's what your API returns

      const fileInput = document.getElementById(
        `${name}-upload`
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      toast.success("File removed successfully!");
    } catch (err) {
      console.error("File removal failed:", err);
      toast.error("Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  const triggerFileInput = () => {
    document.getElementById(`${name}-upload`)?.click();
  };

const getDescription = () => {
    if (name === "transcript") {
      return "Please upload an unofficial screenshot of your transcript so we can verify your grades.";
    }
    if (name === "studentId") {
      return "Please upload a picture of your college Student ID so we can verify your graduation date.";
    }
    // Default fallback
    return `Please upload a picture of your ${title} for verification.`;
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-lg font-bold text-gray-900">
            {title}
          </FormLabel>
          <FormDescription className="text-teal-700 font-semibold text-sm">
            {getDescription()}
          </FormDescription>
          <FormControl>
            <div className="">
              <Input
                id={`${name}-upload`}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!selectedFile ? (
                <Button
                  type="button"
                  onClick={triggerFileInput}
                  variant="secondary"
                  disabled={uploading || deleting}
                  className="bg-teal-200 hover:bg-teal-300/80 focus:ring focus:ring-teal-400/70 text-gray-800 font-medium px-6 py-3 rounded-lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              ) : (
                <div className="flex items-center justify-between p-4 bg-green-100 border border-green-300 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      {localPreloadedFile ? (
                        <p className="text-sm font-medium text-green-700">
                          <a
                            href={localPreloadedFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-green-900"
                          >
                            {title}.{selectedFile.name.split(".").pop()}
                          </a>
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-green-700">
                          {title}.{selectedFile.name.split(".").pop()}
                        </p>
                      )}
                      <p className="text-xs text-green-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleRemoveFile}
                    variant="ghost"
                    size="sm"
                    disabled={fetching || uploading || deleting}
                    className="text-green-700 hover:text-green-800 hover:bg-green-200"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {(fetching || uploading || deleting) && (
                <>
                  <Progress
                    value={100}
                    className="mt-4 animate-pulse transition-all duration-700"
                  />
                  <p className="font-medium text-teal-700 mb-5">
                    {fetching
                      ? "Fetching data of "
                      : uploading
                        ? "Uploading"
                        : "Deleting"}{" "}
                    the file
                  </p>
                </>
              )}
            </div>
          </FormControl>
          <FormDescription className=" font-medium">
            Upload a screenshot or PDF of your {title} (max 5MB)
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
