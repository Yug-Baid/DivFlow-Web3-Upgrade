'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { IPFSProvider } from '@/contexts/IPFSContext'

import { config } from '@/lib/config'

// Anvil chain configuration for network switching
const ANVIL_CHAIN = {
  chainId: '0x7A69', // 31337 in hex
  chainName: 'Anvil Local',
  rpcUrls: ['http://127.0.0.1:8545'],
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
};

export function Providers(props: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Automatically request network switch to Anvil on mount
  useEffect(() => {
    const switchToAnvil = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          // Try switching to Anvil
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ANVIL_CHAIN.chainId }],
          });
        } catch (switchError: any) {
          // If chain doesn't exist, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [ANVIL_CHAIN],
              });
            } catch (addError) {
              console.error('Failed to add Anvil chain:', addError);
            }
          } else {
            console.error('Failed to switch to Anvil:', switchError);
          }
        }
      }
    };

    switchToAnvil();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <IPFSProvider>
          {props.children}
        </IPFSProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
