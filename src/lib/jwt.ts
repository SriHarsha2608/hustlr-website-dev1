import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET!;

export const createToken = (email: string) => {
  return jwt.sign({ email, role: "user" }, JWT_SECRET, { expiresIn: "7d" });
};
export const createAdminToken = (email: string) => {
  return jwt.sign({ email, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
};
export const createClientToken = (email: string) => {
  return jwt.sign({ email, role: "client" }, JWT_SECRET, { expiresIn: "7d" });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
