import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  // Pin the workspace root to this project. Without it, a stray lockfile in a
  // parent directory makes Next.js infer the wrong root for output file tracing.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "crests.football-data.org" }],
  },
};

export default config;
