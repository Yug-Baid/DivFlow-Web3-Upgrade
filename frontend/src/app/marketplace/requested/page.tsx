"use client";

import { useState, useEffect, useMemo } from "react";

import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { formatEther } from "viem";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

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
    const { address } = useAccount();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data: sales, isLoading: isLoadingSales, refetch } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getRequestedSales",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // FIX BUG-3: Deduplicate sales by saleId
    const uniqueSales = useMemo(() => {
        if (!sales) return [];
        const salesMap = new Map<string, any>();
        for (const sale of sales as any[]) {
            salesMap.set(sale.saleId.toString(), sale);
        }
        return Array.from(salesMap.values());
    }, [sales]);

    // Fetch getRequestedUsers for each unique sale
    const requestedUsersQueries = useMemo(() =>
        uniqueSales.map((sale: any) => ({
            address: TRANSFER_OWNERSHIP_ADDRESS as `0x${string}`,
            abi: TRANSFER_OWNERSHIP_ABI,
            functionName: "getRequestedUsers",
            args: [sale.saleId],
        })),
        [uniqueSales]
    );

    const { data: requestedUsersResults, isLoading: isLoadingRequests } = useReadContracts({
        contracts: requestedUsersQueries,
        query: { enabled: uniqueSales.length > 0 },
    });

    // Create a map of saleId -> all of this user's bids with their states
    const myBidsPerSale = useMemo(() => {
        if (!requestedUsersResults || !address) return {};
        const bidsMap: Record<string, any[]> = {};

        uniqueSales.forEach((sale: any, index: number) => {
            const result = requestedUsersResults[index];
            if (result.status === 'success' && result.result) {
                const requests = result.result as any[];
                // Find ALL of this user's bids in this sale
                const myBids = requests.filter(
                    (req: any) => req.user.toLowerCase() === address.toLowerCase()
                );
                bidsMap[sale.saleId.toString()] = myBids;
            }
        });
        return bidsMap;
    }, [requestedUsersResults, uniqueSales, address]);

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

    const isLoading = isLoadingSales || isLoadingRequests;

    // Helper to get bid status display
    const getBidStatus = (bid: any, sale: any) => {
        // Check if this specific bid was accepted (matches BOTH address AND price)
        const isThisBidAccepted = sale.state === SaleState.AcceptedToABuyer &&
            sale.acceptedFor.toLowerCase() === address?.toLowerCase() &&
            sale.acceptedPrice === bid.priceOffered;

        if (isThisBidAccepted) {
            return { text: "Accepted! Pay Now", color: "bg-green-500/20 text-green-400", icon: CheckCircle, borderColor: "border-green-500/50" };
        }

        // Check if sale is completed
        if (sale.state === SaleState.Success) {
            if (bid.state === RequestState.SuccessfullyTransfered) {
                return { text: "Completed", color: "bg-secondary text-muted-foreground", icon: CheckCircle, borderColor: "border-border" };
            }
            return { text: "Sale Completed", color: "bg-secondary text-muted-foreground", icon: CheckCircle, borderColor: "border-border" };
        }

        // Check if another bid was accepted (this one is declined)
        if (sale.state === SaleState.AcceptedToABuyer) {
            // Sale is accepted but this specific bid wasn't chosen
            return { text: "Declined", color: "bg-red-500/20 text-red-400", icon: XCircle, borderColor: "border-red-500/30" };
        }

        // Otherwise pending
        return { text: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock, borderColor: "border-yellow-500/30" };
    };

    return (
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

            {isLoading || !mounted ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse">Loading requests...</div>
            ) : uniqueSales.length === 0 ? (
                <GlassCard className="text-center py-20">
                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No Requests Found</h3>
                    <p className="text-muted-foreground mt-2 mb-6">You haven't requested to buy any properties yet.</p>
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
                    {uniqueSales.map((sale: any) => {
                        const myBids = myBidsPerSale[sale.saleId.toString()] || [];

                        return (
                            <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                                <GlassCard hover className="relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-semibold text-lg text-foreground">Sale #{sale.saleId.toString()}</h3>
                                            <p className="text-sm text-muted-foreground">Property #{sale.propertyId.toString()}</p>
                                        </div>
                                    </div>

                                    {/* Listed Price */}
                                    <div className="flex justify-between items-center p-2 rounded bg-secondary/30 mb-3">
                                        <span className="text-sm text-muted-foreground">Listed Price</span>
                                        <span className="font-mono text-muted-foreground text-sm">{formatEther(sale.price)} ETH</span>
                                    </div>

                                    {/* Show ALL of this user's bids */}
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Offers</p>
                                        {myBids.map((bid: any, idx: number) => {
                                            const status = getBidStatus(bid, sale);
                                            const StatusIcon = status.icon;
                                            const isThisBidAccepted = sale.state === SaleState.AcceptedToABuyer &&
                                                sale.acceptedFor.toLowerCase() === address?.toLowerCase() &&
                                                sale.acceptedPrice === bid.priceOffered;

                                            return (
                                                <div key={idx} className={`p-3 rounded-lg border ${status.borderColor} ${isThisBidAccepted ? 'bg-green-500/10' :
                                                        status.text === 'Declined' ? 'bg-red-500/5' :
                                                            'bg-secondary/20'
                                                    }`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-medium text-foreground">
                                                                {formatEther(bid.priceOffered)} ETH
                                                            </span>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${status.color}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {status.text}
                                                        </span>
                                                    </div>

                                                    {/* Pay button only for the ACCEPTED bid */}
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
                                                            <p className="text-xs text-muted-foreground text-center mt-1">
                                                                Ownership transfers to your wallet immediately
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {isConfirmed && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                            <div className="text-center p-6 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in">
                                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                                </div>
                                                <h3 className="text-xl font-bold text-foreground">Success!</h3>
                                                <p className="text-muted-foreground mt-1">Ownership transferred.</p>
                                                <Button
                                                    variant="outline"
                                                    className="mt-4"
                                                    onClick={() => window.location.reload()}
                                                >
                                                    Close
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {writeError && (
                <div className="fixed bottom-8 right-8 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg max-w-sm z-50 animate-in slide-in-from-bottom">
                    <h4 className="font-bold mb-1">Payment Error</h4>
                    <p className="text-sm">{writeError.message.split('\n')[0].slice(0, 150)}...</p>
                </div>
            )}
        </DashboardLayout>
    );
}
