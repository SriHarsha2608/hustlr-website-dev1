import { ArrowLeft, ArrowRight, CodeSquare } from "lucide-react";
import { GetServerSideProps } from "next";
import { PortableTextBlock } from "sanity";

import { verifyToken } from "@/src/lib/jwt";
import { GetVettingProgressResponse } from "@/src/lib/schemas/formSchema";
import { getVettingProgress } from "@/src/lib/vettingUtils";
import { useRouter } from "next/router";
import Link from "next/link";
import fetchProjectsData from "@/src/lib/fetchProjectsData";
import VettingDataDisplay from "@/src/components/vetting/VettingDetails";
import Nav from "@/src/components/Nav";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookies = req.cookies;
  const token = cookies.session;

  if (!token) {
    return {
      redirect: { destination: "/get-started/verify", permanent: false },
    };
  }

  try {
    const payload = verifyToken(token); // { email }
    const email = typeof payload === "string" ? undefined : payload.email;

    if (!email) {
      return {
        redirect: { destination: "/get-started/verify", permanent: false },
      };
    }

    const vettingProgress: GetVettingProgressResponse =
      await getVettingProgress(email);

    // prevent access to this page if user hasnt submitted project
    if (
      vettingProgress.success &&
      vettingProgress.data.status !== "round_2_under_review"
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

export default function page({
  email,
  token,
  vettingProgressResponse,
}: {
  email: string;
  token: string;
  vettingProgressResponse: GetVettingProgressResponse | null;
}) {
  return (
    <>
      <Nav />

      <main className=" bg-white pt-32 px-4 min-h-screen">
        <div className="max-w-screen-lg mx-auto">
          <div className="p-6 bg-green-50 rounded-lg text-green-800 font-sans font-medium text-xl">
            <p className="mb-5">
              <span className="block mb-2">
                Hey{" "}
                {vettingProgressResponse?.success
                  ? vettingProgressResponse.data.name
                  : email}
                ,
              </span>
              🎉 You have completed your stage 2 project submission.
            </p>
            <Link
              href={`/get-started/student/application`}
              className="self-start font-sans font-medium text-sm px-3 py-2 text-black bg-white border border-gray-700/40 hover:bg-gray-500/20 transition-colors rounded flex items-center justify-center gap-2 mb-4"
            >
              <ArrowLeft className="size-5" />
              Back to Applications
            </Link>
            <Link
              href={"/get-started/student/application/status"}
              className="w text-sm px-3 py-2 bg-green-500/20 hover:bg-green-600/30 border border-green-900/10 transition-colors rounded flex items-center justify-center gap-2"
            >
              Check application status <ArrowRight className="size-5" />
            </Link>
            <br />

            <div className="bg-white p-3 rounded pl-2 md:pl-5 !containertext-lg">
              <VettingDataDisplay
                jwtToken={token}
                // to remove these fields from rendering
                data={Object.fromEntries(
                  Object.entries(
                    vettingProgressResponse?.success
                      ? vettingProgressResponse.data
                      : {},
                  ).filter(([key]) =>
                    ["videoLink", "otherLinks"].includes(key),
                  ),
                )}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
