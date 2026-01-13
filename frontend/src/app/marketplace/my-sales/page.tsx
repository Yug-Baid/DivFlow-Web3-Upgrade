"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { fetchHistoryEvents } from "@/lib/historyClient";
import dynamic from 'next/dynamic';
import { formatEther } from "viem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Wallet, Tag, Check, AlertCircle, X, AlertTriangle, Info, History, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { StaffRouteGuard } from "@/components/StaffRouteGuard";

// Admin address for role detection
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

export default function MySales() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [saleTxHashes, setSaleTxHashes] = useState<Record<string, string>>({});

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

    // ISSUE-2: Redirect unregistered non-staff users
    // ISSUE-2: Redirect unregistered non-staff users or disconnected users
    useEffect(() => {
        if (mounted && !isConnected) {
            router.push('/');
        } else if (!isCheckingRegistration && isRegistered === false && address && !isStaff) {
            router.push('/register');
        }
    }, [isRegistered, isCheckingRegistration, address, router, isStaff, isConnected, mounted]);

    // IMPORTANT: ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    const { data: allSales, isLoading, refetch: refetchAllSales } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getAllSales",
    });

    // Fix: Memoize `mySales` to prevent infinite re-renders in useEffect
    const mySales = useMemo(() => {
        return (allSales as any[])?.filter(
            (sale: any) => address && sale.owner.toLowerCase() === address.toLowerCase()
        ) || [];
    }, [allSales, address]);

    // Fetch tx hashes for sold properties using dedicated history client
    useEffect(() => {
        if (!mySales || mySales.length === 0) return;

        const fetchHashes = async () => {
            const hashes: Record<string, string> = {};
            // Filter for sold items (state === 3)
            const soldItems = mySales.filter((s: any) => Number(s.state) === 3);

            if (soldItems.length === 0) return;

            // Only fetch if we don't have it yet to save RPC calls
            const itemsToFetch = soldItems.filter((s: any) => !saleTxHashes[s.saleId.toString()]);
            if (itemsToFetch.length === 0) return;

            await Promise.all(itemsToFetch.map(async (sale: any) => {
                try {
                    const logs = await fetchHistoryEvents(
                        TRANSFER_OWNERSHIP_ADDRESS,
                        TRANSFER_OWNERSHIP_ABI,
                        'OwnershipTransferred',
                        { saleId: sale.saleId }
                    );
                    if (logs.length > 0) {
                        hashes[sale.saleId.toString()] = logs[0].transactionHash;
                    }
                } catch (e) {
                    console.error("Error fetching logs for sale", sale.saleId, e);
                }
            }));

            if (Object.keys(hashes).length > 0) {
                setSaleTxHashes(prev => ({ ...prev, ...hashes }));
            }
        };

        fetchHashes();
    }, [mySales]); // mySales is now stable thanks to useMemo

    // ISSUE-USER-REPORT: Fetch property details to check approval status
    const { data: propertyResults, isLoading: isLoadingProperties } = useReadContracts({
        contracts: mySales?.map((sale: any) => ({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: "getPropertyDetails",
            args: [sale.propertyId],
        })) || [],
    });

    // EARLY RETURNS MUST COME AFTER ALL HOOKS
    // Strict guard to prevent flashing
    if (!isConnected && mounted) return null;
    if (!mounted) return null;

    // ISSUE-2: Show loading while checking registration
    if (isCheckingRegistration) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground animate-pulse">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    // ISSUE-2: Block unregistered users with a message
    // ISSUE-2: Block unregistered users with a message if connected but not registered
    if (!isRegistered && address && !isStaff) {
        return (
            <DashboardLayout>
                <GlassCard className="p-8 max-w-md mx-auto text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Registration Required</h2>
                    <p className="text-muted-foreground mb-4">
                        You must register your identity before managing your sales.
                    </p>
                    <Button onClick={() => router.push('/register')} variant="hero">
                        Register Now
                    </Button>
                </GlassCard>
            </DashboardLayout>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
    };

    const isLoadingData = isLoading || isLoadingProperties;

    return (
        <StaffRouteGuard>
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">My Sales</h1>
                <p className="text-muted-foreground">Manage your listed properties and incoming requests</p>
            </div>

            {isLoadingData ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse">Loading sales...</div>
            ) : (
                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="active">Active Listings</TabsTrigger>
                        <TabsTrigger value="history">Sales History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="space-y-6">
                        {(() => {
                            // Filter for Active Listings
                            // FIX: STRICTLY filter out sold (3) or cancelled (2) sales.
                            // Only show Active (0) or AcceptedToBuyer (1).
                            const filteredSales = mySales.map((sale: any, index: number) => {
                                const propertyResult = propertyResults?.[index];
                                const propertyState = propertyResult?.status === 'success' ? (propertyResult.result as any).state : null;
                                const propertyOwner = propertyResult?.status === 'success' ? (propertyResult.result as any).owner : null;
                                return { ...sale, propertyState, propertyOwner };
                            }).filter(item => {
                                // Must be Active (0) or Accepted (1).
                                // Even if propertyState is 4 (OnSale), if 'this' sale is sold (3), it's history.
                                const saleState = Number(item.state);
                                const isSaleActive = saleState === 0 || saleState === 1;

                                // FIX: Check Property State.
                                // If Property is Verified (2), it means the Sale Request was REJECTED by Revenue.
                                // It is no longer "Active" even if the Sale struct says Active.
                                // Valid Active States: OnSale (4) or SalePending (6).
                                const propertyVal = Number(item.propertyState);
                                const isPropertyActive = propertyVal === 4 || propertyVal === 6;

                                // FIX: Must also be the CURRENT owner of the property.
                                // If I sold it (via another sale or transfer), I am no longer the owner.
                                // My old sale request is effectively invalid/stale.
                                const isCurrentOwner = item.propertyOwner && address && item.propertyOwner.toLowerCase() === address.toLowerCase();

                                return isSaleActive && isPropertyActive && isCurrentOwner;
                            });

                            // Deduplicate properties (if somehow multiple active sales exist for same property - shouldn't happen but good safety)
                            const uniqueSales = new Map();
                            filteredSales.forEach((sale: any) => {
                                const existing = uniqueSales.get(sale.propertyId.toString());
                                if (!existing || sale.saleId > existing.saleId) {
                                    uniqueSales.set(sale.propertyId.toString(), sale);
                                }
                            });
                            const finalSales = Array.from(uniqueSales.values());

                            if (!finalSales || finalSales.length === 0) {
                                return (
                                    <GlassCard className="text-center py-20">
                                        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Tag className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground">No Active Listed Sales</h3>
                                        <p className="text-muted-foreground mt-2 mb-6">You don't have any properties currently listed on the marketplace.</p>
                                        <Link href="/track">
                                            <Button variant="hero">Check Status in Track</Button>
                                        </Link>
                                    </GlassCard>
                                );
                            }

                            return (
                                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                                    {finalSales.map((sale: any) => (
                                        <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                                            <SaleItem sale={sale} propertyState={sale.propertyState} onUpdate={refetchAllSales} />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            );
                        })()}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-6">
                        {(() => {
                            // Filter for History (state === 3 [Success] or 2 [Closed/Cancelled])
                            const historySales = mySales.filter(sale => Number(sale.state) === 3 || Number(sale.state) === 2);

                            if (!historySales || historySales.length === 0) {
                                return (
                                    <GlassCard className="text-center py-20">
                                        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <History className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground">No Past Sales</h3>
                                        <p className="text-muted-foreground mt-2">You haven't sold any properties yet.</p>
                                    </GlassCard>
                                );
                            }

                            return (
                                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                                    {historySales.map((sale: any) => (
                                        <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                                            <SaleItem
                                                sale={sale}
                                                propertyState={5} // Bought
                                                onUpdate={refetchAllSales}
                                                isHistory
                                                txHash={saleTxHashes[sale.saleId.toString()]}
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            );
                        })()}
                    </TabsContent>
                </Tabs>
            )}
        </DashboardLayout>
    </StaffRouteGuard>
    );
}

function SaleItem({ sale, propertyState, onUpdate, isHistory, txHash }: { sale: any, propertyState?: number | null, onUpdate?: () => void, isHistory?: boolean, txHash?: string }) {
    const { data: requests, isLoading: isLoadingRequests, refetch } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getRequestedUsers",
        args: [sale.saleId],
    });

    const { writeContract, data: hash, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // F7 FIX: Track accepting state locally to prevent race condition
    const [isAccepting, setIsAccepting] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [hasAccepted, setHasAccepted] = useState(false);
    const [lastAction, setLastAction] = useState<'accept' | 'reject' | null>(null);

    useEffect(() => {
        if (isConfirmed) {
            // When accepting, mark as accepted
            if (isAccepting && !isRejecting) {
                setHasAccepted(true);
            }
            // Always reset processing states and refetch
            setIsAccepting(false);
            setIsRejecting(false);
            refetch(); // Refetch requests
            if (onUpdate) onUpdate(); // Refetch parent sales list to update card status
        }
    }, [isConfirmed, refetch, isAccepting, isRejecting, onUpdate]);

    // Check if ANY request is already in accepted state (state === 2)
    useEffect(() => {
        if (requests) {
            const alreadyAccepted = (requests as any[]).some((req: any) => req.state === 2);
            if (alreadyAccepted) {
                setHasAccepted(true);
            }
        }
    }, [requests]);

    // F8 FIX: Filter to show only HIGHEST bid per buyer
    const highestBidsPerBuyer = useMemo(() => {
        if (!requests || !Array.isArray(requests)) return [];

        // Group by buyer and keep highest bid
        const buyerMap = new Map<string, any>();

        (requests as any[]).forEach((req: any) => {
            // Only consider active requests (state 0 or 4 = SentPurchaseRequest or ReRequestedPurchaseRequest)
            if (req.state !== 0 && req.state !== 4) return;

            const existing = buyerMap.get(req.user.toLowerCase());
            if (!existing || req.priceOffered > existing.priceOffered) {
                buyerMap.set(req.user.toLowerCase(), req);
            }
        });

        // Sort by price descending (highest first)
        return Array.from(buyerMap.values()).sort((a, b) =>
            Number(b.priceOffered - a.priceOffered)
        );
    }, [requests]);

    const handleAccept = async (buyer: string, price: bigint) => {
        // F7 FIX: Prevent any interaction if already accepting or accepted
        if (isAccepting || isRejecting || hasAccepted || isConfirming) return;

        setIsAccepting(true);
        setLastAction('accept');

        try {
            writeContract({
                address: TRANSFER_OWNERSHIP_ADDRESS,
                abi: TRANSFER_OWNERSHIP_ABI,
                functionName: "acceptBuyerRequest",
                args: [sale.saleId, buyer as `0x${string}`, price],
            });
        } catch (e) {
            console.error(e);
            setIsAccepting(false);
            setLastAction(null);
        }
    }

    // ISSUE-11: Handle rejecting a buyer's offer
    const handleReject = async (buyer: string, price: bigint) => {
        if (isAccepting || isRejecting || hasAccepted || isConfirming) return;

        setIsRejecting(true);
        setLastAction('reject');

        try {
            writeContract({
                address: TRANSFER_OWNERSHIP_ADDRESS,
                abi: TRANSFER_OWNERSHIP_ABI,
                functionName: "rejectBuyerRequest",
                args: [sale.saleId, buyer as `0x${string}`, price],
            });
        } catch (e) {
            console.error(e);
            setIsRejecting(false);
            setLastAction(null);
        }
    }

    // F7 FIX: Disable ALL buttons if any processing is happening
    const isProcessing = isAccepting || isRejecting || isConfirming || hasAccepted;

    // ISSUE-USER-REPORT: Determine status label based on Property State
    // Property States: 0=Created, 2=Verified, 3=Rejected, 4=OnSale, 5=Bought, 6=SalePending
    const getStatusLabel = () => {
        if (Number(sale.state) === 3) return 'Sold'; // Explicitly check Sale State first!
        if (sale.state === 1) return 'Accepted'; // Sale Contract: Accepted
        if (sale.state === 2) return 'Closed';   // Sale Contract: Closed (Paid) / Cancelled

        // Property state check for active sales (sale.state === 0)
        if (propertyState === 6) return 'Pending Approval'; // Waiting for Revenue
        if (propertyState === 4) return hasAccepted ? 'Accepted' : 'Listed'; // On Market

        return 'Active';
    };

    const statusLabel = getStatusLabel();
    const isPendingApproval = propertyState === 6;

    return (
        <GlassCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-secondary/20">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg text-foreground">Sale #{sale.saleId.toString()}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusLabel === 'Pending Approval'
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                            : statusLabel === 'Listed' || statusLabel === 'Active'
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                : statusLabel === 'Accepted' || statusLabel === 'Sold'
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                            {statusLabel}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Wallet className="w-3 h-3" />
                        Listed Price: <span className="text-foreground font-mono">{formatEther(sale.price)} ETH</span>
                        <span className="text-border mx-1">|</span>
                        Property #{sale.propertyId.toString()}
                    </p>
                </div>
            </div>

            {/* BUG-3 FIX: Show accepted buyer info when sale is AcceptedToABuyer (state === 1) */}
            {sale.state === 1 && (
                <div className="p-4 bg-green-500/10 border-b border-green-500/20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <p className="text-xs text-green-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Offer Accepted - Awaiting Payment
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground mr-2">Buyer:</span>
                                    <span className="font-mono text-foreground">
                                        {sale.acceptedFor?.slice(0, 8)}...{sale.acceptedFor?.slice(-6)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Accepted Price:</span>
                                    <span className="font-mono text-green-400 font-bold text-lg">
                                        {formatEther(sale.acceptedPrice)} ETH
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Payment Deadline</p>
                            <p className="font-mono text-sm text-yellow-400">
                                {new Date(Number(sale.deadlineForPayment) * 1000).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Show completion info when sale succeeded (state === 3) */}
            {sale.state === 3 && (
                <div className="p-4 bg-secondary/30 border-b border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                        <div className="flex items-center gap-2 text-sm overflow-hidden">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="text-muted-foreground whitespace-nowrap">Sold to</span>
                            <span className="font-mono text-foreground font-bold break-all">
                                {sale.acceptedFor}
                            </span>
                            <span className="text-muted-foreground whitespace-nowrap">for</span>
                            <span className="font-mono text-green-400 font-bold whitespace-nowrap">
                                {formatEther(sale.acceptedPrice)} ETH
                            </span>
                        </div>
                        {/* Transaction Hash Display */}
                        {txHash && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                                <span>Transaction Hash:</span>
                                <span className="font-mono text-foreground/70 break-all">{txHash}</span>
                            </div>
                        )}
                    </div>
                    {/* View Button Logic: Use passed txHash if available, else link to address (fallback) */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (txHash) {
                                window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank');
                            } else {
                                window.open(`https://sepolia.etherscan.io/address/${sale.acceptedFor}`, '_blank');
                            }
                        }}
                        className="h-8 text-xs shrink-0 ml-auto md:ml-0"
                    >
                        View <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                </div>
            )}

            {sale.state === 0 && (
                <div className="p-6">
                    <h4 className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Purchase Requests
                        {hasAccepted && <span className="text-green-500 ml-2">(Offer Accepted)</span>}
                    </h4>

                    {isLoadingRequests ? (
                        <div className="text-sm text-muted-foreground">Loading requests...</div>
                    ) : highestBidsPerBuyer.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">No purchase requests received yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* F8 FIX: Only show highest bid per buyer, sorted by price descending */}
                            {highestBidsPerBuyer.map((req: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-secondary/30 p-4 rounded-xl border border-border/50 transition-colors hover:bg-secondary/50">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm">
                                            <span className="text-muted-foreground mr-2">Buyer:</span>
                                            <span className="font-mono text-foreground">{req.user.slice(0, 6)}...{req.user.slice(-4)}</span>
                                        </p>
                                        <p className="text-sm">
                                            <span className="text-muted-foreground mr-2">Offer:</span>
                                            <span className="font-mono text-primary font-bold">{formatEther(req.priceOffered)} ETH</span>
                                            {idx === 0 && <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">Highest</span>}
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2" title={req.user}>
                                                <Info className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                        </p>
                                    </div>

                                    {/* F7 FIX: Show proper button states */}
                                    {!hasAccepted && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleAccept(req.user, req.priceOffered)}
                                                disabled={isProcessing}
                                                variant="secondary"
                                                size="sm"
                                                className="hover:bg-green-600 hover:text-white transition-colors"
                                            >
                                                {isAccepting && isConfirming
                                                    ? "Processing..."
                                                    : isAccepting
                                                        ? "Processing..."
                                                        : "Accept"}
                                            </Button>
                                            <Button
                                                onClick={() => handleReject(req.user, req.priceOffered)}
                                                disabled={isProcessing}
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                    {hasAccepted && (
                                        <span className="flex items-center gap-1 text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                            <Check className="w-3 h-3" /> {req.state === 2 ? 'Accepted' : 'Sale Closed'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                    }
                </div>
            )}

            {isConfirmed && (
                <div className={`p-4 ${lastAction === 'reject' ? 'bg-red-500/10 border-t border-red-500/20' : 'bg-green-500/10 border-t border-green-500/20'} text-center`}>
                    <p className={`${lastAction === 'reject' ? 'text-red-500' : 'text-green-500'} text-sm font-medium flex items-center justify-center gap-2`}>
                        <Check className="w-4 h-4" />
                        {lastAction === 'reject' ? 'Offer Rejected!' : 'Offer Accepted Successfully!'}
                    </p>
                </div>
            )}
        </GlassCard>
    )
}
