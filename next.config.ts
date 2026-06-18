import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    resolveAlias: {
      "@mediapipe/pose": "./src/utils/empty.js",
    },
  },
  webpack: (config) => {
    // Ignore @mediapipe/pose since we only use MoveNet and it causes build errors in Next.js
    config.resolve.alias = {
      ...config.resolve.alias,
      "@mediapipe/pose": false,
    };
    return config;
  },
};

export default nextConfig;
