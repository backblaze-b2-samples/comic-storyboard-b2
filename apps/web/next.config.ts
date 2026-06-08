import type { NextConfig } from "next";

// Allow next/image to optimize remote panel previews served from Backblaze B2.
// One wildcard covers every region + bucket (virtual-host and path-style):
//   <bucket>.s3.<region>.backblazeb2.com
//   s3.<region>.backblazeb2.com
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.backblazeb2.com" }],
  },
};

export default nextConfig;
