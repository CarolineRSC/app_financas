import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias['canvas'] = false
    config.resolve.alias['encoding'] = false
    return config
  },
};

export default nextConfig;
