import type { NextConfig } from "next";

const allowedDevOrigins = ["localhost:3000"];
const devTunnelHost = process.env.DEV_TUNNEL_HOST?.trim();

if (devTunnelHost) {
  allowedDevOrigins.unshift(devTunnelHost);
}

const nextConfig = {
  allowedDevOrigins,
} satisfies NextConfig & {
  allowedDevOrigins: string[];
};

export default nextConfig;
