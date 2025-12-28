import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, foundry } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [foundry, sepolia, mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [foundry.id]: http(),
  },
})
