// ETH to INR Price Converter Component
// Displays real-time ETH price and conversion calculator

'use client';

import { useState, useEffect } from 'react';
import { useEthPrice } from '@/hooks/useEthPrice';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface EthPriceConverterProps {
  defaultAmount?: number;
  showConverter?: boolean;
  compact?: boolean;
  className?: string;
}

export function EthPriceConverter({ 
  defaultAmount = 1, 
  showConverter = true, 
  compact = false,
  className = ''
}: EthPriceConverterProps) {
  const { inr, change24h, loading, error, lastUpdated, refresh, convertEthToInr, convertInrToEth } = useEthPrice();
  const [ethAmount, setEthAmount] = useState(defaultAmount.toString());
  const [inrAmount, setInrAmount] = useState('0');
  const [activeInput, setActiveInput] = useState<'eth' | 'inr'>('eth');

  // Update INR when ETH changes
  useEffect(() => {
    if (activeInput === 'eth') {
      const eth = parseFloat(ethAmount) || 0;
      setInrAmount(convertEthToInr(eth).toFixed(2));
    }
  }, [ethAmount, activeInput, convertEthToInr]);

  // Update ETH when INR changes
  useEffect(() => {
    if (activeInput === 'inr') {
      const inr = parseFloat(inrAmount) || 0;
      setEthAmount(convertInrToEth(inr).toFixed(6));
    }
  }, [inrAmount, activeInput, convertInrToEth]);

  const handleEthChange = (value: string) => {
    setActiveInput('eth');
    setEthAmount(value);
  };

  const handleInrChange = (value: string) => {
    setActiveInput('inr');
    setInrAmount(value);
  };

  const isPositive = change24h >= 0;
  const timeAgo = getTimeAgo(lastUpdated);

  // Loading state
  if (loading && inr === 0) {
    return (
      <div className={`rounded-lg border bg-card p-4 ${className}`}>
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading ETH price...
        </div>
      </div>
    );
  }

  // Compact view (minimal display)
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {error && !inr ? (
          <div className="flex items-center gap-2 text-yellow-600 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Price unavailable</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">1 ETH =</span>
              <span className="font-semibold">₹{inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            
            {change24h !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{Math.abs(change24h).toFixed(2)}%</span>
              </div>
            )}

            <button
              onClick={refresh}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh price"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    );
  }

  // Full view with converter
  return (
    <div className={`rounded-lg border bg-card shadow-sm ${className}`}>
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="text-lg">💱</span>
            ETH Price Converter
          </h3>
          <button
            onClick={refresh}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted rounded"
            title="Refresh price"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Price Display */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">1 ETH =</span>
            <span className="font-bold text-2xl">
              ₹{inr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {change24h !== 0 && (
              <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="font-medium">
                  {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                </span>
                <span className="text-muted-foreground">(24h)</span>
              </div>
            )}
            
            <div className="text-muted-foreground">
              Updated {timeAgo}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-yellow-600 text-xs bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              <AlertCircle className="w-3 h-3" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Converter UI */}
        {showConverter && (
          <>
            <div className="border-t pt-4">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Convert Amount
              </label>
              
              {/* ETH Input */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={ethAmount}
                    onChange={(e) => handleEthChange(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2.5 pr-12 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    ETH
                  </span>
                </div>

                <div className="flex justify-center">
                  <div className="text-muted-foreground text-sm">⇅</div>
                </div>

                {/* INR Input */}
                <div className="relative">
                  <input
                    type="number"
                    value={inrAmount}
                    onChange={(e) => handleInrChange(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2.5 pr-12 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="0.00"
                    step="100"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    INR
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Conversion Reference */}
            <div className="border-t pt-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>0.1 ETH =</span>
                <span className="font-medium">₹{convertEthToInr(0.1).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>0.5 ETH =</span>
                <span className="font-medium">₹{convertEthToInr(0.5).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>1.0 ETH =</span>
                <span className="font-medium">₹{convertEthToInr(1).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to format relative time
function getTimeAgo(timestamp: number): string {
  if (!timestamp) return 'recently';
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
