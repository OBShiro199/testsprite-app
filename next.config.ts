import type { NextConfig } from "next";

const noStore = [{ key: "Cache-Control", value: "no-store, must-revalidate" }];

const nextConfig: NextConfig = {
  // Lets a local test build use its own folder without disturbing `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Logged-in pages are never served from the back/forward cache, so pressing
  // Back after logging out always re-runs the session check.
  // Common guesses at the billing and checkout addresses lead to the real pages
  // (each page still runs its own owner-only check).
  async redirects() {
    return [
      { source: "/billing", destination: "/app/billing", permanent: false },
      { source: "/app/checkout", destination: "/checkout", permanent: false },
      { source: "/app/checkout/success", destination: "/checkout/success", permanent: false },
    ];
  },
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
