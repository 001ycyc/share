import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许跨域 HMR
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",") || [],
};

export default nextConfig;
