import { verifyToken } from "@/src/lib/jwt";
import { checkIfExists, getVettingProgress } from "@/src/lib/vettingUtils";
import { GetServerSideProps } from "next";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GetVettingProgressResponse } from "@/src/lib/schemas/formSchema";
import Nav from "@/src/components/Nav";
import { useRouter } from "next/router";
import TimelineDots from "@/src/components/Timeline";
import { CountdownTimer } from "@/src/components/stage2/CountdownTimer";
import { isBefore } from "date-fns";
import { useMemo } from "react";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  try {
    const cookies = req.cookies;
    // console.log("M1", cookies);
    // console.log("M2:", cookie.parse(req.headers.cookie || ""));
    const token = cookies.session;

    if (!token) {
      return {
        redirect: {
          destination: "/get-started/student/login",
          permanent: false,
        },
      };
    }

    const payload = verifyToken(token);
    const email = typeof payload === "string" ? undefined : payload.email;

    if (!email) {
      return {
        redirect: {
          destination: "/get-started/student/login",
          permanent: false,
        },
      };
    }

    const exists = await checkIfExists(email);
    if (exists) {
      const vettingProgress = await getVettingProgress(email);
      return {
        props: {
          email,
          token,
          exists,
          vettingProgressResponse: vettingProgress,
        },
      };
    } else {
      return {
        props: {
          email,
          token,
          exists,
          vettingProgressResponse: {
            success: true,
            data: { currentStage: 1, status: "not_completed" },
          },
        },
      };
    }
  } catch {
    return {
      redirect: { destination: "/get-started/student/login", permanent: false },
    };
  }
};

