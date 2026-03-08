import { Button } from "@/components/ui/button";
import { createToken, verifyToken } from "@/src/lib/jwt";
import {
  ScoreSectionProvider,
  ScoreButton,
  ScoreBreakdownDisplay,
} from "@/src/components/admin/ScoreBreakdown";
import ApplicantDetailView from "@/src/components/admin/ApplicantDetailView";
import Nav from "@/src/components/Nav";
import { GetVettingProgressResponse } from "@/src/lib/schemas/formSchema";
import { getVettingProgress } from "@/src/lib/vettingUtils";
import { ArrowLeft } from "lucide-react";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const emailId = context.params?.email;
  const adminJwtToken = context.req.cookies.session;
  const adminEmail = (
    process.env.ADMIN_EMAIL || "admin@hustlr.local"
  ).toLowerCase();
  const payload = verifyToken(adminJwtToken as string);

  const tokenEmail = String((payload as any)?.email || "").toLowerCase();
  if (
    typeof payload === "string" ||
    payload.role !== "admin" ||
    tokenEmail !== adminEmail
  ) {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false,
      },
    };
  }
  const userJwtToken = createToken(emailId as string);
  const res = await getVettingProgress(emailId as string);
  return {
    props: { res, userJwtToken, adminJwtToken },
  };
};

export default function ProjectInfoPage({
  res,
  adminJwtToken,
  userJwtToken,
}: {
  res: GetVettingProgressResponse;
  adminJwtToken: string;
  userJwtToken: string;
}) {
  if (!res.success) {
    return (
      <>
        <Nav />
        <main className="md:pt-32 bg-white">
          <h1 className="font-bold text-3xl text-center">Project Details</h1>
          <div className="p-3 max-w-screen-lg mx-auto">
            <p className="text-red-500">
              No data found for the provided email.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="py-32 bg-white">
        <div className="max-w-screen-lg mx-auto">
          <Button asChild variant={"outline"} className="m-5">
            <a href="/admin/" className="flex items-center gap-2 font-sans">
              <ArrowLeft /> Back to Applications
            </a>
          </Button>
          <ScoreSectionProvider
            email={res.data.email}
            jwtToken={adminJwtToken}
            initialScores={res.data.scores}
            initialFinalScore={res.data.final_score}
            initialScoredAt={res.data.scored_at}
          >
            {/* Header row: centered title + rescore button on the right */}
            <div className="grid grid-cols-3 items-center px-10">
              <div /> {/* left spacer */}
              <h1 className="font-bold text-3xl text-center">
                Application Details
              </h1>
              <div className="flex justify-end">
                <ScoreButton />
              </div>
            </div>

            {/* Breakdown renders full-width below the header */}
            <div className="px-10 mt-4">
              <ScoreBreakdownDisplay />
            </div>
          </ScoreSectionProvider>

          <div className="p-10 max-w-screen-lg mx-auto font-sans">
            <ApplicantDetailView jwtToken={userJwtToken} data={res.data} />
          </div>
        </div>
      </main>
    </>
  );
}
