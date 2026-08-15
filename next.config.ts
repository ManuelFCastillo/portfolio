import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory otherwise makes Turbopack
  // infer the workspace root as ~, which pulls in unrelated files.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
