import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
// Report-only for now: violations are logged by the browser, nothing is blocked.
// Switch the header name to Content-Security-Policy once reports are clean.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms https://*.clarity.ms https://va.vercel-scripts.com https://js.sentry-cdn.com https://esm.sh",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.clarity.ms https://vitals.vercel-insights.com https://va.vercel-scripts.com https://esm.sh https://*.imgly.com https://staticimgly.com https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig = {
  transpilePackages: ["@udo-craft/shared", "@udo-craft/ui", "@udo-craft/config", "@udo-craft/styles"],
  experimental: {
    optimizePackageImports: ['@udo-craft/ui'],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@imgly/background-removal', 'fabric', 'canvas'];
    } else {
      // Force webpack to treat .mjs files as ES modules so import.meta is valid
      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/esm',
      });
    }
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: { fullySpecified: false },
    });
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hsyxyzmnhjybklvlaelw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "udoslay.api.keycrm.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.keycrm.app",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "udo-craft",
  project: "udocraft-client",
  silent: !process.env.CI,
  disableReplayInjection: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
