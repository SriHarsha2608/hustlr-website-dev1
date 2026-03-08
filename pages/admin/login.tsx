import { verifyToken } from "@/src/lib/jwt";
import AdminLogin from "@/src/components/admin/AdminLogin";
import { GetServerSideProps } from "next";

import React from "react";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const adminEmail = (
    process.env.ADMIN_EMAIL || "admin@hustlr.local"
  ).toLowerCase();
  try {
    const adminJwtToken = context.req.cookies.session;
    //handle if no token is present
    if (!adminJwtToken) {
      return {
        props: {},
      };
    }
    const payload = verifyToken(adminJwtToken as string);

    if (
      typeof payload === "object" &&
      payload.role === "admin" &&
      String(payload.email || "").toLowerCase() === adminEmail
    ) {
      return {
        redirect: {
          destination: "/admin/",
          permanent: false,
        },
      };
    }
  } catch (error) {
    console.error("not logged in token:", error);
  }
  // Always return a valid result
  return {
    props: {},
  };
};

const login = () => {
  return <AdminLogin />;
};

export default login;
