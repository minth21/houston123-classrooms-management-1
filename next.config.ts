import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://erp.houston123.edu.vn/api/:path*', // Proxy to the actual API
      },
    ];
  },
};

export default nextConfig;
