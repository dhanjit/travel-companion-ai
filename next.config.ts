import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Lets `next dev` read Cloudflare bindings/secrets from .dev.vars locally.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
