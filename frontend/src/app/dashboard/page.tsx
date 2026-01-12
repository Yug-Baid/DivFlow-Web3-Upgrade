"use client";

import { useAccount, useReadContract, useBalance, usePublicClient } from "wagmi";
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
import { BalanceDisplay, EthPriceDisplay } from "@/components/shared/EthPriceDisplay";
import { Plus, Store, FileText, MapPin, TrendingUp, Clock, ArrowUpRight, AlertTriangle, ShieldX, ImageOff } from "lucide-react";
import { motion } from "framer-motion";
import { StaffRouteGuard } from "@/components/StaffRouteGuard";
import { resolveIPFS, getIPFSUrl, PropertyMetadata } from "@/lib/ipfs";
import Image from "next/image";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function Dashboard() {
  const router = useRouter();
  const { address } = useAccount();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<bigint | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [resolvedMetadata, setResolvedMetadata] = useState<Record<string, PropertyMetadata | string>>({});
  const [userName, setUserName] = useState<string>("User");
  const publicClient = usePublicClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user is registered - with refetch capability
  const { data: isRegistered, isLoading: isCheckingRegistration, refetch: refetchRegistration } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
    query: {
      // Always refetch on mount to get fresh data after registration
      refetchOnMount: 'always',
      staleTime: 0,
    }
  });

  // Refetch registration status when component mounts or address changes
  useEffect(() => {
    if (address) {
      console.log('🔄 Dashboard: Refetching registration status for', address);
      refetchRegistration();
    }
  }, [address, refetchRegistration]);

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
    console.log('📊 Dashboard State:', {
      address,
      isRegistered,
      isCheckingRegistration,
      isStaff
    });

    // Only redirect if we've definitively confirmed the user is NOT registered
    if (!isCheckingRegistration && isRegistered === false && address && !isStaff) {
      console.log('❌ User not registered, redirecting to /register');
      router.push('/register');
    } else if (isRegistered === true) {
      console.log('✅ User is registered!');
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

  // Resolve Metadata for Properties
  useEffect(() => {
    if (properties && (properties as any[]).length > 0) {
      (properties as any[]).forEach(async (p: any) => {
        const hash = p.ipfsHash;
        if (hash && !resolvedMetadata[hash]) {
          try {
            const { isMetadata, data } = await resolveIPFS(hash);
            if (isMetadata) {
              setResolvedMetadata(prev => ({ ...prev, [hash]: data }));
            }
          } catch (e) {
            console.error("Failed to resolve metadata for", p.propertyId, e);
          }
        }
      });
    }
  }, [properties]);

  // Fetch user profile from IPFS for name display
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!address || !publicClient || !isRegistered) return;
      try {
        const cid = await publicClient.readContract({
          address: USERS_ADDRESS,
          abi: USERS_ABI,
          functionName: "getUserProfileCID",
          args: [address],
        }) as string;

        if (cid && cid.length > 0) {
          const { resolveIPFS } = await import("@/lib/ipfs");
          const { isMetadata, data } = await resolveIPFS(cid);
          if (isMetadata && data && (data as any).firstName) {
            setUserName((data as any).firstName);
          }
        }
      } catch (e) {
        console.error("Failed to fetch user profile:", e);
      }
    };
    fetchUserProfile();
  }, [address, publicClient, isRegistered]);

  const getPropertyData = (property: any) => {
    const meta = resolvedMetadata[property.ipfsHash];
    if (meta && typeof meta === 'object') {
      return {
        name: meta.name || `Property #${property.propertyId}`,
        address: meta.properties?.location?.address || `Location ID: ${property.locationId}`,
        image: meta.image ? getIPFSUrl(meta.image) : null
      };
    }
    return {
      name: `Property #${property.propertyId}`,
      address: `Location ID: ${property.locationId}`,
      image: null
    };
  };

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
    <StaffRouteGuard>
      <DashboardLayout>
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, <span className="text-gradient hover:text-primary transition-colors cursor-default">{userName}</span>
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
              {(properties as any[]).filter((p: any) => p.state !== 3).map((property: any) => {
                const { name, address: propAddress, image } = getPropertyData(property);

                return (
                  <motion.div key={property.propertyId.toString()} variants={itemVariants}>
                    <GlassCard hover className="group h-full flex flex-col justify-between overflow-hidden p-0 gap-0">
                      {/* Image Header */}
                      <div className="aspect-video relative bg-secondary/50">
                        {image ? (
                          <Image
                            src={image}
                            alt={name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <ImageOff className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium backdrop-blur-md shadow-sm ${property.state === 2
                            ? 'bg-green-500/80 text-white'
                            : 'bg-yellow-500/80 text-white'
                            }`}>
                            {property.state === 2 || property.state === 5 ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate w-full" title={name}>
                            {name}
                          </h3>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 min-h-[40px]">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{propAddress}</span>
                        </div>

                        <div className="space-y-3 mb-6 bg-secondary/20 p-3 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Survey No</span>
                            <span className="font-mono text-foreground">{property.surveyNumber.toString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Area</span>
                            <span className="font-mono text-foreground">{property.area.toString()} sq.ft</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-border/50 mt-2">
                            <span className="text-muted-foreground">Est. Value</span>
                            <EthPriceDisplay ethAmount={property.price} size="sm" showSymbol />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 pt-0 flex gap-2 mt-auto">
                        {/* View Details Button */}
                        <Link href={`/property/${property.propertyId.toString()}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
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
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
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
    </StaffRouteGuard>
  );
}
