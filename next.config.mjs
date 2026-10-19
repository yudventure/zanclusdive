/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Hostinger's build server reports 64 CPUs but allows few threads per
    // account. Next would start 63 workers to collect page data, each with
    // its own threads, and the build stops with "OS can't spawn worker
    // thread" (os error 11). One worker process keeps it within the limit.
    cpus: 1,
    workerThreads: false,
  },
};
export default config;
