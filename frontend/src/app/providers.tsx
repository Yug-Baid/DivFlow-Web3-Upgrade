'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { IPFSProvider } from '@/contexts/IPFSContext'

import { config } from '@/lib/config'

// Base Sepolia chain configuration for network switching
const BASE_SEPOLIA_CHAIN = {
  chainId: '0x14A34', // 84532 in hex
  chainName: 'Base Sepolia',
  rpcUrls: ['https://sepolia.base.org'],
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  blockExplorerUrls: ['https://sepolia.basescan.org'],
};

export function Providers(props: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Automatically request network switch to Base Sepolia on mount
  useEffect(() => {
    const switchToBaseSepolia = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          // Try switching to Base Sepolia
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_SEPOLIA_CHAIN.chainId }],
          });
        } catch (switchError: any) {
          // If chain doesn't exist, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [BASE_SEPOLIA_CHAIN],
              });
            } catch (addError) {
              console.error('Failed to add Base Sepolia chain:', addError);
            }
          } else {
            console.error('Failed to switch to Base Sepolia:', switchError);
          }
        }
      }
    };

    switchToBaseSepolia();
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
