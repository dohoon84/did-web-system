import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    APP_ENV: process.env.NODE_ENV || 'development',
  },
};

export default nextConfig;
