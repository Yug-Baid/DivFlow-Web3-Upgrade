// Custom React Hook: useEthPrice
// Fetches and manages ETH to INR price data with auto-refresh

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EthPriceData {
  inr: number;
  change24h: number;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface UseEthPriceOptions {
  refreshInterval?: number; // in milliseconds, default 60000 (1 minute)
  enabled?: boolean; // whether to fetch, default true
}

export function useEthPrice(options: UseEthPriceOptions = {}) {
  const { refreshInterval = 60000, enabled = true } = options;

  const [priceData, setPriceData] = useState<EthPriceData>({
    inr: 0,
    change24h: 0,
    loading: true,
    error: null,
    lastUpdated: 0
  });

  const fetchPrice = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch('/api/eth-price');
      const data = await response.json();

      if (data.success) {
        setPriceData({
          inr: data.price,
          change24h: data.change24h,
          loading: false,
          error: null,
          lastUpdated: data.lastUpdated || data.timestamp
        });
      } else {
        // Use fallback price if available
        if (data.fallbackPrice) {
          setPriceData({
            inr: data.fallbackPrice,
            change24h: 0,
            loading: false,
            error: 'Using approximate price (API unavailable)',
            lastUpdated: data.timestamp
          });
        } else {
          setPriceData(prev => ({
            ...prev,
            loading: false,
            error: data.error || 'Failed to fetch price'
          }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching ETH price:', error);
      setPriceData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Network error'
      }));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Fetch immediately on mount
    fetchPrice();

    // Set up interval for auto-refresh
    const interval = setInterval(fetchPrice, refreshInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [fetchPrice, refreshInterval, enabled]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setPriceData(prev => ({ ...prev, loading: true }));
    fetchPrice();
  }, [fetchPrice]);

  // Conversion helper function
  const convertEthToInr = useCallback((ethAmount: number) => {
    return ethAmount * priceData.inr;
  }, [priceData.inr]);

  // Conversion helper function
  const convertInrToEth = useCallback((inrAmount: number) => {
    if (priceData.inr === 0) return 0;
    return inrAmount / priceData.inr;
  }, [priceData.inr]);

  return {
    ...priceData,
    refresh,
    convertEthToInr,
    convertInrToEth
  };
}
