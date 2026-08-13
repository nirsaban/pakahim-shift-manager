import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Baileys is pure ESM and pulls in native/optional deps that the server
  // bundler mangles; leaving it external means Node loads it from node_modules
  // at runtime, which is also why lib/whatsapp/service.ts imports it lazily.
  serverExternalPackages: ["baileys", "pino"],
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
