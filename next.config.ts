import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "http://localhost:5000",
    "https://*.replit.dev",
    "https://*.replit.app",
    "https://*.worf.replit.dev",
  ],
};

export default nextConfig;
