/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GITHUB_OWNER: process.env.GITHUB_OWNER || 'eliaguilar',
    GITHUB_REPO: process.env.GITHUB_REPO || 'PNNCLE-Automation-Testing',
  },
}

module.exports = nextConfig

