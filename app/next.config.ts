import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the local development badge clear of the character navigation dock.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uwifwwsgwtdbcgqycvyh.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
