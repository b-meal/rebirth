import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rebirth/db", "@rebirth/types"],
};

export default nextConfig;
