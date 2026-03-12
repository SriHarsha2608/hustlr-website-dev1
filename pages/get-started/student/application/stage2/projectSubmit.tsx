import fetchProjectsData from "@/src/lib/fetchProjectsData";
import { GetServerSideProps } from "next";
import React, { useMemo } from "react";

import { verifyToken } from "@/src/lib/jwt";
import { GetVettingProgressResponse } from "@/src/lib/schemas/formSchema";
import { getVettingProgress } from "@/src/lib/vettingUtils";
import Nav from "@/src/components/Nav";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProjectSubmissionForm from "@/src/components/stage2/ProjectSubmissionForm";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { isBefore } from "date-fns";
import { CountdownTimer } from "@/src/components/stage2/CountdownTimer";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookies = req.cookies;
  const jwtToken = cookies.session;

  if (!jwtToken) {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  try {
    const payload = verifyToken(jwtToken); // { email }
    const email = typeof payload === "string" ? undefined : payload.email;

    if (!email) {
      return {
        redirect: { destination: "/get-started/", permanent: false },
      };
    }

    const vettingProgress: GetVettingProgressResponse =
      await getVettingProgress(email);

    // prevent access to this page if user already completed it
    if (
      vettingProgress.success &&
      vettingProgress.data.status !== "round_2_project_selected"
    ) {
      return {
        redirect: {
          destination: "/get-started/student/application",
          permanent: false,
        },
      };
    }
    return {
      props: {
        email,
        jwtToken,
        vettingProgressResponse: vettingProgress,
      },
    };
  } catch {
    return {
      redirect: { destination: "/get-started/", permanent: false },
    };
  }
};

const projectSubmit = ({
  vettingProgressResponse,
  email,
  jwtToken,
}: {
  vettingProgressResponse: GetVettingProgressResponse;
  email: string;
  jwtToken: string;
}) => {
  if (!vettingProgressResponse.success) {
    return (
      <main className="pt-32 text-center text-red-600">
        An error occurred while fetching your data.
      </main>
    );
  }
  const vettingData = vettingProgressResponse.data;

  return (
    <>
      <Nav />

      <main className="bg-white min-h-screen text-black py-32 font-sans">
        <div className="max-w-screen-sm mx-auto flex flex-col gap-6">
          <Link
            href={`/get-started/student/application`}
            className="self-start font-sans font-medium text-sm px-3 py-2 bg-transparent border border-gray-700/40 hover:bg-gray-500/30 transition-colors rounded flex items-center justify-center gap-2"
          >
            <ArrowLeft className="size-5" />
            Back to Applications
          </Link>
          <h1 className="text-2xl font-bold">Submit Your Project</h1>
          <div className="">
            <p className="text-black text-base mb-4">
              View your selected project's details:{" "}
              {/* <Link
              href={`/get-started/student/application/stage2/projectInfo/${vettingProgressResponse.data.selectedProjectSanityId}`}
            >
              View Project Info
            </Link> */}
            </p>
            <Link
              href={`/get-started/student/application/stage2/projectInfo/${vettingProgressResponse.data.selectedProjectSanityId}`}
              className="font-sans font-medium text-sm px-3 py-2 bg-teal-500/20 hover:bg-teal-500/30 transition-colors rounded flex items-center justify-center gap-2"
            >
              View Project Info
              <ArrowRight className="size-5" />
            </Link>
          </div>
          <Separator />
          <div className="mb-4 border py-2 bg-gray-50">
            <CountdownTimer deadline={vettingData.projectDeadline} />
          </div>
          {useMemo(() => {
            const now = new Date();
            const deadline = new Date(vettingData.projectDeadline);
            const missed = isBefore(deadline, now);

            return missed ? (
              <>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                  <AlertTriangle className="size-10" />
                  <p className="text-sm font-medium">
                    The deadline for project submission has passed. Please reach
                    out to the support team if you believe this is a mistake or
                    need assistance.
                  </p>
                </div>
              </>
            ) : (
              <ProjectSubmissionForm email={email} jwtToken={jwtToken} />
            );
          }, [vettingData.projectDeadline])}
        </div>
      </main>
    </>
  );
};

export default projectSubmit;