export default function ApplicationHomepage({
  email,
  vettingProgressResponse,
  exists,
}: {
  email: string;
  token: string;
  exists: boolean;
  vettingProgressResponse: GetVettingProgressResponse | null;
}) {
  if (!vettingProgressResponse?.success) {
    return (
      <>
        <Nav />
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-white">
          <h1 className="text-2xl font-bold">Unable to fetch your data</h1>
          <p>Please try again later or contact support.</p>
        </div>
      </>
    );
  }

  const vettingData = vettingProgressResponse.data;
  const { currentStage = 1, status } = vettingData;
  // const { currentStage = 1, status } = {
  //   currentStage: 2,
  //   status: "round_2_under_review",
  // };

  const router = useRouter();

  return (
    <>
      <Nav />
      <main className="bg-white pt-32 px-3">
        <TimelineDots totalSteps={3} currentStep={currentStage - 1} />
        <div className="flex flex-col items-center">
          <h1 className="font-bold text-3xl">Onboarding - Vetting</h1>
          <p className="text-base font-bold text-gray-600 mt-4 text-center">
            This process helps us maintain a high-quality community. Thank you
            for your patience!
          </p>
        </div>
        <div className="min-h-screen p-5 md:p-10 max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Welcome back, {vettingData.name || email}!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-sans text-base">
                  <span className="text-gray-700">Current Stage:</span>{" "}
                  <Badge className="text-sm" variant="outline">
                    Stage {currentStage}
                  </Badge>
                </div>
                <div className="font-sans text-base">
                  <span className="text-gray-700">Status:</span>{" "}
                  <Badge
                    variant={
                      status === "accepted"
                        ? "default"
                        : status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                    className="text-sm"
                  >
                    {status?.replace(/_/g, " ").toWellFormed()}
                  </Badge>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={"/get-started/student/application/status"}
                  className="font-sans font-medium text-sm px-3 py-2 border border-green-600/10 bg-green-500/20 hover:bg-green-500/30 transition-colors rounded flex items-center justify-center gap-2"
                >
                  Detailed application status <ArrowRight className="size-5" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {status === "under_review" && currentStage === 1 && (
            <Alert className="p-6">
              <AlertTitle className="text-lg font-sans">
                Stage {currentStage}: &nbsp; Your application is under review
              </AlertTitle>
              <AlertDescription className="font-sans text-base">
                You've completed the first stage. Please wait while we review
                your details.
                <div className="mt-5">
                  <Link
                    href={"/get-started/student/application/stage1"}
                    className="font-sans font-medium text-sm px-3 py-2 border border-teal-600/10 bg-teal-500/20 hover:bg-teal-500/30 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    View Submitted Application <ArrowRight className="size-5" />
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status === "round_2_project_selected" && currentStage === 2 && (
            <>
              <Card>
                <CardHeader className="px-6 py-4">
                  <CardTitle className="text-xl">
                    You have started your round 2 project!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 font-sans text-base">
                  <p>
                    You have successfully selected a project for round 2. To
                    know more about the project details or to submit the project
                    requirement, please visit the link below.
                  </p>

                  {/* Countdown Timer */}
                  <div className="mb-4">
                    <CountdownTimer deadline={vettingData.projectDeadline} />
                  </div>

                  {/* Deadline check */}
                  {useMemo(() => {
                    const now = new Date();
                    const deadline = new Date(vettingData.projectDeadline);
                    const missed = isBefore(deadline, now);

                    return missed ? (
                      <>
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          <p className="text-sm font-medium">
                            The deadline for project submission has passed.
                            Please reach out to the support team if you believe
                            this is a mistake or need assistance.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Link
                          href={
                            "/get-started/student/application/stage2/projectSubmit"
                          }
                          className="font-sans font-medium text-sm px-3 py-2 border border-teal-600/10 bg-teal-500/20 hover:bg-teal-500/30 transition-colors rounded flex items-center justify-center gap-2"
                        >
                          Stage 2 Submission / Details
                          <ArrowRight className="size-5" />
                        </Link>
                      </>
                    );
                  }, [vettingData.projectDeadline])}

                  <Link
                    href={`/get-started/student/application/stage2/projectInfo/${vettingProgressResponse.data.selectedProjectSanityId}`}
                    target="_blank"
                    className="font-sans font-medium text-sm px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    View Project Info
                    <ArrowRight className="size-5" />
                  </Link>
                </CardContent>
              </Card>
            </>
          )}
          {status === "round_2_eligible" && currentStage === 2 && (
            <>
              <Card>
                <CardHeader className="px-6 py-4">
                  <CardTitle className="text-xl">
                    You're eligible for Stage 2!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 font-sans text-base">
                  <p className="mb-5">
                    Select a test project of your choice based on the category
                    you filled out earlier. Complete it in the given duration,
                    and submit for review.
                  </p>
                  <Link
                    href={"/get-started/student/application/stage2"}
                    className="font-sans font-medium text-sm px-3 py-2 border border-teal-600/10 bg-teal-500/20 hover:bg-teal-500/30 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    Proceed to Stage 2 <ArrowRight className="size-5" />
                  </Link>
                </CardContent>
              </Card>
            </>
          )}

          {status === "round_2_under_review" && currentStage === 2 && (
            <Alert className="p-6">
              <AlertTitle className="text-xl font-bold text-gray-800">
                Stage 2 submission under review
              </AlertTitle>
              <AlertDescription className="font-sans text-base">
                You've submitted your project. Hang tight while we evaluate it.
                <div className="mt-5">
                  <Link
                    href={"/get-started/student/application/stage2/view"}
                    className="font-sans font-medium text-sm px-3 py-2 border border-gray-600/10 bg-gray-100 hover:bg-gray-500/20 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    View Submitted Application <ArrowRight className="size-5" />
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status === "accepted" && (
            <Card>
              <CardHeader>
                <CardTitle>🎉 Congratulations!</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  You've been accepted. We'll contact you with next steps soon.
                  And you'll be given access to the hustlr app.
                </p>
              </CardContent>
            </Card>
          )}

          {status === "rejected" && (
            <Alert variant="destructive">
              <AlertTitle className="text-lg font-sans">
                Application Rejected!
              </AlertTitle>
              <AlertDescription className="font-sans text-base">
                Unfortunately, your application did not pass the current round.
                But dont worry you can always try again in a few months.
              </AlertDescription>
            </Alert>
          )}

          {currentStage === 1 &&
            !vettingData.isComplete &&
            (status === undefined || status === "not_completed") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {status === "not_completed"
                      ? "Continue your application"
                      : "Start your application"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    {status === "not_completed"
                      ? "You have partial progress saved. Continue filling out your Stage 1 form to complete your application."
                      : "Begin by filling out your Stage 1 form. It helps us to confirm your identity and skillset."}
                  </p>
                  <div className="mt-5">
                    <Link
                      href={"/get-started/student/application/stage1"}
                      className="font-sans font-medium text-sm px-3 py-2 border border-teal-600/10 bg-teal-100 hover:bg-teal-500/20 transition-colors rounded flex items-center justify-center gap-2"
                    >
                      Stage 1 Form <ArrowRight className="size-5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

          {currentStage > 2 && (
            <Alert className="p-6 text-gray-700">
              <AlertTitle className="text-xl font-bold">
                Your Stage Two details!
              </AlertTitle>
              <AlertDescription className="font-sans text-base">
                Please check your stage 2 details, (if you reached and submitted
                it). If you get redirected, means you didnot
                <div className="mt-5">
                  <Link
                    href={"/get-started/student/application/stage2/view"}
                    className="font-sans font-medium text-sm px-3 py-2 border border-gray-600/10 bg-gray-100 hover:bg-gray-500/20 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    View Submitted Application <ArrowRight className="size-5" />
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {currentStage > 1 && (
            <Alert className="p-6 text-gray-700">
              <AlertTitle className="text-xl font-bold">
                Your Stage One is completed!
              </AlertTitle>
              <AlertDescription className="font-sans text-base">
                You successfully cleared the first stage!
                <div className="mt-5">
                  <Link
                    href={"/get-started/student/application/stage1"}
                    className="font-sans font-medium text-sm px-3 py-2 border border-gray-600/10 bg-gray-100 hover:bg-gray-500/20 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    View Submitted Application <ArrowRight className="size-5" />
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            // href={`/get-started/student/application`}
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/get-started/");
            }}
            variant={"outline"}
            className="self-start font-sans font-medium text-sm px-3 py-2 text-black bg-white border border-black/15 hover:bg-gray-500/20 transition-colors rounded flex items-center justify-center gap-2 mb-4"
          >
            <ArrowLeft className="size-5" />
            Sign Out
          </Button>
        </div>
      </main>
    </>
  );
}
