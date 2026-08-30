import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory otherwise makes Turbopack
  // infer the workspace root as ~, which pulls in unrelated files.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // Dev only: allow previewing over the LAN address as well as localhost.
  // Without this Next blocks its own dev chunks cross-origin, the client
  // bundle never loads, and every interactive post silently stops hydrating.
  allowedDevOrigins: ["192.168.1.110"],
};

export default nextConfig;
