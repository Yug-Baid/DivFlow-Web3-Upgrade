"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "./WalletConnect";
import { cn } from "@/lib/utils";
import { useAccount, useReadContract } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();

  // Check if user is the contract owner (Admin) - Placeholder logic, ideally fetch owner()
  // For now, we'll just show the link, or we could add a read hook for 'contractOwner' if it was public.
  // LandRegistry.sol doesn't expose 'contractOwner' publicly as a getter automatically unless 'public'.
  // It is 'address private contractOwner'. So we can't easily check on frontend without updating contract.
  // We'll leave the link accessible but the page will handle permission checks or just fail.
  
  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Register Land", href: "/register-land" },
    { name: "Revenue Portal", href: "/revenue" },
    { name: "Admin", href: "/admin" },
  ];

  if (pathname === "/") return null;

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-8 max-w-7xl mx-auto justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl tracking-tight">
            DivFlow
          </Link>
          <div className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}
