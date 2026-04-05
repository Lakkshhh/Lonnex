import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Avoid inferring workspace root from a lockfile in a parent dir (e.g. ~/package-lock.json).
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
