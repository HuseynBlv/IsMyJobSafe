import type { NextConfig } from "next";

const allowedDevOrigins = ["localhost:3000"];
const devTunnelHost = process.env.DEV_TUNNEL_HOST?.trim();
const projectRoot = process.cwd();

if (devTunnelHost) {
  allowedDevOrigins.unshift(devTunnelHost);
}

const nextConfig = {
  allowedDevOrigins,
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
} satisfies NextConfig & {
  allowedDevOrigins: string[];
};

export default nextConfig;
