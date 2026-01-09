"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { formatEther } from "viem";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EthPriceConverter } from "@/components/shared/EthPriceConverter";
import { EthPriceDisplay } from "@/components/shared/EthPriceDisplay";
import { MapPin, Tag, ShoppingCart, Loader2, Info, AlertTriangle, ImageOff, Search, ArrowLeft, ArrowRight, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { resolveIPFS, getIPFSUrl, PropertyMetadata } from "@/lib/ipfs";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Property state enum
const PropertyState = {
  Created: 0,
  Scheduled: 1,
  Verified: 2,
  Rejected: 3,
  OnSale: 4,
  Bought: 5,
  SalePending: 6
};

// Mock Metadata Cache to avoid refetching
const metadataCache: Record<string, PropertyMetadata | null> = {};

export default function Marketplace() {
  const router = useRouter();
  const { address } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"lowest" | "highest">("lowest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ISSUE-2: Standard Checks (Registration / Staff)
  const { data: isRegistered, isLoading: isCheckingRegistration } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
  });

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

  // Redirect unregistered users
  useEffect(() => {
    if (!isCheckingRegistration && isRegistered === false && address && !isStaff) {
      router.push('/register');
    }
  }, [isRegistered, isCheckingRegistration, address, router, isStaff]);

  // Fetch Sales
  const { data: allSales, isLoading: isLoadingSales, refetch } = useReadContract({
    address: TRANSFER_OWNERSHIP_ADDRESS,
    abi: TRANSFER_OWNERSHIP_ABI,
    functionName: "getAllSales",
  });

  const activeSales = useMemo(() =>
    (allSales as any[])?.filter((sale: any) => sale.state === 0) || [],
    [allSales]
  );

  // Fetch Property Details
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

  // State for resolved metadata
  const [resolvedMetadata, setResolvedMetadata] = useState<Record<string, PropertyMetadata | string>>({});

  // Filter & Deduplicate Sales
  const approvedSales = useMemo(() => {
    if (!propertyResults) return [];

    const onSaleSales = activeSales.map((sale: any, index: number) => {
      const result = propertyResults[index];
      if (result.status === 'success' && result.result) {
        return {
          sale,
          property: result.result as any
        };
      }
      return null;
    }).filter(item => item && item.property.state === PropertyState.OnSale);

    // Deduplicate by propertyId (Keep latest)
    const propertyToLatestSale = new Map();
    for (const item of onSaleSales!) {
      if (!item) continue;
      const existing = propertyToLatestSale.get(item.property.propertyId.toString());
      if (!existing || item.sale.saleId > existing.sale.saleId) {
        propertyToLatestSale.set(item.property.propertyId.toString(), item);
      }
    }

    return Array.from(propertyToLatestSale.values());
  }, [activeSales, propertyResults]);

  // Resolve Metadata (Effect)
  useEffect(() => {
    approvedSales.forEach(async (item) => {
      const hash = item.property.ipfsHash;
      if (hash && !resolvedMetadata[hash] && !metadataCache[hash]) {
        // Mark as loading/fetching to prevent dupes? or just fetch
        const { isMetadata, data } = await resolveIPFS(hash);
        if (isMetadata) {
          metadataCache[hash] = data;
          setResolvedMetadata(prev => ({ ...prev, [hash]: data }));
        } else {
          // Legacy: direct image URL
          setResolvedMetadata(prev => ({ ...prev, [hash]: data }));
        }
      } else if (metadataCache[hash] && !resolvedMetadata[hash]) {
        setResolvedMetadata(prev => ({ ...prev, [hash]: metadataCache[hash]! }));
      }
    });
  }, [approvedSales]);


  // FILTERING & SORTING LOGIC
  const filteredAndSortedSales = useMemo(() => {
    let result = [...approvedSales];

    // Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(item => {
        const hash = item.property.ipfsHash;
        const meta = resolvedMetadata[hash];
        const name = (typeof meta === 'object' ? meta.name : `Property ${item.property.propertyId}`) || "";

        return (
          item.sale.propertyId.toString().includes(lowerTerm) ||
          item.sale.owner.toLowerCase().includes(lowerTerm) ||
          item.property.locationId.toString().includes(lowerTerm) ||
          name.toLowerCase().includes(lowerTerm)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      const priceA = Number(formatEther(a.sale.price));
      const priceB = Number(formatEther(b.sale.price));
      return sortOrder === "lowest" ? priceA - priceB : priceB - priceA;
    });

    return result;
  }, [approvedSales, searchTerm, sortOrder, resolvedMetadata]);

  // PAGINATION LOGIC
  const totalPages = Math.ceil(filteredAndSortedSales.length / itemsPerPage);
  const currentSales = filteredAndSortedSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Helper to extract image URL
  const getImageUrl = (ipfsHash: string) => {
    const data = resolvedMetadata[ipfsHash];
    if (!data) return null;
    if (typeof data === 'string') return data; // Old style (Legacy)
    if (data.image) return getIPFSUrl(data.image); // New style (Metadata)
    return null;
  };

  const getMockName = (item: any) => {
    const data = resolvedMetadata[item.property.ipfsHash];
    if (typeof data === 'object' && data?.name) return data.name;
    return `Property #${item.sale.propertyId}`;
  };

  if (isCheckingRegistration && !isMounted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ISSUE-2: Block unregistered users
  if (!isRegistered && address && !isStaff && isMounted) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Registration Required</h2>
          <Button onClick={() => router.push('/register')} variant="hero">Register Now</Button>
        </GlassCard>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Land <span className="text-gradient">Marketplace</span>
            </h1>
            <p className="textmuted-foreground">Find your dream land plot from verified listings.</p>
          </div>
          
          {/* ETH Price - Compact View */}
          <EthPriceConverter compact showConverter={false} />
        </div>
      </div>

      {/* Controls Bar */}
      <GlassCard className="p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-10 backdrop-blur-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, Location, or Owner..."
            className="pl-10 bg-secondary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Sort by Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lowest">Price: Low to High</SelectItem>
                <SelectItem value="highest">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
            <Loader2 className={`w-4 h-4 ${isLoadingSales ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </GlassCard>

      {/* Listings Grid */}
      {isLoadingSales || isLoadingProperties ? (
        <div className="text-center py-20 text-muted-foreground animate-pulse">Loading properties...</div>
      ) : currentSales.length === 0 ? (
        <GlassCard className="text-center py-20">
          <h3 className="text-lg font-medium text-foreground">No Properties Found</h3>
          <p className="text-muted-foreground">Try adjusting your search criteria.</p>
        </GlassCard>
      ) : (
        <>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {currentSales.map((item: any) => {
              const imageUrl = getImageUrl(item.property.ipfsHash);

              return (
                <motion.div key={item.sale.saleId.toString()} variants={itemVariants}>
                  <GlassCard
                    hover
                    className="group relative overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/marketplace/${item.sale.propertyId.toString()}`)}
                  >
                    {/* Image Section */}
                    <div className="aspect-video rounded-xl bg-secondary mb-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`Property ${item.property.propertyId}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                          <ImageOff className="w-10 h-10" />
                        </div>
                      )}

                      {/* Price Badge */}
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-sm font-bold border border-white/10 shadow-lg">
                        {formatEther(item.sale.price)} ETH
                      </div>

                      {item.sale.owner === address && (
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-yellow-500 text-black text-xs font-bold shadow-lg flex items-center gap-1">
                          <Tag className="w-3 h-3" /> My Listing
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-foreground truncate">{getMockName(item)}</h3>
                          <p className="text-xs text-muted-foreground">Property ID: {item.property.propertyId.toString()}</p>
                        </div>
                      </div>

                      {/* Price Display with INR */}
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Price</p>
                        <EthPriceDisplay 
                          ethAmount={item.sale.price}
                          size="md"
                          layout="stacked"
                          emphasize="both"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>Loc: {item.property.locationId.toString()}</span>
                      </div>

                      <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                        <div className="text-xs font-mono text-muted-foreground">
                          Seller: {item.sale.owner.slice(0, 6)}...
                        </div>
                        <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:underline">
                          View Details <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12 bg-secondary/20 p-4 rounded-full w-fit mx-auto backdrop-blur-sm border border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
