import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  ...(process.env["BASE_PATH"] ? { basePath: process.env["BASE_PATH"] } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
