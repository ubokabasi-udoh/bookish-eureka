import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next 16 allows only one dev server per build directory. End-to-end tests set NEXT_DIST_DIR
   * so they can run their own server without disturbing an already-running `next dev`.
   */
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
};

export default nextConfig;
