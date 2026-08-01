import { BASE_PATH } from "./src/lib/site";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  ...(BASE_PATH ? { basePath: BASE_PATH } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
