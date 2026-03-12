import { Button } from "@/components/ui/button";
import fetchProjectsData from "@/src/lib/fetchProjectsData";
import Nav from "@/src/components/Nav";
import ProjectCard from "@/src/components/stage2/ProjectCard";
import ProjectSelection from "@/src/components/stage2/ProjectSelection";
import TimelineDots from "@/src/components/Timeline";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { ArrowLeft, ArrowRight, CodeSquare } from "lucide-react";
import { GetServerSideProps } from "next";
import React, { useEffect, useState } from "react";
import { PortableTextBlock } from "sanity";

import { verifyToken } from "@/src/lib/jwt";
import { GetVettingProgressResponse } from "@/src/lib/schemas/formSchema";
import { getVettingProgress } from "@/src/lib/vettingUtils";
import { useRouter } from "next/router";
import Link from "next/link";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const res = await fetchProjectsData();
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

    // prevent access to this page if user already selected a project
    if (
      vettingProgress.success &&
      vettingProgress.data.status !== "round_2_eligible"
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
        res,
      },
    };
  } catch {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }
};

type Project = {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  projectCategory: string;
  images: SanityImageSource[];
  duration: number;
  detailedDesc: PortableTextBlock[];
  [key: string]: any;
};

type FilteredProject = {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  duration: number;
  images: SanityImageSource[];
  detailedDesc: PortableTextBlock[];
  projectCategory: string;
};

function groupProjectsByCategory(projects: Project[]) {
  return projects.reduce((acc: Record<string, Project[]>, project) => {
    const category = project.projectCategory || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(project);
    return acc;
  }, {});
}

function Stage2({
  res,
  email,
  token,
  vettingProgressResponse,
}: {
  res: any;
  email: string;
  token: string;
  vettingProgressResponse: GetVettingProgressResponse | null;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [projectChosen, setProjectChosen] = useState<FilteredProject | null>(
    null,
  );
  const router = useRouter();
  let data: Record<string, Project[]> = {};
  if (res.success) data = groupProjectsByCategory(res.data);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state;

      if (state?.page === 3 && state.project) {
        setProjectChosen(state.project);
        setCurrentPage(3);
      } else if (state?.page === 2) {
        setProjectChosen(null);
        setCurrentPage(2);
      } else if (state?.page === 1) {
        setProjectChosen(null);
        setCurrentPage(1);
      }
    };

    // Push initial state for page 1
    window.history.replaceState({ page: 1 }, "", "?start=true");
    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  if (
    !vettingProgressResponse?.success ||
    vettingProgressResponse.data.currentStage !== 2
  ) {
    return (
      <>
        <Nav />
        <main className="min-h-screen py-32 px-4 bg-white transition-all">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-black font-sans">
              {vettingProgressResponse?.success
                ? "You are not yet eligible for round 2"
                : "An unexpected error occurred"}
            </h1>
            <p className="mt-3 font-sans font-medium text-lg max-w-[50ch]">
              {vettingProgressResponse?.success ? (
                <>
                  <p>
                    Please proceed back to the application page to know your
                    application status
                  </p>

                  <Link
                    href={"/get-started/student/application"}
                    className="font-sans font-medium text-sm px-3 py-2 bg-teal-500/20 hover:bg-teal-500/30 transition-colors rounded flex items-center justify-center gap-2"
                  >
                    View Application Status <ArrowRight className="size-5" />
                  </Link>
                </>
              ) : (
                "An unexpected error occurred"
              )}
            </p>
          </div>
        </main>
      </>
    );
  }
  return (
    <>
      <Nav />
      <main className="min-h-screen py-32 px-4 bg-white transition-all">
        <div className="max-w-screen-lg mx-auto">
          <TimelineDots currentStep={1} totalSteps={3} />
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-black">
              Round 2: Test Project
            </h1>
            <p className="mt-3 font-sans font-medium text-lg max-w-[50ch]">
              Hooray, you've made it to the final stage. Now you need to select
              and complete a project of your choice, which will be evaluated.
            </p>

            {res.success === false ? (
              <p>Error fetching the projects...</p>
            ) : (
              <>
                {/* Page 1 */}
                {currentPage === 1 && (
                  <Button
                    onClick={() => {
                      window.history.pushState(
                        { page: 2 },
                        "",
                        "?project-selection=true",
                      );
                      setCurrentPage(2);
                    }}
                    className="bg-teal-800 px-5 py-2 rounded-full mt-5 hover:bg-teal-950"
                  >
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}

                {/* Page 2: Select a project */}
                {currentPage === 2 && (
                  <>
                    {Object.keys(data).map((category: string, i: number) => (
                      <div key={i} className="my-5">
                        <hr className="mt-5 mb-8 bg-gray-600/80" />
                        <h2 className="text-teal-800 font-sans font-medium text-2xl flex items-center gap-2 mb-5">
                          <CodeSquare />
                          {category}
                        </h2>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 sm:mx-0 gap-4 p-4">
                          {data[category].map(
                            (projData: FilteredProject, i: number) => {
                              const { name, desc, tags, images } = projData;

                              return (
                                <ProjectCard
                                  key={i}
                                  onClick={() => {
                                    const fullProject = {
                                      ...projData,
                                      projectCategory: category,
                                    };
                                    window.history.pushState(
                                      { page: 3, project: fullProject },
                                      "",
                                      `?project=${projData.id}`,
                                    );
                                    setProjectChosen(fullProject);
                                    setCurrentPage(3);
                                  }}
                                  name={name}
                                  desc={desc}
                                  images={images}
                                  tags={tags}
                                />
                              );
                            },
                          )}
                        </div>
                      </div>
                    ))}

                    <Button
                      onClick={() => {
                        window.history.pushState(
                          { page: 1 },
                          "",
                          "?start=true",
                        );
                        setCurrentPage(1);
                        setProjectChosen(null);
                      }}
                      variant="outline"
                      className="mt-6 font-sans"
                    >
                      <ArrowLeft /> Back to Start
                    </Button>
                  </>
                )}

                {/* Page 3: Project Details */}
                {currentPage === 3 && projectChosen && (
                  <>
                    <ProjectSelection
                      projectChosen={projectChosen}
                      email={email}
                      jwtToken={token}
                      router={router}
                    />

                    <div className="flex justify-center">
                      <Button
                        onClick={() => {
                          window.history.pushState(
                            { page: 2 },
                            "",
                            "?project-selection=true",
                          );
                          setProjectChosen(null);
                          setCurrentPage(2);
                        }}
                        variant="outline"
                        className="mt-6 font-sans"
                      >
                        <ArrowLeft /> Back to Project Selection
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default Stage2;
