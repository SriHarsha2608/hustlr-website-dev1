import Head from "next/head";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/router";
import Nav from "@/src/components/Nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/auth/component";
import { verifyToken } from "@/src/lib/jwt";
import { GetServerSideProps } from "next";
import { parse } from "cookie";
import type { JwtPayload } from "jsonwebtoken";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

const COUNTRY_CODES = [
  { iso: "IN", dialCode: "+91", label: "🇮🇳 +91" },
  { iso: "US", dialCode: "+1", label: "🇺🇸 +1" },
  { iso: "CA", dialCode: "+1", label: "🇨🇦 +1" },
  { iso: "RU", dialCode: "+7", label: "🇷🇺 +7" },
  { iso: "EG", dialCode: "+20", label: "🇪🇬 +20" },
  { iso: "ZA", dialCode: "+27", label: "🇿🇦 +27" },
  { iso: "NL", dialCode: "+31", label: "🇳🇱 +31" },
  { iso: "BE", dialCode: "+32", label: "🇧🇪 +32" },
  { iso: "FR", dialCode: "+33", label: "🇫🇷 +33" },
  { iso: "ES", dialCode: "+34", label: "🇪🇸 +34" },
  { iso: "IT", dialCode: "+39", label: "🇮🇹 +39" },
  { iso: "CH", dialCode: "+41", label: "🇨🇭 +41" },
  { iso: "AT", dialCode: "+43", label: "🇦🇹 +43" },
  { iso: "GB", dialCode: "+44", label: "🇬🇧 +44" },
  { iso: "DK", dialCode: "+45", label: "🇩🇰 +45" },
  { iso: "SE", dialCode: "+46", label: "🇸🇪 +46" },
  { iso: "NO", dialCode: "+47", label: "🇳🇴 +47" },
  { iso: "PL", dialCode: "+48", label: "🇵🇱 +48" },
  { iso: "DE", dialCode: "+49", label: "🇩🇪 +49" },
  { iso: "MX", dialCode: "+52", label: "🇲🇽 +52" },
  { iso: "AR", dialCode: "+54", label: "🇦🇷 +54" },
  { iso: "BR", dialCode: "+55", label: "🇧🇷 +55" },
  { iso: "CL", dialCode: "+56", label: "🇨🇱 +56" },
  { iso: "CO", dialCode: "+57", label: "🇨🇴 +57" },
  { iso: "MY", dialCode: "+60", label: "🇲🇾 +60" },
  { iso: "AU", dialCode: "+61", label: "🇦🇺 +61" },
  { iso: "ID", dialCode: "+62", label: "🇮🇩 +62" },
  { iso: "PH", dialCode: "+63", label: "🇵🇭 +63" },
  { iso: "NZ", dialCode: "+64", label: "🇳🇿 +64" },
  { iso: "SG", dialCode: "+65", label: "🇸🇬 +65" },
  { iso: "TH", dialCode: "+66", label: "🇹🇭 +66" },
  { iso: "JP", dialCode: "+81", label: "🇯🇵 +81" },
  { iso: "KR", dialCode: "+82", label: "🇰🇷 +82" },
  { iso: "VN", dialCode: "+84", label: "🇻🇳 +84" },
  { iso: "CN", dialCode: "+86", label: "🇨🇳 +86" },
  { iso: "TR", dialCode: "+90", label: "🇹🇷 +90" },
  { iso: "PK", dialCode: "+92", label: "🇵🇰 +92" },
  { iso: "AF", dialCode: "+93", label: "🇦🇫 +93" },
  { iso: "LK", dialCode: "+94", label: "🇱🇰 +94" },
  { iso: "MM", dialCode: "+95", label: "🇲🇲 +95" },
  { iso: "IR", dialCode: "+98", label: "🇮🇷 +98" },
  { iso: "MA", dialCode: "+212", label: "🇲🇦 +212" },
  { iso: "DZ", dialCode: "+213", label: "🇩🇿 +213" },
  { iso: "TN", dialCode: "+216", label: "🇹🇳 +216" },
  { iso: "LY", dialCode: "+218", label: "🇱🇾 +218" },
  { iso: "GM", dialCode: "+220", label: "🇬🇲 +220" },
  { iso: "SN", dialCode: "+221", label: "🇸🇳 +221" },
  { iso: "GH", dialCode: "+233", label: "🇬🇭 +233" },
  { iso: "NG", dialCode: "+234", label: "🇳🇬 +234" },
  { iso: "CD", dialCode: "+243", label: "🇨🇩 +243" },
  { iso: "ET", dialCode: "+251", label: "🇪🇹 +251" },
  { iso: "KE", dialCode: "+254", label: "🇰🇪 +254" },
  { iso: "TZ", dialCode: "+255", label: "🇹🇿 +255" },
  { iso: "UG", dialCode: "+256", label: "🇺🇬 +256" },
  { iso: "ZM", dialCode: "+260", label: "🇿🇲 +260" },
  { iso: "ZW", dialCode: "+263", label: "🇿🇼 +263" },
  { iso: "PT", dialCode: "+351", label: "🇵🇹 +351" },
  { iso: "LU", dialCode: "+352", label: "🇱🇺 +352" },
  { iso: "IE", dialCode: "+353", label: "🇮🇪 +353" },
  { iso: "IS", dialCode: "+354", label: "🇮🇸 +354" },
  { iso: "AL", dialCode: "+355", label: "🇦🇱 +355" },
  { iso: "CY", dialCode: "+357", label: "🇨🇾 +357" },
  { iso: "FI", dialCode: "+358", label: "🇫🇮 +358" },
  { iso: "BG", dialCode: "+359", label: "🇧🇬 +359" },
  { iso: "LT", dialCode: "+370", label: "🇱🇹 +370" },
  { iso: "LV", dialCode: "+371", label: "🇱🇻 +371" },
  { iso: "EE", dialCode: "+372", label: "🇪🇪 +372" },
  { iso: "UA", dialCode: "+380", label: "🇺🇦 +380" },
  { iso: "HR", dialCode: "+385", label: "🇭🇷 +385" },
  { iso: "SI", dialCode: "+386", label: "🇸🇮 +386" },
  { iso: "BA", dialCode: "+387", label: "🇧🇦 +387" },
  { iso: "CZ", dialCode: "+420", label: "🇨🇿 +420" },
  { iso: "SK", dialCode: "+421", label: "🇸🇰 +421" },
  { iso: "HK", dialCode: "+852", label: "🇭🇰 +852" },
  { iso: "BD", dialCode: "+880", label: "🇧🇩 +880" },
  { iso: "LB", dialCode: "+961", label: "🇱🇧 +961" },
  { iso: "JO", dialCode: "+962", label: "🇯🇴 +962" },
  { iso: "SY", dialCode: "+963", label: "🇸🇾 +963" },
  { iso: "IQ", dialCode: "+964", label: "🇮🇶 +964" },
  { iso: "KW", dialCode: "+965", label: "🇰🇼 +965" },
  { iso: "SA", dialCode: "+966", label: "🇸🇦 +966" },
  { iso: "YE", dialCode: "+967", label: "🇾🇪 +967" },
  { iso: "OM", dialCode: "+968", label: "🇴🇲 +968" },
  { iso: "PS", dialCode: "+970", label: "🇵🇸 +970" },
  { iso: "AE", dialCode: "+971", label: "🇦🇪 +971" },
  { iso: "IL", dialCode: "+972", label: "🇮🇱 +972" },
  { iso: "BH", dialCode: "+973", label: "🇧🇭 +973" },
  { iso: "QA", dialCode: "+974", label: "🇶🇦 +974" },
  { iso: "BT", dialCode: "+975", label: "🇧🇹 +975" },
  { iso: "MN", dialCode: "+976", label: "🇲🇳 +976" },
  { iso: "NP", dialCode: "+977", label: "🇳🇵 +977" },
  { iso: "TJ", dialCode: "+992", label: "🇹🇯 +992" },
  { iso: "TM", dialCode: "+993", label: "🇹🇲 +993" },
  { iso: "AZ", dialCode: "+994", label: "🇦🇿 +994" },
  { iso: "GE", dialCode: "+995", label: "🇬🇪 +995" },
  { iso: "KG", dialCode: "+996", label: "🇰🇬 +996" },
  { iso: "UZ", dialCode: "+998", label: "🇺🇿 +998" },
];

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
        if (payload && typeof payload !== "string" && payload.email && payload.role === "client") {
          const { data: profile } = await supabaseAdmin
            .from("client_profiles")
            .select("email")
            .eq("email", payload.email)
            .maybeSingle();

          return {
            redirect: {
              destination: profile
                ? "/get-started/client/dashboard"
                : "/get-started/client/onboarding",
              permanent: false,
            },
          };
        }
      } catch {
        // invalid token — continue to render page
      }
    }
  }
  return { props: {} };
};

