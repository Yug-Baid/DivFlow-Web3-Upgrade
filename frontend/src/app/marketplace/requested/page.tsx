"use client";

import { useState, useEffect, useMemo } from "react";

import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { resolveIPFS, PropertyMetadata } from "@/lib/ipfs";
import { formatEther } from "viem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EthPriceDisplay } from "@/components/shared/EthPriceDisplay";
import { Clock, CheckCircle, XCircle, ShoppingBag, ArrowRight, Loader2, AlertTriangle, History, ExternalLink, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { StaffRouteGuard } from "@/components/StaffRouteGuard";

// Admin address for role detection
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

// RequestedUserToASaleState enum from contract
const RequestState = {
    SentPurchaseRequest: 0,
    CancelPurchaseRequest: 1,
    SellerAcceptedPurchaseRequest: 2,
    SellerRejectedPurchaseRequest: 3,
    SellerCanceledAcceptanceRequest: 4,
    YouRejectedAcceptanceRequest: 5,
    ReRequestedPurchaseRequest: 6,
    SuccessfullyTransfered: 7
};

// SaleState enum from contract
const SaleState = {
    Active: 0,
    AcceptedToABuyer: 1,
    CancelSaleBySeller: 2,
    Success: 3,
    DeadlineOverForPayment: 4,
    CancelAcceptanceRequestGivenBySeller: 5,
    RejectedAcceptanceRequestByBuyer: 6
};

export default function RequestedSales() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [buyHistory, setBuyHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [propertyNames, setPropertyNames] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
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

    // Redirect unregistered non-staff users
    useEffect(() => {
        if (mounted && !isConnected) {
            router.push('/');
        } else if (!isCheckingRegistration && isRegistered === false && address && !isStaff) {
            router.push('/register');
        }
    }, [isRegistered, isCheckingRegistration, address, router, isStaff, isConnected, mounted]);

    // Strict guard to prevent flashing
    if (!isConnected && mounted) return null;

    const { data: sales, isLoading: isLoadingSales, refetch } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getRequestedSales",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Deduplicate sales by saleId
    const uniqueSales = useMemo(() => {
        if (!sales) return [];
        const salesMap = new Map<string, any>();
        for (const sale of sales as any[]) {
            salesMap.set(sale.saleId.toString(), sale);
        }
        return Array.from(salesMap.values());
    }, [sales]);

    // Separate active vs completed sales
    const activeSales = useMemo(() =>
        uniqueSales.filter((sale: any) => sale.state !== SaleState.Success),
        [uniqueSales]
    );

    // Completed sales where THIS user was the buyer (acceptedFor matches address)
    const completedSales = useMemo(() =>
        uniqueSales.filter((sale: any) =>
            sale.state === SaleState.Success &&
            sale.acceptedFor?.toLowerCase() === address?.toLowerCase()
        ),
        [uniqueSales, address]
    );

    // Use completedSales instead of events for Buy History
    useEffect(() => {
        setBuyHistory(completedSales);
        setIsLoadingHistory(false);
    }, [completedSales]);

    // Fetch getRequestedUsers for each unique sale
    const requestedUsersQueries = useMemo(() =>
        activeSales.map((sale: any) => ({
            address: TRANSFER_OWNERSHIP_ADDRESS as `0x${string}`,
            abi: TRANSFER_OWNERSHIP_ABI,
            functionName: "getRequestedUsers",
            args: [sale.saleId],
        })),
        [activeSales]
    );

    const { data: requestedUsersResults, isLoading: isLoadingRequests } = useReadContracts({
        contracts: requestedUsersQueries,
        query: { enabled: activeSales.length > 0 },
    });

    // Fetch property details to get IPFS hashes for names
    const propertyDetailsQueries = useMemo(() =>
        uniqueSales.map((sale: any) => ({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: "getPropertyDetails",
            args: [sale.propertyId],
        })),
        [uniqueSales]
    );

    const { data: propertyDetailsResults } = useReadContracts({
        contracts: propertyDetailsQueries,
        query: { enabled: uniqueSales.length > 0 },
    });

    // Fetch property names from IPFS
    useEffect(() => {
        if (!propertyDetailsResults) return;

        const fetchNames = async () => {
            const names: Record<string, string> = {};
            await Promise.all(
                (propertyDetailsResults as any[]).map(async (result, index) => {
                    if (result.status === 'success' && result.result?.ipfsHash) {
                        try {
                            const { isMetadata, data } = await resolveIPFS(result.result.ipfsHash);
                            if (isMetadata && data?.name) {
                                names[uniqueSales[index].propertyId.toString()] = data.name;
                            }
                        } catch (e) {
                            console.error("Error fetching property name:", e);
                        }
                    }
                })
            );
            setPropertyNames(prev => ({ ...prev, ...names }));
        };

        fetchNames();
    }, [propertyDetailsResults, uniqueSales]);

    // Create a map of saleId -> the most relevant bid for this user
    // Priority: Accepted (state 2) > Pending (state 0 or 6) > Cancelled (filtered out)
    const myBidsPerSale = useMemo(() => {
        if (!requestedUsersResults || !address) return {};
        const bidsMap: Record<string, any[]> = {};

        activeSales.forEach((sale: any, index: number) => {
            const result = requestedUsersResults[index];
            if (result.status === 'success' && result.result) {
                const requests = result.result as any[];
                // Get all bids from this user
                const myBids = requests.filter(
                    (req: any) => req.user.toLowerCase() === address.toLowerCase()
                );

                // Filter out cancelled bids (state 1) and rejected (state 3)
                // Keep: Pending (0), Accepted (2), ReRequested (6), SuccessfullyTransferred (7)
                const relevantBids = myBids.filter((bid: any) =>
                    bid.state !== 1 && bid.state !== 3
                );

                // If there's an accepted bid (state 2), only show that one
                const acceptedBid = relevantBids.find((bid: any) => bid.state === 2);
                if (acceptedBid) {
                    bidsMap[sale.saleId.toString()] = [acceptedBid];
                } else if (relevantBids.length > 0) {
                    // Show highest pending bid only
                    const sortedBids = [...relevantBids].sort((a, b) =>
                        Number(b.priceOffered - a.priceOffered)
                    );
                    bidsMap[sale.saleId.toString()] = [sortedBids[0]];
                } else {
                    bidsMap[sale.saleId.toString()] = [];
                }
            }
        });
        return bidsMap;
    }, [requestedUsersResults, activeSales, address]);

    const { writeContract, data: hash, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const handlePayment = async (saleId: bigint, price: bigint) => {
        try {
            writeContract({
                address: TRANSFER_OWNERSHIP_ADDRESS,
                abi: TRANSFER_OWNERSHIP_ABI,
                functionName: "transferOwnerShip",
                args: [saleId],
                value: price
            });
        } catch (e) {
            console.error(e);
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const isLoading = isLoadingSales || isLoadingRequests || isCheckingRegistration;

    // Helper to get bid status display
    const getBidStatus = (bid: any, sale: any) => {
        const isThisBidAccepted = sale.acceptedFor.toLowerCase() === address?.toLowerCase() &&
            sale.acceptedPrice === bid.priceOffered;

        if (bid.state === RequestState.SellerRejectedPurchaseRequest) {
            return { text: "Rejected", color: "bg-red-500/20 text-red-400", icon: XCircle, borderColor: "border-red-500/30" };
        }

        if (sale.state === SaleState.Success) {
            if (bid.state === RequestState.SuccessfullyTransfered) {
                return { text: "Purchased!", color: "bg-green-500/20 text-green-400", icon: CheckCircle, borderColor: "border-green-500/30" };
            }
            return { text: "Outbid", color: "bg-orange-500/20 text-orange-400", icon: XCircle, borderColor: "border-orange-500/30" };
        }

        if (sale.state === SaleState.AcceptedToABuyer) {
            if (isThisBidAccepted) {
                return { text: "Accepted! Pay Now", color: "bg-green-500/20 text-green-400", icon: CheckCircle, borderColor: "border-green-500/50" };
            }
            return { text: "Outbid", color: "bg-orange-500/20 text-orange-400", icon: XCircle, borderColor: "border-orange-500/30" };
        }

        return { text: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock, borderColor: "border-yellow-500/30" };
    };

    // Show loading while checking registration
    if (isCheckingRegistration && !mounted) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground animate-pulse">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    // Block unregistered users with a message
    if (!isRegistered && address && !isStaff && mounted) {
        return (
            <DashboardLayout>
                <GlassCard className="p-8 max-w-md mx-auto text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Registration Required</h2>
                    <p className="text-muted-foreground mb-4">
                        You must register your identity before viewing your purchase requests.
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
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">My Requests</h1>
                        <p className="text-muted-foreground">Track the status of your purchase requests</p>
                    </div>
                    <Button variant="ghost-glow" onClick={() => refetch()} size="sm">
                        Refresh
                    </Button>
                </div>

                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="active">Active Requests</TabsTrigger>
                        <TabsTrigger value="history">Buy History</TabsTrigger>
                    </TabsList>

                    {/* Active Requests Tab */}
                    <TabsContent value="active">
                        {isLoading || !mounted ? (
                            <div className="text-center py-10 text-muted-foreground animate-pulse">Loading requests...</div>
                        ) : activeSales.length === 0 ? (
                            <GlassCard className="text-center py-20">
                                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground">No Active Requests</h3>
                                <p className="text-muted-foreground mt-2 mb-6">You don't have any pending purchase requests.</p>
                                <Link href="/marketplace">
                                    <Button variant="hero">Browse Marketplace</Button>
                                </Link>
                            </GlassCard>
                        ) : (
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                {activeSales.map((sale: any) => {
                                    const myBids = myBidsPerSale[sale.saleId.toString()] || [];

                                    return (
                                        <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                                            <GlassCard hover className="relative overflow-hidden">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-semibold text-lg text-foreground">{propertyNames[sale.propertyId.toString()] || `Property #${sale.propertyId.toString()}`}</h3>
                                                        <p className="text-sm text-muted-foreground">Property #{sale.propertyId.toString()} | Sale #{sale.saleId.toString()}</p>
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 mb-3">
                                                    <p className="text-xs text-muted-foreground mb-1.5">Listed Price</p>
                                                    <EthPriceDisplay ethAmount={sale.price} size="sm" layout="inline" emphasize="both" />
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Offers</p>
                                                    {myBids.map((bid: any, idx: number) => {
                                                        const status = getBidStatus(bid, sale);
                                                        const StatusIcon = status.icon;
                                                        const isThisBidAccepted = sale.state === SaleState.AcceptedToABuyer &&
                                                            sale.acceptedFor.toLowerCase() === address?.toLowerCase() &&
                                                            sale.acceptedPrice === bid.priceOffered;

                                                        return (
                                                            <div key={idx} className={`p-3 rounded-lg border ${status.borderColor} ${isThisBidAccepted ? 'bg-green-500/10' : 'bg-secondary/20'}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <EthPriceDisplay ethAmount={bid.priceOffered} size="sm" layout="inline" emphasize="both" />
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${status.color}`}>
                                                                        <StatusIcon className="w-3 h-3" />
                                                                        {status.text}
                                                                    </span>
                                                                </div>
                                                                {isThisBidAccepted && (
                                                                    <div className="mt-3">
                                                                        <Button
                                                                            onClick={() => handlePayment(sale.saleId, sale.acceptedPrice)}
                                                                            disabled={isConfirming}
                                                                            variant="hero"
                                                                            className="w-full bg-green-600 hover:bg-green-700"
                                                                            size="sm"
                                                                        >
                                                                            {isConfirming ? (
                                                                                <span className="flex items-center gap-2">
                                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                                    Processing...
                                                                                </span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-2">
                                                                                    Pay {formatEther(sale.acceptedPrice)} ETH & Claim
                                                                                    <ArrowRight className="w-4 h-4" />
                                                                                </span>
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </TabsContent>

                    {/* Buy History Tab */}
                    <TabsContent value="history">
                        {isLoadingHistory ? (
                            <div className="text-center py-10 text-muted-foreground animate-pulse">Loading history...</div>
                        ) : buyHistory.length === 0 ? (
                            <GlassCard className="text-center py-20">
                                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <History className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground">No Purchase History</h3>
                                <p className="text-muted-foreground mt-2 mb-6">You haven't purchased any properties yet.</p>
                                <Link href="/marketplace">
                                    <Button variant="hero">Browse Marketplace</Button>
                                </Link>
                            </GlassCard>
                        ) : (
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-4"
                            >
                                {buyHistory.map((sale: any, idx: number) => (
                                    <motion.div key={idx} variants={itemVariants}>
                                        <GlassCard className="p-4">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                        <h3 className="font-semibold text-foreground">
                                                            {propertyNames[sale.propertyId?.toString()] || `Property #${sale.propertyId?.toString()}`}
                                                        </h3>
                                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                                            Purchased
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                        {/* Seller Address */}
                                                        <div className="p-2 bg-secondary/30 rounded border border-border/50">
                                                            <p className="text-xs text-muted-foreground mb-1">Seller</p>
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-mono text-xs break-all">
                                                                    {sale.owner}
                                                                </span>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-5 w-5"
                                                                    onClick={() => navigator.clipboard.writeText(sale.owner)}
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Purchase Price */}
                                                        <div className="p-2 bg-secondary/30 rounded border border-border/50">
                                                            <p className="text-xs text-muted-foreground mb-1">Purchase Price</p>
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-mono text-sm text-green-400 font-bold">
                                                                    {formatEther(sale.acceptedPrice)} ETH
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Link href={`/property/${sale.propertyId?.toString()}`}>
                                                    <Button variant="outline" size="sm">
                                                        View Property <ExternalLink className="w-3 h-3 ml-2" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </GlassCard>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </TabsContent>
                </Tabs>

                {isConfirmed && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="text-center p-6 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Success!</h3>
                            <p className="text-muted-foreground mt-1">Ownership transferred.</p>
                            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}

                {writeError && (
                    <div className="fixed bottom-8 right-8 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg max-w-sm z-50 animate-in slide-in-from-bottom">
                        <h4 className="font-bold mb-1">Payment Error</h4>
                        <p className="text-sm">{writeError.message.split('\n')[0].slice(0, 150)}...</p>
                    </div>
                )}
            </DashboardLayout>
        </StaffRouteGuard>
    );
}

