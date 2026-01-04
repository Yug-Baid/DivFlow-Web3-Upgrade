import { http, createConfig } from 'wagmi'
import { foundry } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Define Anvil local chain explicitly
const anvilLocal = {
  ...foundry,
  id: 31337,
  name: 'Anvil Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
};

export const config = createConfig({
  // ONLY use Anvil local chain - remove mainnet/sepolia to prevent confusion
  chains: [anvilLocal],
  connectors: [
    injected(),
  ],
  transports: {
    [anvilLocal.id]: http('http://127.0.0.1:8545'),
  },
})
