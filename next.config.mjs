/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The website's own photos and icons in public/assets are kept by the
  // browser for a day and reused while they are checked afterwards, so a
  // second page does not ask for each one again. A replaced file with the
  // same name reaches everyone within a day; a new name shows at once.
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
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
