import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    images: {
        unoptimized: true
    },
    devIndicators: {
        buildActivity: false
    },
    // Disable all development features
    experimental: {
        webVitalsAttribution: [],
    },
    // Disable development toast/banner
    onDemandEntries: {
        maxInactiveAge: 0,
    }
};

export default nextConfig;
