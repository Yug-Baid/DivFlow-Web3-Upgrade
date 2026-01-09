"use client";

import { useAccount, useReadContract, useBalance } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TransferOwnershipModal from "@/components/TransferOwnershipModal";
import SellPropertyModal from "@/components/SellPropertyModal";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { EthPriceConverter } from "@/components/shared/EthPriceConverter";
import { BalanceDisplay } from "@/components/shared/EthPriceDisplay";
import { Plus, Store, FileText, MapPin, TrendingUp, Clock, ArrowUpRight, AlertTriangle, ShieldX } from "lucide-react";
import { motion } from "framer-motion";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function Dashboard() {
  const router = useRouter();
  const { address } = useAccount();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<bigint | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user is registered
  const { data: isRegistered, isLoading: isCheckingRegistration } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
  });

  // STAFF DETECTION: Check if user is a staff member
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

  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  const isLandInspector = inspectorLocation && Number(inspectorLocation) > 0;
  const isRevenueEmployee = employeeDept && Number(employeeDept) > 0;
  const isStaff = isAdmin || isLandInspector || isRevenueEmployee;

  // Redirect unregistered users to register page (only for non-staff)
  useEffect(() => {
    if (!isCheckingRegistration && isRegistered === false && address && !isStaff) {
      router.push('/register');
    }
  }, [isRegistered, isCheckingRegistration, address, router, isStaff]);

  const result = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getPropertiesOfOwner",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isRegistered === true && !isStaff,
    }
  });

  const properties = result.data;
  const isLoading = result.isLoading || isCheckingRegistration;
  const error = result.error;

  const { data: balance } = useBalance({
    address: address,
  });

  const stats = [
    { label: "Total Properties", value: properties ? (properties as any[]).filter(p => p.state !== 3).length.toString() : "0", icon: MapPin },
    { label: "Total Value", value: balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "---", icon: TrendingUp },
    { label: "Account Age", value: "Active", icon: Clock },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Show loading while checking registration
  if (isCheckingRegistration) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  // STAFF ACCESS DENIED: Block staff from citizen dashboard
  if (isStaff && isMounted) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <ShieldX className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-destructive">Staff Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            You are logged in as a government staff member.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            As a {isAdmin ? "Admin" : isLandInspector ? "Land Inspector" : "Revenue Employee"},
            please use your role-specific portal from the sidebar.
          </p>
          <Button
            onClick={() => router.push(isAdmin ? '/admin' : isLandInspector ? '/inspector' : '/revenue')}
            variant="hero"
          >
            Go to My Portal
          </Button>
        </GlassCard>
      </DashboardLayout>
    );
  }

  // BUG-10 FIX: Check if wallet is connected FIRST
  if (!address && isMounted) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to access the dashboard and manage your properties.
          </p>
          <p className="text-sm text-muted-foreground">
            Click the &quot;Connect Wallet&quot; button in the navigation bar.
          </p>
        </GlassCard>
      </DashboardLayout>
    );
  }

  // Block unregistered users with a message
  if (!isRegistered && address) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Registration Required</h2>
          <p className="text-muted-foreground mb-4">
            You must register your identity before accessing the dashboard.
          </p>
          <Button onClick={() => router.push('/register')} variant="hero">
            Register Now
          </Button>
        </GlassCard>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, <span className="text-gradient hover:text-primary transition-colors cursor-default">User</span>
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your property portfolio
            </p>
          </div>
          
          {/* ETH Price Converter - Compact View */}
          <EthPriceConverter compact showConverter={false} className="md:min-w-[280px]" />
        </div>
      </div>

      {/* Stats Keys */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <GlassCard hover className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                {stat.label === "Total Value" && balance ? (
                  <BalanceDisplay 
                    ethBalance={Number(balance.formatted)} 
                    symbol={balance.symbol}
                  />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link href="/register-land">
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-2" />
            Register New Land
          </Button>
        </Link>
        <Link href="/marketplace">
          <Button variant="ghost-glow">
            <Store className="w-4 h-4 mr-2" />
            View Marketplace
          </Button>
        </Link>
        <Link href="/marketplace/my-sales">
          <Button variant="ghost-glow">
            <FileText className="w-4 h-4 mr-2" />
            Manage Sales
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">My Properties</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground animate-pulse">Loading properties...</div>
        ) : !address ? (
          <GlassCard className="text-center py-20">
            <h3 className="text-lg font-medium text-foreground">Wallet Not Connected</h3>
            <p className="text-muted-foreground">Please connect your wallet to view your properties.</p>
          </GlassCard>
        ) : properties && (properties as any[]).length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {(properties as any[]).filter((p: any) => p.state !== 3).map((property: any) => (
              <motion.div key={property.propertyId.toString()} variants={itemVariants}>
                <GlassCard hover className="group h-full flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        Property #{property.propertyId.toString()}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${property.state === 2
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                        {property.state === 2 || property.state === 5 ? 'Verified' : 'Pending'}
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Location ID</span>
                        <span className="font-mono text-foreground">{property.locationId.toString()}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Survey No</span>
                        <span className="font-mono text-foreground">{property.surveyNumber.toString()}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-border/50">
                        <span className="text-muted-foreground">Area</span>
                        <span className="font-mono text-foreground">{property.area.toString()} sq.ft</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {/* G1 FIX: Only show Sell button for Verified(2) or Bought(5) states */}
                    {/* Hide for OnSale(4) or SalePending(6) states */}
                    {(property.state === 2 || property.state === 5) && (
                      <Button
                        variant="hero"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedPropertyId(property.propertyId);
                          setIsSellModalOpen(true);
                        }}
                      >
                        Sell
                      </Button>
                    )}
                    {/* BUG-7 FIX: Transfer button hidden for hackathon - direct address transfer not working
                       TODO: Implement post-hackathon if needed */}
                    {/* <Button
                      variant="outline"
                      className="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 flex-1"
                      size="sm"
                      onClick={() => {
                        setSelectedPropertyId(property.propertyId);
                        setIsTransferModalOpen(true);
                      }}
                    >
                      Transfer
                    </Button> */}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <GlassCard className="text-center py-20">
            <h3 className="text-lg font-medium text-foreground">No Properties Found</h3>
            <p className="text-muted-foreground mt-2 mb-6">You haven't registered any properties yet.</p>
            <Link href="/register-land">
              <Button variant="hero">Register your first property</Button>
            </Link>
          </GlassCard>
        )}
      </div>

      {selectedPropertyId !== null && (
        <>
          <TransferOwnershipModal
            isOpen={isTransferModalOpen}
            onClose={() => {
              setIsTransferModalOpen(false);
              setSelectedPropertyId(null);
            }}
            propertyId={selectedPropertyId}
          />
          <SellPropertyModal
            isOpen={isSellModalOpen}
            onClose={() => {
              setIsSellModalOpen(false);
              setSelectedPropertyId(null);
            }}
            propertyId={selectedPropertyId}
            onSuccess={() => {
              // G1 FIX: Refetch properties immediately after successful listing
              result.refetch();
            }}
          />
        </>
      )}
    </DashboardLayout>
  );
}
