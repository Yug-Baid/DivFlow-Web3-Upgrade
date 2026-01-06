"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import dynamic from 'next/dynamic';
import { formatEther } from "viem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Wallet, Tag, Check, AlertCircle, X, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function MySales() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);

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

    // Strict guard to prevent flashing
    if (!isConnected && mounted) return null;

    const { data: allSales, isLoading, refetch: refetchAllSales } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getAllSales",
    });

    const mySales = (allSales as any[])?.filter(
        (sale: any) => address && sale.owner.toLowerCase() === address.toLowerCase()
    );

    // ISSUE-USER-REPORT: Fetch property details to check approval status
    const { data: propertyResults, isLoading: isLoadingProperties } = useReadContracts({
        contracts: mySales?.map((sale: any) => ({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: "getPropertyDetails",
            args: [sale.propertyId],
        })) || [],
    });

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
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">My Sales</h1>
                <p className="text-muted-foreground">Manage your listed properties and incoming requests</p>
            </div>

            {isLoadingData ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse">Loading sales...</div>
            ) : (
                <div className="space-y-6">
                    {(() => {
                        // Filter sales to show ONLY those with propertyState === 4 (OnSale) as per user request
                        // We map first to attach the propertyState, then filter
                        const filteredSales = mySales?.map((sale: any, index: number) => {
                            const propertyResult = propertyResults?.[index];
                            const propertyState = propertyResult?.status === 'success' ? (propertyResult.result as any).state : null;
                            return { ...sale, propertyState };
                        }).filter(item => item.propertyState !== null && Number(item.propertyState) === 4);

                        if (!filteredSales || filteredSales.length === 0) {
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
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-6"
                            >
                                {filteredSales.map((sale: any) => (
                                    <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                                        <SaleItem
                                            sale={sale}
                                            propertyState={sale.propertyState}
                                            onUpdate={refetchAllSales}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        );
                    })()}
                </div>
            )}
        </DashboardLayout>
    );
}

function SaleItem({ sale, propertyState, onUpdate }: { sale: any, propertyState?: number | null, onUpdate?: () => void }) {
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
        if (sale.state === 1) return 'Accepted'; // Sale Contract: Accepted
        if (sale.state === 2) return 'Closed';   // Sale Contract: Closed (Paid)

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
                                : statusLabel === 'Accepted'
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
                <div className="p-4 bg-secondary/30 border-b border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-muted-foreground">Sold to</span>
                        <span className="font-mono text-foreground">
                            {sale.acceptedFor?.slice(0, 8)}...{sale.acceptedFor?.slice(-6)}
                        </span>
                        <span className="text-muted-foreground">for</span>
                        <span className="font-mono text-green-400 font-bold">
                            {formatEther(sale.acceptedPrice)} ETH
                        </span>
                    </div>
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
