import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib", "pdfjs-dist"],
};

export default nextConfig;
