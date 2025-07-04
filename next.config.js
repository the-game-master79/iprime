/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    unoptimized: true, // This disables the default Image Optimization API
  },
  // Add other configurations here if needed
}

module.exports = nextConfig
