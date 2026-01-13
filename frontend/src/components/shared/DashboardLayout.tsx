"use client";

import { ReactNode, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, useReadContract } from "wagmi";
import {
  MapPin,
  LayoutDashboard,
  Store,
  FileText,
  ShoppingBag,
  PlusCircle,
  Building2,
  Shield,
  Menu,
  X,
  Search,
  Eye,
  Users,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletConnect } from '@/components/WalletConnect';
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";

// Known admin address (Anvil deployer account 0)
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

interface DashboardLayoutProps {
  children: ReactNode;
}

// CITIZEN Navigation - for regular users (not staff)
const citizenNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Price Checker", href: "/price-checker", icon: DollarSign },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "My Sales", href: "/marketplace/my-sales", icon: FileText },
  { label: "My Requests", href: "/marketplace/requested", icon: ShoppingBag },
  { label: "Register Land", href: "/register-land", icon: PlusCircle },
  { label: "Track Requests", href: "/track", icon: Eye },
  { label: "Global Chat", href: "/chat", icon: MessageSquare },
];

// STAFF Navigation - role-specific pages only
const staffNavItems = {
  admin: [
    { label: "Admin Panel", href: "/admin", icon: Shield },
    { label: "Land Inspector View", href: "/inspector", icon: Search },
    { label: "Revenue View", href: "/revenue", icon: Building2 },
    { label: "Global Chat", href: "/chat", icon: MessageSquare },
  ],
  inspector: [
    { label: "Inspector Portal", href: "/inspector", icon: Search },
    { label: "Global Chat", href: "/chat", icon: MessageSquare },
  ],
  revenue: [
    { label: "Revenue Portal", href: "/revenue", icon: Building2 },
    { label: "Global Chat", href: "/chat", icon: MessageSquare },
  ],
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { address } = useAccount();

  // Fix hydration mismatch by only rendering role-based nav after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Role detection for sidebar navigation filtering
  const { data: inspectorLocation } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getInspectorLocation",
    args: address ? [address] : undefined,
  });

  const { data: employeeDept } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getEmployeeRevenueDept",
    args: address ? [address] : undefined,
  });

  // Determine user roles
  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  const isLandInspector = inspectorLocation && Number(inspectorLocation) > 0;
  const isRevenueEmployee = employeeDept && Number(employeeDept) > 0;
  const isStaff = isAdmin || isLandInspector || isRevenueEmployee;

  // Determine which navigation to show
  const navItems = useMemo(() => {
    // During SSR/initial render, show citizen nav to avoid hydration mismatch
    if (!isMounted) {
      return citizenNavItems;
    }

    // STAFF: Show only their role-specific pages
    if (isAdmin) {
      return staffNavItems.admin;
    }
    if (isLandInspector) {
      return staffNavItems.inspector;
    }
    if (isRevenueEmployee) {
      return staffNavItems.revenue;
    }

    // CITIZEN: Show citizen navigation
    return citizenNavItems;
  }, [isMounted, isAdmin, isLandInspector, isRevenueEmployee]);

  // Role badge for staff
  const getRoleBadge = () => {
    if (!isMounted) return null;
    if (isAdmin) return { label: "Admin", color: "bg-red-500/20 text-red-400 border-red-500/30" };
    if (isLandInspector) return { label: "Land Inspector", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    if (isRevenueEmployee) return { label: "Revenue Dept", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-card/95 backdrop-blur-xl flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold">DivFlow</span>
        </Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-screen bg-card border-r border-border transition-transform duration-300 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 border-b border-border flex items-center px-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Div<span className="text-gradient">Flow</span>
              </span>
            </Link>
          </div>

          {/* Role Badge for Staff */}
          {roleBadge && (
            <div className="px-4 py-3 border-b border-border">
              <div className={cn("px-3 py-2 rounded-lg border text-xs font-semibold text-center", roleBadge.color)}>
                <Users className="w-3 h-3 inline mr-1" />
                {roleBadge.label}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Staff Info Box */}
          {isStaff && isMounted && (
            <div className="px-4 py-3 border-t border-border">
              <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-xs text-yellow-600/80">
                <strong>Staff Account</strong><br />
                You cannot register, buy, or sell land.
              </div>
            </div>
          )}

          {/* User Section (Wallet) */}
          <div className="p-4 border-t border-border">
            <div className="w-full">
              <WalletConnect />
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
