// Dual ETH/INR Price Display Component
// Shows ETH amount with INR equivalent inline

'use client';

import { useEthPrice } from '@/hooks/useEthPrice';
import { Loader2 } from 'lucide-react';

interface EthPriceDisplayProps {
  ethAmount: string | number | bigint;
  className?: string;
  showSymbol?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'inline' | 'stacked';
  emphasize?: 'eth' | 'inr' | 'both';
}

export function EthPriceDisplay({
  ethAmount,
  className = '',
  showSymbol = true,
  size = 'md',
  layout = 'inline',
  emphasize = 'eth'
}: EthPriceDisplayProps) {
  const { inr, loading, convertEthToInr } = useEthPrice();

  // Convert to number
  const ethValue = typeof ethAmount === 'bigint' 
    ? Number(ethAmount) / 1e18 
    : typeof ethAmount === 'string'
    ? parseFloat(ethAmount)
    : ethAmount;

  const inrValue = convertEthToInr(ethValue);

  // Size classes
  const sizeClasses = {
    sm: {
      eth: 'text-sm',
      inr: 'text-xs',
      gap: 'gap-1'
    },
    md: {
      eth: 'text-base',
      inr: 'text-sm',
      gap: 'gap-1.5'
    },
    lg: {
      eth: 'text-lg',
      inr: 'text-base',
      gap: 'gap-2'
    }
  };

  const sizes = sizeClasses[size];

  if (loading && inr === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={sizes.eth}>
          {ethValue.toFixed(4)} {showSymbol && 'ETH'}
        </span>
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Inline layout
  if (layout === 'inline') {
    return (
      <div className={`flex items-center ${sizes.gap} flex-wrap ${className}`}>
        <span className={`${sizes.eth} ${emphasize === 'eth' || emphasize === 'both' ? 'font-bold' : 'font-medium'}`}>
          {ethValue.toFixed(4)} {showSymbol && 'ETH'}
        </span>
        <span className="text-muted-foreground">≈</span>
        <span className={`${sizes.inr} ${emphasize === 'inr' || emphasize === 'both' ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
          ₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </span>
      </div>
    );
  }

  // Stacked layout
  return (
    <div className={`flex flex-col ${sizes.gap} ${className}`}>
      <span className={`${sizes.eth} ${emphasize === 'eth' || emphasize === 'both' ? 'font-bold' : 'font-medium'}`}>
        {ethValue.toFixed(4)} {showSymbol && 'ETH'}
      </span>
      <span className={`${sizes.inr} ${emphasize === 'inr' || emphasize === 'both' ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
        ≈ ₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

// Variant: Large balance display (for dashboard stats)
interface BalanceDisplayProps {
  ethBalance: string | number;
  symbol?: string;
  className?: string;
}

export function BalanceDisplay({ ethBalance, symbol = 'ETH', className = '' }: BalanceDisplayProps) {
  const { inr, loading, convertEthToInr } = useEthPrice();

  const ethValue = typeof ethBalance === 'string' ? parseFloat(ethBalance) : ethBalance;
  const inrValue = convertEthToInr(ethValue);

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-2xl font-bold text-foreground">
        {ethValue.toFixed(4)} {symbol}
      </div>
      {loading && inr === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading INR value...</span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          ≈ <span className="font-semibold text-primary">₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span> INR
        </div>
      )}
    </div>
  );
}
