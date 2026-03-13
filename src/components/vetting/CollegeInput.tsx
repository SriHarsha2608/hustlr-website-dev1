"use client";
import { Check, ChevronsUpDown } from "lucide-react";
import { FieldValues, useForm, UseFormReturn } from "react-hook-form";

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
  Form,
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
import { useEffect, useState } from "react";
import { FormFieldProp } from "../../lib/schemas/formSchema";

export function CollegeInput({ form }: { form: FormFieldProp }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [colleges, setColleges] = useState<{ label: string; value: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  // Fetch colleges from API when search changes
  useEffect(() => {
    if (!search || search.length < 3) {
      setColleges([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/colleges/search?q=${encodeURIComponent(search)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setColleges(
            Array.isArray(data?.colleges)
              ? data.colleges.map((college: any) => ({
                  label: String(college?.label || college?.value || ""),
                  value: String(college?.value || college?.label || ""),
                }))
                  .filter((college: { label: string; value: string }) => college.value.length > 0)
              : []
          );
        })
        .catch((err) => {
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
  }, [search]);

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
                  {field.value || "Select college/university"}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command className="font-sans shadow-xl shadow-black/20 border-2 border-black/15">
                <CommandInput
                  placeholder="Search college..."
                  className="h-9"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {loading
                      ? "Searching..."
                      : search.length < 3
                        ? "Type at least 3 letters"
                        : "No college found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {colleges.map((college) => (
                      <CommandItem
                        value={college.label}
                        key={college.value}
                        onSelect={() => {
                          form.setValue("college", college.value);
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
            Please select your college or university.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
