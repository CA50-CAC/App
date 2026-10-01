import type { NextConfig } from "next";

/** Pages that belong to a school or an admin. Search engines must never index them. */
const NOINDEX_PATHS = ["/s/:path*", "/admin/:path*", "/setup", "/setup/:path*", "/platform/:path*", "/invite/:path*", "/auth/:path*", "/login"];

const nextConfig: NextConfig = {
  // PGlite (Postgres compiled to WebAssembly) loads its own .wasm files at
  // runtime, so Next must not try to bundle it.
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],

  experimental: {
    serverActions: {
      // Photos are shrunk in the browser first, so real uploads are well under
      // this. Vercel caps function request bodies at 4.5MB, so stay below it.
      bodySizeLimit: "4.4mb",
    },
  },

  async headers() {
    return NOINDEX_PATHS.map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
};

export default nextConfig;
