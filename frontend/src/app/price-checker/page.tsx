// ETH to INR Price Checker Page
// Dedicated page for citizens to check conversion rates

'use client';

import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { GlassCard } from '@/components/shared/GlassCard';
import { EthPriceConverter } from '@/components/shared/EthPriceConverter';
import { useEthPrice } from '@/hooks/useEthPrice';
import { TrendingUp, TrendingDown, DollarSign, Info } from 'lucide-react';

export default function PriceCheckerPage() {
  const { inr, change24h, loading, error } = useEthPrice();

  const isPositive = change24h >= 0;

  const popularConversions = [
    { eth: 0.1, label: '0.1 ETH' },
    { eth: 0.5, label: '0.5 ETH' },
    { eth: 1, label: '1 ETH' },
    { eth: 2, label: '2 ETH' },
    { eth: 5, label: '5 ETH' },
    { eth: 10, label: '10 ETH' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            ETH Price Checker
          </h1>
          <p className="text-muted-foreground">
            Check real-time Ethereum to Indian Rupee conversion rates for property pricing
          </p>
        </div>

        {/* Main Price Display */}
        <GlassCard className="mb-6 p-8">
          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">Current Exchange Rate</div>
            
            {loading && inr === 0 ? (
              <div className="animate-pulse text-2xl text-muted-foreground">Loading...</div>
            ) : error && !inr ? (
              <div className="text-destructive">Failed to load price</div>
            ) : (
              <>
                <div className="text-5xl font-bold text-gradient">
                  ₹{inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div className="text-xl text-muted-foreground">per 1 ETH</div>
                
                {change24h !== 0 && (
                  <div className={`flex items-center justify-center gap-2 text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    <span className="font-medium">
                      {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                    </span>
                    <span className="text-sm text-muted-foreground">(24 hours)</span>
                  </div>
                )}

                {error && (
                  <div className="text-yellow-600 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    ⚠️ {error}
                  </div>
                )}
              </>
            )}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Interactive Converter */}
          <EthPriceConverter showConverter className="h-full" />

          {/* Popular Conversions */}
          <GlassCard className="h-full">
            <div className="border-b p-4 bg-muted/50">
              <h3 className="font-semibold">Quick Reference</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Common property price conversions
              </p>
            </div>
            
            <div className="p-4 space-y-3">
              {popularConversions.map(({ eth, label }) => {
                const inrValue = eth * inr;
                return (
                  <div key={label} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="font-medium">{label}</span>
                    <span className="text-sm">
                      = <span className="font-bold text-primary">₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Information Section */}
        <GlassCard className="bg-blue-500/5 border-blue-500/20">
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold text-foreground">How to use this tool:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Check current rates</strong>: The ETH to INR price updates automatically every minute</li>
                  <li>• <strong>Convert amounts</strong>: Use the converter to calculate property prices in INR</li>
                  <li>• <strong>List properties</strong>: Set your property price in ETH, see the INR equivalent</li>
                  <li>• <strong>Make offers</strong>: Calculate how much INR you'll need when making offers</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-blue-500/20 pt-3 mt-3">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Prices are fetched from CoinGecko and update in real-time. 
                  Actual transaction amounts are in ETH. The INR value is for reference only.
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Historical Data Placeholder */}
        <GlassCard className="mt-6">
          <div className="p-4 border-b bg-muted/50">
            <h3 className="font-semibold">Price Trends</h3>
            <p className="text-xs text-muted-foreground mt-1">
              24-hour price movement
            </p>
          </div>
          
          <div className="p-8 text-center text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Price trend charts coming soon</p>
            <p className="text-xs mt-1">Track ETH/INR historical data</p>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
