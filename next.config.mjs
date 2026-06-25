import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: "https://tsurilogue.tapiyota.com/:path*"
      }
    ];
  }
};

export default withNextIntl(nextConfig);
