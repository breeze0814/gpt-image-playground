import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), "../..", ".env"), quiet: true });

/** @type {import("next").NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  transpilePackages: ["@image-playground/core", "@image-playground/db"],
};

export default nextConfig;
