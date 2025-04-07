/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  experimental: {
    // Remove serverActions: true if it exists
  }
};

module.exports = nextConfig;
