"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fix Hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary/80 transition flex items-center gap-2 border border-border"
        >
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-border/50">
              <p className="text-xs text-muted-foreground">Connected Wallet</p>
              <p className="text-sm font-mono truncate">{address}</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => disconnect()}
                className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md transition flex items-center gap-2 font-medium"
              >
                Switch Wallet / Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition shadow-sm"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
