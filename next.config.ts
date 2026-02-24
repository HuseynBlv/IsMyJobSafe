import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok URL to load React assets during development
  // @ts-ignore - allowedDevOrigins is missing from NextConfig type in this version
  allowedDevOrigins: ["tiresome-hypereutectoid-bonny.ngrok-free.dev", "localhost:3000"],
};

export default nextConfig;
