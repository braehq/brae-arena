import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Silence workspace root warning on Railway/monorepo setups
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
