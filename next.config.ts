import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:5000",
    "https://*.replit.dev",
    "https://*.replit.app",
    "https://*.worf.replit.dev",
  ],
};

export default nextConfig;
