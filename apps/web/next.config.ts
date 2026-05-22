import type { NextConfig } from "next";

// Wagmi v3 bundles connectors that have optional peer deps we don't use.
// Stub them so webpack doesn't fail resolving uninstalled packages.
const WAGMI_OPTIONAL_PEER_DEPS = [
  'porto',
  'porto/internal',
  'accounts',
  '@base-org/account',
  '@coinbase/wallet-sdk',
  '@metamask/connect-evm',
  '@walletconnect/ethereum-provider',
  '@safe-global/safe-apps-sdk',
  '@safe-global/safe-apps-provider',
];

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    const stubs = Object.fromEntries(WAGMI_OPTIONAL_PEER_DEPS.map(dep => [dep, false]));
    config.resolve.alias = { ...config.resolve.alias, ...stubs };
    return config;
  },
};

export default nextConfig;
