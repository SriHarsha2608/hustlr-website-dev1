import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/src/lib/supabase/auth/component";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Nav from "@/src/components/Nav";
import { Separator } from "@/components/ui/separator";
import { Loader, LogOut } from "lucide-react";
import { verifyToken } from "@/src/lib/jwt";
import { GetServerSideProps } from "next";
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const slideFadeVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.3 } },
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { parse } = require("cookie");
  const { req } = context;
  const cookies = req.headers.cookie;

  if (cookies) {
    const parsed = parse(cookies);
    const token = parsed.session;

    if (token) {
      try {
        const payload = verifyToken(token);
        if (typeof payload !== "string" && payload.email) {
          // Valid JWT, redirect
          return {
            props: { isAlreadyVerified: true, existingEmail: payload.email },
          };
        }
      } catch (err) {
        console.log("no session token or invalid token: ");
      }
    }
  }

  return {
    props: { isAlreadyVerified: false, existingEmail: null }, // proceed to render the page normally
  };
};

export default function LoginPage({
  isAlreadyVerified,
  existingEmail,
}: {
  isAlreadyVerified: boolean;
  existingEmail?: string;
}) {
  const router = useRouter();
  const supabaseClient = createClient();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "emailSent">("form");

  async function logIn(values: LoginFormValues) {
    setLoading(true);
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    console.log(data, error);

    if (error) {
      switch (error.code) {
        case "invalid_credentials":
          form.setError("email", { message: "Invalid email or password." });
          form.setError("password", { message: "Invalid email or password." });
          toast.error("Invalid email or password.");
          break;
        case "user_not_found":
          form.setError("email", {
            message: "User not found. Please sign up.",
          });
          toast.error("User not found. Please sign up.");
          break;
        case "email_not_confirmed":
          // const { error } = await supabaseClient.auth.resend({
          //   type: "signup",
          //   email: values.email,
          //   options: {
          //     emailRedirectTo: `${window.location.origin}/api/auth/confirm?next=${window.location.origin}/auth/confirmEmail`,
          //   },
          // });
          signUp(values);
          break;
        default:
          toast.error("An unexpected error occurred.");
          break;
      }
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: data.session?.access_token }),
    });

    setLoading(false);
    if (res.ok) {
      toast.success("Logged in successfully!");

      router.push("/get-started/student/application");
    } else {
      toast.error("Failed to login!");
      router.push("/error");
    }
  }

  async function signUp(values: LoginFormValues) {
    setLoading(true);

    // TODO: check if user exists and handle that case

    const { data, error } = await supabaseClient.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/confirm?next=${window.location.origin}/auth/confirmEmail`,
      },
    });
    console.log(data);
    setLoading(false);
    if (error) {
      form.setError("email", { message: error.message });
      toast.error(error.message);
      return;
    }
    setStep("emailSent");
  }

  if (isAlreadyVerified) {
    return (
      <>
        <Nav />
        <main className="bg-white min-h-screen flex items-center justify-center flex-col space-y-6">
          <h1 className="text-2xl font-bold">You're already logged in!</h1>
          <p className="text-lg">
            Welcome back <span className="font-semibold">{existingEmail}</span>
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => router.push("/get-started/student/application/")}
              className="font-sans bg-black text-white px-4 py-2 rounded focus:ring focus:ring-gray-600 hover:bg-black/80 transition-colors"
            >
              Proceed to Apply
            </button>

            <button
              onClick={async () => {
                await fetch("/api/auth/logout");
                router.reload();
              }}
              className="font-sans flex items-center justify-center gap-2 bg-gray-200 text-black px-4 py-2 rounded focus:ring-2 focus:ring-gray-600/20 hover:bg-gray-300 transition-colors "
            >
              <LogOut className="size-5 rotate-180" />
              Sign Out
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="flex min-h-screen relative bg-[#111] text-foreground">
        {/* left */}
        <div className="relative z-20 flex w-full md:w-1/2 items-center justify-center p-8 md:bg-white">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-md md:shadow-none p-6">
            <AnimatePresence mode="wait">
              {step === "form" ? (
                <motion.div
                  key="form"
                  variants={slideFadeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <div className="font-sans">
                    <h2 className="font-medium text-lg mb-3">
                      Welcome back to hustlr!
                    </h2>
                    <p>
                      Enter your credentials below to proceed, either create an
                      account or signin
                    </p>
                  </div>
                  <Separator className="my-6" />
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(logIn)}
                      className="font-sans space-y-4 w-full"
                    >
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                autoComplete="email webauthn"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                minLength={6}
                                autoComplete="current-password webauthn"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full"
                        >
                          {loading ? (
                            <Loader className="animate-spin size-10" />
                          ) : (
                            "Log in"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={loading}
                          onClick={form.handleSubmit(signUp)}
                          className="w-full"
                        >
                          {loading ? (
                            <Loader className="animate-spin size-10" />
                          ) : (
                            "Sign up"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              ) : (
                <motion.div
                  key="emailSent"
                  variants={slideFadeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="font-sans space-y-4 text-center"
                >
                  <h2 className="text-xl font-bold">Check your inbox!</h2>
                  <p className="text-gray-700">
                    We've sent you a confirmation email. Please click the link
                    to verify your account.
                    <br />
                    <br />
                    <span className="text-start">
                      <strong>NOTE:</strong> If you don't see the email, you may
                      already have an account. Try logging in instead.
                    </span>
                  </p>
                  <Button
                    onClick={() => setStep("form")}
                    variant="outline"
                    className="mt-4"
                  >
                    Back to login
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Separator className="my-6" />
            <p className="font-sans text-xs">
              We keep your data safe. Read our{" "}
              <a
                href="/privacy"
                target="_blank"
                className="text-blue-600 hover:underline"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
        {/* right */}

        <div className="h-full w-full md:w-1/2 md:h-auto absolute md:relative md:block">
          <div className="absolute z-10 inset-0 bg-gradient-to-bl from-black/60 to-black/90"></div>

          <Image
            src="/images/loginbg.jpg"
            alt="Login background"
            fill
            priority
            className="object-cover"
          />
        </div>
      </main>
    </>
  );
}
