if (typeof globalThis.indexedDB === 'undefined') {
  // Ensure wallet connectors that expect indexedDB can run during SSR builds
  require('fake-indexeddb/auto');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
