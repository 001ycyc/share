import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许跨域 HMR，解决远程浏览器热更新被阻止的问题
  allowedDevOrigins: [
    "run-agent-69db5d661e7852e64b31f47b-mnvp9zw0.remote-agent.svc.cluster.local",
  ],
};

export default nextConfig;
