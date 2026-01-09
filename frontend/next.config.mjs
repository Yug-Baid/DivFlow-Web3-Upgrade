/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabling verify for hydration issues
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    config.resolve.fallback = { 
        ...config.resolve.fallback,
        fs: false, 
        net: false, 
        tls: false,
        crypto: "crypto-browserify",
        stream: "stream-browserify",
        vm: "vm-browserify",
        http: "stream-http",
        https: "https-browserify",
        os: "os-browserify",
    };
    config.resolve.alias = {
        ...config.resolve.alias,
        "node:buffer": "buffer",
        "node:util": "util",
        "node:stream": "stream-browserify",
        "node:process": "process/browser",
        "@react-native-async-storage/async-storage": false,
        "react-native": false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      })
    );
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
      },
      {
        protocol: 'https',
        hostname: 'dweb.link',
      },
    ],
  },
};

export default nextConfig;
