/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'cummaimages.s3.eu-north-1.amazonaws.com',
      'example.com',
      's3.amazonaws.com',
      'amazonaws.com',
      'nigga.com',
      'wb.com',
      'localhost',
      'res.cloudinary.com',
      'cloudinary.com',
      'images.unsplash.com',
      'storage.googleapis.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 