"use client";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useMemo, useState } from "react";
import { FormFieldProp } from "../../lib/schemas/formSchema";

const COLLEGE_MAX_LENGTH = 80;

function normalizeCollegeInput(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isValidCollegeManualInput(value: string): boolean {
  // Allow common institute name characters while blocking unusual input.
  return /^[A-Za-z0-9 .,&()'\-/]+$/.test(value);
}

export function CollegeInput({ form }: { form: FormFieldProp }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [colleges, setColleges] = useState<{ label: string; value: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  const normalizedSearch = useMemo(() => normalizeCollegeInput(search), [search]);
  const hasExactMatch = useMemo(
    () =>
      colleges.some(
        (c) => c.value.toLowerCase() === normalizedSearch.toLowerCase()
      ),
    [colleges, normalizedSearch]
  );

  const canUseManual =
    normalizedSearch.length >= 3 &&
    normalizedSearch.length <= COLLEGE_MAX_LENGTH &&
    isValidCollegeManualInput(normalizedSearch) &&
    !hasExactMatch;

  // Fetch colleges from API when search changes
  useEffect(() => {
    if (!normalizedSearch || normalizedSearch.length < 3) {
      setColleges([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/colleges/search?q=${encodeURIComponent(normalizedSearch)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setColleges(
            Array.isArray(data?.colleges)
              ? data.colleges
                  .map((college: { label?: string; value?: string }) => ({
                    label: String(college?.label || college?.value || ""),
                    value: String(college?.value || college?.label || ""),
                  }))
                  .filter(
                    (college: { label: string; value: string }) =>
                      college.value.length > 0
                  )
              : []
          );
        })
        .catch((err: { name?: string }) => {
          if (err?.name !== "AbortError") {
            console.error("College lookup failed", err);
            setColleges([]);
          }
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedSearch]);

  return (
    <FormField
      control={form.control}
      name="college"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>College/University</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "min-w-[300px] justify-between",
                    !field.value && "text-muted-foreground",
                    "bg-slate-50"
                  )}
                >
                  {field.value || "Select or type your college/university"}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0">
              <Command className="font-sans shadow-xl shadow-black/20 border-2 border-black/15">
                <CommandInput
                  placeholder="Type college name..."
                  className="h-9"
                  value={search}
                  onValueChange={(value) => {
                    setSearch(value.slice(0, COLLEGE_MAX_LENGTH));
                  }}
                />
                <CommandList>
                  <CommandEmpty>
                    {loading
                      ? "Searching..."
                      : normalizedSearch.length < 3
                        ? "Type at least 3 letters"
                        : "No college found. You can add it manually below."}
                  </CommandEmpty>
                  <CommandGroup>
                    {canUseManual && (
                      <CommandItem
                        value={`manual:${normalizedSearch}`}
                        onSelect={() => {
                          form.setValue("college", normalizedSearch, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          setSearch(normalizedSearch);
                          setOpen(false);
                        }}
                      >
                        Use "{normalizedSearch}" (manual entry)
                      </CommandItem>
                    )}
                    {colleges.map((college) => (
                      <CommandItem
                        value={college.label}
                        key={college.value}
                        onSelect={() => {
                          form.setValue("college", college.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          setSearch(college.value);
                          setOpen(false);
                        }}
                      >
                        {college.label}
                        <Check
                          className={cn(
                            "ml-auto",
                            college.value === field.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormDescription>
            Type to get suggestions. If your college is not listed, you can add it manually (max {COLLEGE_MAX_LENGTH} characters).
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
