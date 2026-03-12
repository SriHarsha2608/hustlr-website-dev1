import { GetServerSideProps } from "next";

import { verifyToken } from "@/src/lib/jwt";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import VettingForm from "@/src/components/vetting/VettingForm";
import Nav from "@/src/components/Nav";
import { get } from "http";
import { getVettingProgress } from "@/src/lib/vettingUtils";
import TimelineDots from "@/src/components/Timeline";
import { GetVettingProgressResponse } from "@/src/lib/schemas/formSchema";
import { ArrowRight, UserX } from "lucide-react";
import { useRouter } from "next/router";
import VettingDataDisplay from "@/src/components/vetting/VettingDetails";
import Link from "next/link";

const steps = [
  {
    name: "Category Selection",
    desc: "What do you do best? Your choice decides the type of projects you will be shown on Hustlr. You can only choose ONE category",
  },
  {
    name: "Tell us about yourself",
    desc: "We use this to verify your student status and understand your academic background",
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
    desc: "Share your published research and competitive programming achievements",
  },
  {
    name: "Awards and Documents",
    desc: "We use this to learn more about your accolades and verify your documents",
  },
];
export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookies = req.cookies;
  const token = cookies.session;

  if (!token) {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  try {
    const payload = verifyToken(token); // { email }
    const email = typeof payload === "string" ? undefined : payload.email;

    if (!email) {
      return {
        redirect: { destination: "/", permanent: false },
      };
    }

    const vettingProgress: GetVettingProgressResponse =
      await getVettingProgress(email);
    console.log(`Got old progress: ${JSON.stringify(vettingProgress)}`);
    return {
      props: {
        email,
        token,
        vettingProgressResponse: vettingProgress,
      },
    };
  } catch {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }
};

export default function Vetting({
  email,
  token,
  vettingProgressResponse,
}: {
  email: string;
  token: string;
  vettingProgressResponse: GetVettingProgressResponse | null;
}) {
  const [step, setStep] = useState(0);
  const [vettingTimelineStep, setVettingTimelineStep] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(
    vettingProgressResponse?.success
      ? vettingProgressResponse?.data.isComplete
      : false,
  );
  const [rejected, setRejected] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (alreadyCompleted) {
      setStep(steps.length - 1);
    }
  }, [alreadyCompleted]);

  const router = useRouter();

  return (
    <div className=" bg-white min-h-screen h-full text-black p-6 ">
      <Nav />

      <main className="max-w-screen-md mx-auto ">
        <div className="mt-20 md:my-24">
          <TimelineDots totalSteps={3} currentStep={vettingTimelineStep} />
          <h1 className="text-xl font-bold">Round 1: Profile Review</h1>
          <hr className="my-5" />
          {/* <div className="text-lg font-sans font-bold">{steps[step].name}</div>
          <p className="text-sm font-sans font-semibold text-accentBlue mb-5">
            {steps[step].desc}
          </p> */}
          {rejected ? (
            <>
              <div className="flex flex-col gap-4 items-center text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Unfortunately, this wasn't your time.
                </h1>

                <UserX className="size-16" />
                <p className="text-lg font-sans font-normal text-black">
                  We received a large number of high quality applications, and
                  unfortunately, we weren't able to select you this time.
                  <br />
                  <br />
                  Don't let this hold you back. Many of our top Hustlrs made it
                  in on their second or third attempt. If you feel your profile
                  has improved, come back after 2 months and apply again. Keep
                  learning. Keep building.
                  <br />
                  <br />
                  <span className="font-medium">
                    The Hustlr journey isn't over — it's just paused
                  </span>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {steps[step].name}
                </h1>
                <p className="text-lg font-bold text-teal-700">
                  {steps[step].desc}
                </p>
              </div>

              <Progress
                value={((step + 1) / steps.length) * 100}
                className="mb-6"
              />
              {alreadyCompleted ? (
                <div className="py-6 rounded-lg text-black font-medium text-xl">
                  <p className="mb-5">
                    <span className="block mb-2 font-heading text-4xl">
                      Hey{" "}
                      {vettingProgressResponse?.success
                        ? vettingProgressResponse.data.name
                        : email}
                      ,
                    </span>
                  </p>
                  <Link
                    href={"/get-started/student/application/status"}
                    className="w text-sm px-3 py-2 bg-green-500/20 hover:bg-green-500/30 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    Check application status <ArrowRight className="size-5" />
                  </Link>
                  <br />

                  <div className="bg-white p-3 rounded pl-2 md:pl-5 text-black text-lg">
                    <VettingDataDisplay
                      jwtToken={token}
                      // to remove these fields from rendering
                      data={Object.fromEntries(
                        Object.entries(
                          vettingProgressResponse?.success
                            ? vettingProgressResponse.data
                            : {},
                        ).filter(
                          ([key]) =>
                            ![
                              "_id",
                              "id",
                              "isComplete",
                              "isUnderReview",
                              "isAccepted",
                              "isRejected",
                            ].includes(key),
                        ),
                      )}
                    />
                  </div>
                  {/* <pre className="whitespace-pre-wrap break-words bg-gray-100 p-4 rounded text-sm overflow-auto max-h-[400px] font-mono">
                    {vettingProgressResponse?.success
                      ? JSON.stringify(vettingProgressResponse.data, null, 2)
                      : JSON.stringify(vettingProgressResponse, null, 2)}
                  </pre> */}
                </div>
              ) : success ? (
                <>
                  <div className="p-6 bg-green-900 rounded-lg text-green-200 font-serif text-xl">
                    🎉 Success! Your application has been submitted.
                  </div>
                </>
              ) : (
                <VettingForm
                  step={step}
                  setStep={setStep}
                  email={email}
                  jwtToken={token}
                  vettingProgressResponse={vettingProgressResponse}
                  setSuccess={setSuccess}
                  router={router}
                />
              )}

              <p className="text-base font-bold text-gray-600 mt-4">
                This process helps us maintain a high-quality community. Thank
                you for your patience!
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
