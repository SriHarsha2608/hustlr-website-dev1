import Head from "next/head";
import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/router";
import Nav from "@/src/components/Nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/auth/component";
import { verifyToken } from "@/src/lib/jwt";
import { GetServerSideProps } from "next";
import { parse } from "cookie";
import type { JwtPayload } from "jsonwebtoken";
import { Eye, EyeOff } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const cookies = context.req.headers.cookie;
  if (cookies) {
    const parsed = parse(cookies);
    const token = parsed.session;
    if (token) {
      try {
        const payload = verifyToken(token) as JwtPayload;
        if (payload && typeof payload !== "string" && payload.email && payload.role === "user") {
          return {
            redirect: { destination: "/get-started/student/application", permanent: false },
          };
        }
      } catch {
        // invalid token — fall through to render the page
      }
    }
  }
  return { props: {} };
};

export default function StudentLoginPage() {
  const router = useRouter();
  const inFlight = useRef(false);
  const supabaseClientRef = useRef<ReturnType<typeof createClient> | null>(null);

  function getSupabaseClient() {
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
    }
    return supabaseClientRef.current;
  }

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"form" | "emailSent">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm(): string | null {
    if (!email.trim()) return "Please enter your email.";
    if (!EMAIL_REGEX.test(email.trim())) return "Please enter a valid email address.";
    if (!password) return "Please enter your password.";
    if (mode === "signup" && !PASSWORD_REGEX.test(password)) {
      return "Password must be at least 6 characters with 1 uppercase letter and 1 number.";
    }
    if (mode === "signin" && password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    return null;
  }

  async function handleSignIn() {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      switch (error.code) {
        case "invalid_credentials":
          toast.error("Invalid email or password.");
          break;
        case "email_not_confirmed": {
          const { error: resendError } = await supabaseClient.auth.resend({
            type: "signup",
            email: email.trim(),
            options: {
              emailRedirectTo: `${window.location.origin}/api/auth/confirm?next=/auth/confirmEmail`,
            },
          });
          if (resendError) {
            if (resendError.status === 429) {
              toast.error("Too many attempts. Please wait a minute and try again.");
            } else {
              toast.error(resendError.message || "Failed to resend verification email.");
            }
          } else {
            toast.success("Verification email sent! Check your inbox.");
            setStep("emailSent");
          }
          break;
        }
        default:
          toast.error(error.message || "Sign in failed. Please try again.");
      }
      return;
    }

    if (!data.session?.access_token) {
      toast.error("Unable to establish session. Please try again.");
      return;
    }

    const res = await fetch("/api/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: data.session.access_token }),
    });

    if (res.ok) {
      void router.push("/get-started/student/application");
    } else {
      toast.error("Failed to complete sign in. Please try again.");
    }
  }

  async function handleSignUp() {
    const supabaseClient = getSupabaseClient();
    const { error } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/confirm?next=/auth/confirmEmail`,
      },
    });

    if (error) {
      if (error.status === 429) {
        toast.error("Too many attempts. Please wait 60 seconds and try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setStep("emailSent");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        await handleSignIn();
      } else {
        await handleSignUp();
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setStep("form");
    setPassword("");
    setShowPassword(false);
  }

  if (step === "emailSent") {
    return (
      <>
        <Head>
          <title>Check Your Email – Hustlr</title>
        </Head>
        <Nav />
        <main className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-10 text-center font-sans shadow-md">
            <h1 className="text-2xl font-semibold text-black">Check your inbox</h1>
            <p className="mt-3 text-sm text-black/65 leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>.
              <br />
              Click it to verify your account and continue.
            </p>
            <p className="mt-5 text-xs text-black/45">
              Already confirmed?{" "}
              <button
                type="button"
                className="text-black underline underline-offset-4"
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{mode === "signin" ? "Sign In" : "Create Account"} – Hustlr</title>
      </Head>
      <Nav />
      <main className="flex min-h-screen relative bg-[#111] text-foreground">
        {/* left — form */}
        <div className="relative z-20 flex w-full md:w-1/2 items-center justify-center p-8 md:bg-white">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-md md:shadow-none p-6 font-sans">

            {mode === "signin" ? (
              <>
                <h2 className="text-2xl font-semibold text-black">Welcome back</h2>
                <p className="mt-1 text-sm text-black/55">
                  Sign in to your Hustlr account
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-black">Create your account</h2>
                <p className="mt-1 text-sm text-black/55">
                  Join Hustlr and start your journey
                </p>
              </>
            )}

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-medium text-black">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-black/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="flex items-center justify-between text-sm font-medium text-black">
                  Password
                  {mode === "signup" && (
                    <span className="text-[11px] font-normal text-black/40">
                      6+ chars, 1 uppercase, 1 number
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="••••••••"
                    className="h-11 rounded-xl border-black/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 h-11 w-full rounded-xl bg-black text-white hover:bg-black/85"
              >
                {isSubmitting
                  ? "Please wait…"
                  : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-sm text-black/50">
              {mode === "signin" ? (
                <>
                  New to Hustlr?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-medium text-black hover:underline underline-offset-4"
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-medium text-black hover:underline underline-offset-4"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <p className="mt-6 text-xs text-black/30 text-center">
              By continuing you agree to our{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-black/60">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* right — background image */}
        <div className="h-full w-full md:w-1/2 md:h-auto absolute md:relative md:block">
          <div className="absolute z-10 inset-0 bg-gradient-to-bl from-black/60 to-black/90" />
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
