import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase serverless function timeout for database operations
  serverExternalPackages: ["pg"],

  // Experimental features for better RSC performance
  experimental: {
    // Optimize server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
