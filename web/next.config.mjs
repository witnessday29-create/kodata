/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing is computed at request time: every number on the site comes from a
  // data.json committed by the Python pipeline. Static export keeps that honest.
  output: "export",
  images: { unoptimized: true },
  // the dev badge sits exactly where the audit switch lives
  devIndicators: false,
};

export default nextConfig;
