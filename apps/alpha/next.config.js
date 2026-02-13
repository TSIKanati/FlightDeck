/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@flightdeck/ui', '@flightdeck/types'],
};

module.exports = nextConfig;
