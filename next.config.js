/** @type {import('next').NextConfig} */
const nextConfig = {
  logging: {
    fetches: {
      fullUrl: false
    },
    level: 'warn'
  }
}

module.exports = nextConfig 