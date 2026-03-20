import Head from "next/head";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Nav from "@/src/components/Nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const COUNTRY_CODES = [
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+1", label: "🇨🇦 +1" },
  { value: "+7", label: "🇷🇺 +7" },
  { value: "+20", label: "🇪🇬 +20" },
  { value: "+27", label: "🇿🇦 +27" },
  { value: "+31", label: "🇳🇱 +31" },
  { value: "+32", label: "🇧🇪 +32" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+34", label: "🇪🇸 +34" },
  { value: "+39", label: "🇮🇹 +39" },
  { value: "+41", label: "🇨🇭 +41" },
  { value: "+43", label: "🇦🇹 +43" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+45", label: "🇩🇰 +45" },
  { value: "+46", label: "🇸🇪 +46" },
  { value: "+47", label: "🇳🇴 +47" },
  { value: "+48", label: "🇵🇱 +48" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+52", label: "🇲🇽 +52" },
  { value: "+54", label: "🇦🇷 +54" },
  { value: "+55", label: "🇧🇷 +55" },
  { value: "+56", label: "🇨🇱 +56" },
  { value: "+57", label: "🇨🇴 +57" },
  { value: "+60", label: "🇲🇾 +60" },
  { value: "+61", label: "🇦🇺 +61" },
  { value: "+62", label: "🇮🇩 +62" },
  { value: "+63", label: "🇵🇭 +63" },
  { value: "+64", label: "🇳🇿 +64" },
  { value: "+65", label: "🇸🇬 +65" },
  { value: "+66", label: "🇹🇭 +66" },
  { value: "+81", label: "🇯🇵 +81" },
  { value: "+82", label: "🇰🇷 +82" },
  { value: "+84", label: "🇻🇳 +84" },
  { value: "+86", label: "🇨🇳 +86" },
  { value: "+90", label: "🇹🇷 +90" },
  { value: "+92", label: "🇵🇰 +92" },
  { value: "+93", label: "🇦🇫 +93" },
  { value: "+94", label: "🇱🇰 +94" },
  { value: "+95", label: "🇲🇲 +95" },
  { value: "+98", label: "🇮🇷 +98" },
  { value: "+212", label: "🇲🇦 +212" },
  { value: "+213", label: "🇩🇿 +213" },
  { value: "+216", label: "🇹🇳 +216" },
  { value: "+218", label: "🇱🇾 +218" },
  { value: "+220", label: "🇬🇲 +220" },
  { value: "+221", label: "🇸🇳 +221" },
  { value: "+233", label: "🇬🇭 +233" },
  { value: "+234", label: "🇳🇬 +234" },
  { value: "+243", label: "🇨🇩 +243" },
  { value: "+251", label: "🇪🇹 +251" },
  { value: "+254", label: "🇰🇪 +254" },
  { value: "+255", label: "🇹🇿 +255" },
  { value: "+256", label: "🇺🇬 +256" },
  { value: "+260", label: "🇿🇲 +260" },
  { value: "+263", label: "🇿🇼 +263" },
  { value: "+351", label: "🇵🇹 +351" },
  { value: "+352", label: "🇱🇺 +352" },
  { value: "+353", label: "🇮🇪 +353" },
  { value: "+354", label: "🇮🇸 +354" },
  { value: "+355", label: "🇦🇱 +355" },
  { value: "+357", label: "🇨🇾 +357" },
  { value: "+358", label: "🇫🇮 +358" },
  { value: "+359", label: "🇧🇬 +359" },
  { value: "+370", label: "🇱🇹 +370" },
  { value: "+371", label: "🇱🇻 +371" },
  { value: "+372", label: "🇪🇪 +372" },
  { value: "+380", label: "🇺🇦 +380" },
  { value: "+385", label: "🇭🇷 +385" },
  { value: "+386", label: "🇸🇮 +386" },
  { value: "+387", label: "🇧🇦 +387" },
  { value: "+420", label: "🇨🇿 +420" },
  { value: "+421", label: "🇸🇰 +421" },
  { value: "+852", label: "🇭🇰 +852" },
  { value: "+880", label: "🇧🇩 +880" },
  { value: "+961", label: "🇱🇧 +961" },
  { value: "+962", label: "🇯🇴 +962" },
  { value: "+963", label: "🇸🇾 +963" },
  { value: "+964", label: "🇮🇶 +964" },
  { value: "+965", label: "🇰🇼 +965" },
  { value: "+966", label: "🇸🇦 +966" },
  { value: "+967", label: "🇾🇪 +967" },
  { value: "+968", label: "🇴🇲 +968" },
  { value: "+970", label: "🇵🇸 +970" },
  { value: "+971", label: "🇦🇪 +971" },
  { value: "+972", label: "🇮🇱 +972" },
  { value: "+973", label: "🇧🇭 +973" },
  { value: "+974", label: "🇶🇦 +974" },
  { value: "+975", label: "🇧🇹 +975" },
  { value: "+976", label: "🇲🇳 +976" },
  { value: "+977", label: "🇳🇵 +977" },
  { value: "+992", label: "🇹🇯 +992" },
  { value: "+993", label: "🇹🇲 +993" },
  { value: "+994", label: "🇦🇿 +994" },
  { value: "+995", label: "🇬🇪 +995" },
  { value: "+996", label: "🇰🇬 +996" },
  { value: "+998", label: "🇺🇿 +998" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

export default function ClientVerifyPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [countryCode, setCountryCode] = useState("+91");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm() {
    if (!companyName.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      return "Please fill all fields before continuing.";
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!PASSWORD_REGEX.test(password)) {
      return "Password must be at least 6 characters with 1 uppercase letter and 1 number.";
    }

    const digitsOnlyPhone = phone.replace(/\D/g, "");
    if (digitsOnlyPhone.length < 6 || digitsOnlyPhone.length > 15) {
      return "Please enter a valid phone number.";
    }

    return null;
  }

  async function submitCreateAccount() {
    if (isSubmitting) return;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setMode("signup");
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    toast.success(
      `Create Account captured for ${companyName.trim()}. We will notify you when client onboarding opens.`
    );
    setIsSubmitting(false);
    router.push("/get-started/student/login");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitCreateAccount();
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
                Let&apos;s Get Started
              </h1>
              <p className="mt-3 text-black font-semibold">
                Find top student talent for your next project
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Company Name</label>
                    <Input
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      autoComplete="organization"
                      className="h-11 w-full rounded-2xl border-black/20 bg-white shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]"
                    />
                  </div>

                  <div className="hidden md:block" aria-hidden="true" />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Email</label>
                    <Input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="h-11 w-full rounded-2xl border-black/20 bg-white shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      Password
                      <span className="text-[11px] font-normal text-black/45 whitespace-nowrap">
                        At least 6 characters, 1 uppercase, 1 number
                      </span>
                    </label>
                    <Input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      className="h-11 w-full rounded-2xl border-black/20 bg-white shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Phone Number</label>
                    <div className="flex h-11 rounded-2xl border border-black/20 bg-white overflow-hidden shadow-[-1px_2px_3px_rgba(0,0,0,0.1)]">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="h-11 w-auto min-w-[90px] border-none border-r border-black/20 bg-white text-black text-sm rounded-none focus:ring-0 focus:ring-offset-0 px-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((code) => (
                            <SelectItem key={code.label} value={code.value}>
                              {code.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        className="flex-1 h-11 border-none bg-white rounded-none outline-none px-3 text-base"
                      />
                    </div>
                  </div>

                  <div className="hidden md:block" aria-hidden="true" />
                </div>

                <div className="pt-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-10 w-full sm:w-[265px] rounded-2xl bg-black text-white shadow-[-1px_2px_3px_rgba(0,0,0,0.1)] hover:bg-black/90"
                    >
                      {isSubmitting ? "Please wait..." : "Create Account"}
                    </Button>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => {
                          router.push("/get-started/student/login");
                        }}
                        className="h-10 w-full sm:w-[265px] rounded-2xl border-black/20 bg-white text-black shadow-[-1px_2px_3px_rgba(0,0,0,0.1)] hover:bg-black/5"
                      >
                        {isSubmitting ? "Please wait..." : "Sign In"}
                      </Button>
                      <p className="text-center text-xs text-black/45">
                        Already have an account?
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
