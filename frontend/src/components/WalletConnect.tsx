"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useEffect, useRef } from "react";
import { Wallet, LogOut, ChevronDown } from "lucide-react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) return null;

  // Connected State - Show address with dropdown for disconnect
  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full bg-secondary/50 hover:bg-secondary text-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-2 border border-border/50 hover:border-primary/30"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 right-0 bottom-full mb-2 bg-card border border-border rounded-xl shadow-xl z-[100] overflow-hidden">
            <div className="p-3 border-b border-border/50 bg-secondary/20">
              <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
              <p className="text-xs font-mono text-foreground break-all">{address}</p>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  disconnect();
                  setIsDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition flex items-center gap-2 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not Connected State - Single Connect Wallet button
  const injectedConnector = connectors.find(c => c.id === 'injected') || connectors[0];

  return (
    <button
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}
