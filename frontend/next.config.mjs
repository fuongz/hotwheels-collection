/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		unoptimized: true,
		remotePatterns: [new URL("https://cdn-hwc.phake.app/**")],
	},
};

export default nextConfig;
