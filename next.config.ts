import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/csp";
const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: { sri: { algorithm: "sha256" } },
  images: { unoptimized: true },
  trailingSlash: true,
  async headers() {
    let storageOrigin = "";
    try { storageOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin; } catch {}
    // Cached public pages retain an inline-script allowance for Next's changing
    // RSC bootstrap. The proxy applies per-request nonces to checkout/admin.
    const publicCsp = contentSecurityPolicy({storageOrigin,development:process.env.NODE_ENV==="development"});
    return [
      { source: "/((?!admin|checkout).*)", headers: [{ key: "Content-Security-Policy", value: publicCsp }] },
      { source: "/(.*)", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
      ] },
    ];
  },
};
export default config;
