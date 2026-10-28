import type { NextConfig } from "next";

const noStore = [{ key: "Cache-Control", value: "no-store, must-revalidate" }];

const nextConfig: NextConfig = {
  // Logged-in pages are never served from the back/forward cache, so pressing
  // Back after logging out always re-runs the session check.
  async headers() {
    return [
      { source: "/app", headers: noStore },
      { source: "/app/:path*", headers: noStore },
      { source: "/checkout", headers: noStore },
      { source: "/checkout/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