export default function ClientVerifyPage() {
  const router = useRouter();
  const inFlight = useRef(false);
  const supabaseClientRef = useRef<ReturnType<typeof createClient> | null>(null);

  function getSupabaseClient() {
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
    }
    return supabaseClientRef.current;
  }

  const [step, setStep] = useState<"form" | "emailSent">("form");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [countryCode, setCountryCode] = useState("IN");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm() {
    if (!email.trim()) return "Please enter your email.";
    if (!EMAIL_REGEX.test(email.trim())) return "Please enter a valid email address.";
    if (!password) return "Please enter your password.";
    if (!PASSWORD_REGEX.test(password)) {
      return "Password must be at least 6 characters with 1 uppercase letter and 1 number.";
    }
    if (mode === "signup") {
      if (!companyName.trim()) return "Please enter your company name.";
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 6 || digits.length > 15) return "Please enter a valid phone number.";
    }
    return null;
  }

  async function handleSignUp() {
    const supabaseClient = getSupabaseClient();
    const selectedCode = COUNTRY_CODES.find((c) => c.iso === countryCode);
    const dialCode = selectedCode?.dialCode ?? "+91";
    const fullPhone = `${dialCode}${phone.trim()}`;

    const { error } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role: "client", companyName: companyName.trim(), phone: fullPhone },
        emailRedirectTo: `${window.location.origin}/api/client/auth/confirm?next=/get-started/client/dashboard`,
      },
    });

    if (error) {
      if (error.status === 429) {
        toast.error("Too many attempts. Please wait a minute and try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Always show the email-sent screen regardless of whether Supabase auto-confirmed.
    // If no email arrives the user clicks "Sign in instead" which handles both cases.
    setStep("emailSent");
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
          // Resend the confirmation email — same pattern as student login flow
          const { error: resendError } = await supabaseClient.auth.resend({
            type: "signup",
            email: email.trim(),
            options: {
              emailRedirectTo: `${window.location.origin}/api/client/auth/confirm?next=/get-started/client/dashboard`,
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
          toast.error(error.message || "Sign in failed.");
      }
      return;
    }

    if (!data.session?.access_token) {
      toast.error("Unable to establish session. Please try again.");
      return;
    }

    const res = await fetch("/api/client/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: data.session.access_token }),
    });

    if (res.ok) {
      toast.success("Signed in successfully!");
      try {
        const profileRes = await fetch("/api/client/profile/get");
        if (profileRes.ok) {
          void router.push("/get-started/client/dashboard");
          return;
        }
      } catch {
        // fall through to onboarding when profile lookup fails
      }
      void router.push("/get-started/client/onboarding");
    } else if (res.status === 403) {
      toast.error("Please verify your email before signing in. Check your inbox.");
      setStep("emailSent");
    } else {
      toast.error("Failed to complete sign in. Please try again.");
    }
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
      if (mode === "signup") {
        await handleSignUp();
      } else {
        await handleSignIn();
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  if (step === "emailSent") {
    return (
      <>
        <Head>
          <title>Check Your Email - Hustlr</title>
        </Head>
        <Nav />
        <main className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-10 text-center font-sans shadow-md">
            <h1 className="text-2xl font-semibold text-black">Check your inbox</h1>
            <p className="mt-3 text-sm text-black/65 leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to verify your account and get started.
            </p>
            <p className="mt-4 text-xs text-black/45">
              Already have an account?{" "}
              <button
                type="button"
                className="text-black underline underline-offset-4"
                onClick={() => {
                  setStep("form");
                  setMode("signin");
                }}
              >
                Sign in instead
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
        <title>Client Verify - Hustlr</title>
      </Head>

      <Nav />

      <main className="min-h-screen bg-white">
        <section className="grid min-h-screen grid-cols-1 md:grid-cols-2">
          <div className="bg-white px-6 py-10 sm:px-10 md:px-14 lg:px-20 flex items-center">
            <div className="w-full font-sans text-black">
              <h1 className="text-3xl font-semibold tracking-tight">
                {mode === "signup" ? "Let's Get Started" : "Welcome Back"}
              </h1>
              <p className="mt-3 text-black font-semibold">
                {mode === "signup"
                  ? "Find top student talent for your next project"
                  : "Sign in to your Hustlr client account"}
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <label htmlFor="verify-company-name" className="block text-sm font-medium">Company Name</label>
                      <Input
                        id="verify-company-name"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        autoComplete="organization"
                        className="h-11 w-full rounded-2xl border-black/20 bg-white shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]"
                      />
                    </div>
                  )}

                  {mode === "signup" && <div className="hidden md:block" aria-hidden="true" />}

                  <div className="space-y-2">
                    <label htmlFor="verify-email" className="block text-sm font-medium">Email</label>
                    <Input
                      id="verify-email"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="h-11 w-full rounded-2xl border-black/20 bg-white shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="verify-password" className="flex items-center gap-2 text-sm font-medium">
                      Password
                      {mode === "signup" && (
                        <span className="text-[11px] font-normal text-black/45 whitespace-nowrap">
                          At least 6 characters, 1 uppercase, 1 number
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Input
                        id="verify-password"
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        className="h-11 w-full rounded-2xl border-black/20 bg-white pr-10 shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black/50 hover:text-black/80 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {mode === "signup" && (
                    <div className="space-y-2">
                      <label htmlFor="verify-phone" className="block text-sm font-medium">Phone Number</label>
                      <div className="flex h-11 rounded-2xl border border-black/20 bg-white overflow-hidden shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                          <SelectTrigger className="h-11 w-auto min-w-[90px] border-none border-r border-black/20 bg-white text-black text-sm rounded-none focus:ring-0 focus:ring-offset-0 px-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CODES.map((code) => (
                              <SelectItem key={code.iso} value={code.iso}>
                                {code.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input
                          id="verify-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          autoComplete="tel"
                          className="flex-1 h-11 border-none bg-white rounded-none outline-none px-3 text-base"
                        />
                      </div>
                    </div>
                  )}

                  {mode === "signup" && <div className="hidden md:block" aria-hidden="true" />}
                </div>

                <div className="pt-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-10 w-full sm:w-[265px] rounded-2xl bg-black text-white shadow-[-1px_2px_3px_rgba(0,0,0,0.1)] hover:bg-black/90"
                    >
                      {isSubmitting
                        ? "Please wait..."
                        : mode === "signup"
                        ? "Create Account"
                        : "Sign In"}
                    </Button>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                        className="h-10 w-full sm:w-[265px] rounded-2xl border-black/20 bg-white text-black shadow-[-1px_2px_3px_rgba(0,0,0,0.1)] hover:bg-black/5"
                      >
                        {mode === "signup" ? "Sign In Instead" : "Create Account Instead"}
                      </Button>
                      <p className="text-center text-xs text-black/45">
                        {mode === "signup"
                          ? "Already have an account?"
                          : "New to Hustlr?"}
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div
            className="relative hidden md:block bg-[#050505] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/topo.svg')" }}
          />
        </section>
      </main>
    </>
  );
}
