"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { formatEther, parseEther } from "viem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Tag, ShoppingCart, Loader2, Info, AlertTriangle, ImageOff } from "lucide-react";
import { motion } from "framer-motion";
import { UserInfoModal } from "@/components/UserInfoModal";
import { getIPFSUrl } from "@/lib/ipfs";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Property state enum for reference
const PropertyState = {
  Created: 0,
  Scheduled: 1,
  Verified: 2,
  Rejected: 3,
  OnSale: 4,     // Revenue approved - show in marketplace
  Bought: 5,
  SalePending: 6  // Waiting for Revenue - DON'T show in marketplace
};

export default function Marketplace() {
  const router = useRouter();
  const { address } = useAccount();
  const [offerPrice, setOfferPrice] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<bigint | null>(null);
  // ISSUE-19: State for user info modal
  const [selectedUserAddress, setSelectedUserAddress] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ISSUE-2: Check if user is registered
  const { data: isRegistered, isLoading: isCheckingRegistration } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
  });

  // ISSUE-2: Staff detection
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

  // ISSUE-2: Redirect unregistered non-staff users
  useEffect(() => {
    if (!isCheckingRegistration && isRegistered === false && address && !isStaff) {
      router.push('/register');
    }
  }, [isRegistered, isCheckingRegistration, address, router, isStaff]);

  const { data: allSales, isLoading: isLoadingSales, refetch } = useReadContract({
    address: TRANSFER_OWNERSHIP_ADDRESS,
    abi: TRANSFER_OWNERSHIP_ABI,
    functionName: "getAllSales",
  });

  // Filter for active sales only (Sale State 0)
  const activeSales = useMemo(() =>
    (allSales as any[])?.filter((sale: any) => sale.state === 0) || [],
    [allSales]
  );

  // BUG-1 FIX: Fetch property details for each active sale to check property.state
  const propertyQueries = useMemo(() =>
    activeSales.map((sale: any) => ({
      address: LAND_REGISTRY_ADDRESS as `0x${string}`,
      abi: LAND_REGISTRY_ABI,
      functionName: "getPropertyDetails",
      args: [sale.propertyId],
    })),
    [activeSales]
  );

  const { data: propertyResults, isLoading: isLoadingProperties } = useReadContracts({
    contracts: propertyQueries,
    query: { enabled: activeSales.length > 0 },
  });

  // Filter sales to only show those with property.state === 4 (OnSale)
  // ISSUE-15 FIX: Also deduplicate by propertyId - only show the LATEST sale for each property
  const approvedSales = useMemo(() => {
    if (!propertyResults) return [];

    // First, filter to only OnSale properties
    const onSaleSales = activeSales.filter((sale: any, index: number) => {
      const result = propertyResults[index];
      if (result.status === 'success' && result.result) {
        const property = result.result as any;
        return property.state === PropertyState.OnSale;
      }
      return false;
    });

    // ISSUE-15: Deduplicate by propertyId - keep only the latest (highest saleId) for each property
    const propertyToLatestSale = new Map();
    for (const sale of onSaleSales) {
      const existingSale = propertyToLatestSale.get(sale.propertyId.toString());
      if (!existingSale || sale.saleId > existingSale.saleId) {
        propertyToLatestSale.set(sale.propertyId.toString(), sale);
      }
    }

    return Array.from(propertyToLatestSale.values());
  }, [activeSales, propertyResults]);

  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRequestPurchase = async (saleId: bigint) => {
    if (!offerPrice) {
      alert("Please enter an offer price");
      return;
    }
    try {
      writeContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "sendPurchaseRequest",
        args: [saleId, BigInt(parseEther(offerPrice))],
      });
    } catch (error) {
      console.error("Purchase Request failed:", error);
    }
  };

  const gradients = [
    "from-orange-500/20 to-red-500/20",
    "from-blue-500/20 to-purple-500/20",
    "from-green-500/20 to-teal-500/20",
    "from-pink-500/20 to-rose-500/20",
    "from-amber-500/20 to-yellow-500/20",
    "from-cyan-500/20 to-blue-500/20",
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // ISSUE-8: Image error tracking state
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // ISSUE-8: Helper to get property IPFS hash for a sale
  const getPropertyIpfsHash = (saleIndex: number): string | null => {
    if (!propertyResults || !propertyResults[saleIndex]) return null;
    const result = propertyResults[saleIndex];
    if (result.status === 'success' && result.result) {
      const property = result.result as any;
      return property.ipfsHash || null;
    }
    return null;
  };

  // ISSUE-8: Find the original index of a sale in activeSales to get propertyResults
  const getSalePropertyIndex = (sale: any): number => {
    return activeSales.findIndex(
      (s: any) => s.saleId.toString() === sale.saleId.toString()
    );
  };

  const isLoading = isLoadingSales || isLoadingProperties || isCheckingRegistration;

  // ISSUE-2: Show loading while checking registration
  if (isCheckingRegistration && !isMounted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground animate-pulse">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  // ISSUE-2: Block unregistered users with a message
  if (!isRegistered && address && !isStaff && isMounted) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Registration Required</h2>
          <p className="text-muted-foreground mb-4">
            You must register your identity before browsing the marketplace.
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
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Land <span className="text-gradient">Marketplace</span>
        </h1>
        <p className="text-muted-foreground">Browse verified properties listed for sale (Revenue approved)</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Showing {approvedSales.length} approved listings
          </p>
        </div>
        <Button variant="ghost-glow" onClick={() => refetch()} size="sm">
          Refresh Listings
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground animate-pulse">Loading properties...</div>
      ) : approvedSales.length === 0 ? (
        <GlassCard className="text-center py-20">
          <h3 className="text-lg font-medium text-foreground">No Properties Found</h3>
          <p className="text-muted-foreground">No Revenue-approved properties listed for sale at the moment.</p>
        </GlassCard>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {approvedSales.map((sale: any, index: number) => (
            <motion.div key={sale.saleId.toString()} variants={itemVariants}>
              <GlassCard hover className="group relative overflow-hidden">
                {/* Visual Header */}
                <div className={`aspect-video rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} mb-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300`}>
                  {/* ISSUE-8: Render IPFS Image if available */}
                  {(() => {
                    const saleIndex = getSalePropertyIndex(sale);
                    const ipfsHash = getPropertyIpfsHash(saleIndex);
                    const imageUrl = ipfsHash ? getIPFSUrl(ipfsHash) : null;
                    const hasError = ipfsHash ? imageErrors[ipfsHash] : false;

                    if (imageUrl && !hasError) {
                      return (
                        <div className="absolute inset-0">
                          <Image
                            src={imageUrl}
                            alt={`Property ${sale.propertyId.toString()}`}
                            fill
                            className="object-cover"
                            onError={() => setImageErrors(prev => ({ ...prev, [ipfsHash!]: true }))}
                            unoptimized // Important for external IPFS images
                          />
                          <div className="absolute inset-0 bg-black/20" />
                        </div>
                      );
                    } else if (hasError) {
                      // Show specific UI for broken image
                      return (
                        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                          <div className="flex flex-col items-center text-muted-foreground/50">
                            <ImageOff className="w-8 h-8 mb-1" />
                            <span className="text-xs">Image Unavailable</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

                  {/* Tags */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-sm font-bold border border-white/10 shadow-lg">
                      {formatEther(sale.price)} ETH
                    </span>
                    {sale.owner === address && (
                      <span className="px-2 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold shadow-lg flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Your Listing
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <div className="flex items-center gap-2 text-foreground/90">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm font-mono tracking-tighter text-white">Sale #{sale.saleId.toString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Property ID</p>
                      <p className="text-foreground font-mono">{sale.propertyId.toString()}</p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground">Seller</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
                          {sale.owner.slice(0, 6)}...{sale.owner.slice(-4)}
                        </p>
                        {/* ISSUE-19: Info button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-primary/20"
                          onClick={() => setSelectedUserAddress(sale.owner)}
                        >
                          <Info className="w-3.5 h-3.5 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {sale.owner !== address && sale.state === 0 && (
                    <div className="pt-4 border-t border-border/50">
                      {selectedSaleId === sale.saleId ? (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="Offer Price (ETH)"
                            className="bg-secondary/50 border-input"
                            value={offerPrice}
                            onChange={(e) => setOfferPrice(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleRequestPurchase(sale.saleId)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              disabled={isConfirming}
                              size="sm"
                            >
                              {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                            </Button>
                            <Button
                              onClick={() => setSelectedSaleId(null)}
                              variant="secondary"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedSaleId(sale.saleId);
                            setOfferPrice(formatEther(sale.price));
                          }}
                          variant="hero"
                          className="w-full"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Request to Buy
                        </Button>
                      )}
                    </div>
                  )}

                  {isConfirmed && selectedSaleId === sale.saleId && (
                    <div className="mt-3 p-2 rounded bg-green-500/20 text-green-400 text-xs text-center border border-green-500/30">
                      Request Sent Successfully!
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {writeError && (
        <div className="fixed bottom-8 right-8 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg max-w-sm z-50 animate-in slide-in-from-bottom">
          <h4 className="font-bold mb-1">Error</h4>
          <p className="text-sm">{writeError.message.split('\n')[0].slice(0, 100)}...</p>
        </div>
      )}

      {/* ISSUE-19: User Info Modal */}
      <UserInfoModal
        isOpen={!!selectedUserAddress}
        onClose={() => setSelectedUserAddress(null)}
        userAddress={selectedUserAddress || ""}
      />

    </DashboardLayout>
  );
}
