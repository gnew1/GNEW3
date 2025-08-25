/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  env: {
    NEXT_PUBLIC_METRICS_API: process.env.NEXT_PUBLIC_METRICS_API || "http://localhost:8007"
  }
};
module.exports = nextConfig;
