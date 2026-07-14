import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** Station iframe player — must be embeddable on external sites. */
const embedHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors *" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "autoplay=(self), camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // WebRTC collab on /collab requires camera + mic on this origin.
    value: "camera=(self), microphone=(self), geolocation=(), payment=()",
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.178.96", "localhost", "127.0.0.1"],
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-pg",
    "pg",
  ],
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: embedHeaders,
      },
      {
        source: "/((?!embed).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
