import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle so the runtime image does not need
  // node_modules. Keeps the Raspberry Pi image small.
  output: "standalone",

  // Nothing here uses next/image optimisation. Turning it off means no sharp
  // at run time - the Dockerfile also drops its binaries from the bundle.
  images: { unoptimized: true },

  // No reason to advertise the framework.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(process.env.NODE_ENV === "development"),
      },
    ];
  },
};

export default nextConfig;
