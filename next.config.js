/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
// const config = {eslint: {ignoreDuringBuilds: true}};
const config = {
  eslint: {
    ignoreDuringBuilds: true
  },
  sassOptions: {
    includePaths: ['/root/safe-cities-project-management-v2/src/styles'],
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default config;
