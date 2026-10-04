import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@wokwi/elements", "lit"],
};

export default nextConfig;
