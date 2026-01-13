import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Base Sepolia Testnet Configuration for Hackathon
// Chain ID: 84532
// Explorer: https://sepolia.basescan.org

// Use Alchemy RPC if available, fallback to public RPC
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || 'https://sepolia.base.org';

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC),
  },
})
