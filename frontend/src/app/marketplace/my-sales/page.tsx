"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import dynamic from 'next/dynamic';
import { formatEther } from "viem";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge"; // Removed as component missing
import { Wallet, Tag, Check, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const WalletConnect = dynamic(() => import('@/components/WalletConnect').then(mod => mod.WalletConnect), { ssr: false });

export default function MySales() {
    const { address } = useAccount();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data: allSales, isLoading } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getAllSales",
    });

    const mySales = (allSales as any[])?.filter(
        (sale: any) => address && sale.owner.toLowerCase() === address.toLowerCase()
    );

    if (!mounted) return null;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">My Sales</h1>
                <p className="text-muted-foreground">Manage your listed properties and incoming requests</p>
            </div>

            {isLoading ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse">Loading sales...</div>
            ) : !mySales || mySales.length === 0 ? (
                <GlassCard className="text-center py-20">
                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Tag className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No Active Sales</h3>
                    <p className="text-muted-foreground mt-2 mb-6">You haven't listed any properties for sale.</p>
                    <Link href="/dashboard">
                        <Button variant="hero">Go to Dashboard</Button>
                    </Link>
                </GlassCard>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {mySales.map((sale: any) => (
                        <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                            <SaleItem sale={sale} />
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </DashboardLayout>
    );
}

function SaleItem({ sale }: { sale: any }) {
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
    const [hasAccepted, setHasAccepted] = useState(false);

    useEffect(() => {
        if (isConfirmed) {
            setHasAccepted(true);
            setIsAccepting(false);
            refetch();
        }
    }, [isConfirmed, refetch]);

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
        if (isAccepting || hasAccepted || isConfirming) return;

        setIsAccepting(true);

        try {
            writeContract({
                address: TRANSFER_OWNERSHIP_ADDRESS,
                abi: TRANSFER_OWNERSHIP_ABI,
                functionName: "acceptBuyerRequest",
                args: [sale.saleId, buyer as `0x${string}`, price],
            });
        } catch (e) {
            console.error(e);
            setIsAccepting(false); // Allow retry on error
        }
    }

    // F7 FIX: Disable ALL buttons if any processing is happening
    const isAcceptDisabled = isAccepting || isConfirming || hasAccepted;

    return (
        <GlassCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-secondary/20">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg text-foreground">Sale #{sale.saleId.toString()}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${sale.state === 1
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : sale.state === 2
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                : hasAccepted
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                            {sale.state === 0 ? (hasAccepted ? 'Accepted' : 'Active') : sale.state === 1 ? 'Accepted' : 'Closed'}
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
                                        <Button
                                            onClick={() => handleAccept(req.user, req.priceOffered)}
                                            disabled={isAcceptDisabled}
                                            variant="secondary"
                                            size="sm"
                                            className="hover:bg-green-600 hover:text-white transition-colors"
                                        >
                                            {isAccepting && isConfirming
                                                ? "Accepting..."
                                                : isAccepting
                                                    ? "Processing..."
                                                    : "Accept Offer"}
                                        </Button>
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
                <div className="p-4 bg-green-500/10 border-t border-green-500/20 text-center">
                    <p className="text-green-500 text-sm font-medium flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        Offer Accepted Successfully!
                    </p>
                </div>
            )}
        </GlassCard>
    )
}
