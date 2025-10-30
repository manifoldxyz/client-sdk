if (typeof globalThis.indexedDB === 'undefined') {
  require('fake-indexeddb/auto');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
