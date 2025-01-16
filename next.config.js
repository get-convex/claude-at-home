/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Ensure we handle /src directory properly
  pageExtensions: ['tsx', 'ts'],
  // Configure environment variables
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
};
