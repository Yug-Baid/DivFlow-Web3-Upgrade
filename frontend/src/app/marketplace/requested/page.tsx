"use client";

import { useState, useEffect, useMemo } from "react";

import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { formatEther } from "viem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, ShoppingBag, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

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

    const isLoading = isLoadingSales || isLoadingRequests || isCheckingRegistration;

    // Helper to get bid status display
    const getBidStatus = (bid: any, sale: any) => {
        // Check if this specific bid was accepted (matches BOTH address AND price)
        const isThisBidAccepted = sale.acceptedFor.toLowerCase() === address?.toLowerCase() &&
            sale.acceptedPrice === bid.priceOffered;

        // FIX: Check if this bid was explicitly rejected by seller
        if (bid.state === RequestState.SellerRejectedPurchaseRequest) {
            return { text: "Rejected", color: "bg-red-500/20 text-red-400", icon: XCircle, borderColor: "border-red-500/30" };
        }

        // Check if sale is completed (Success state = 3)
        if (sale.state === SaleState.Success) {
            // Check if THIS user's bid was the winning one
            if (bid.state === RequestState.SuccessfullyTransfered) {
                return { text: "Purchased!", color: "bg-green-500/20 text-green-400", icon: CheckCircle, borderColor: "border-green-500/30" };
            }
            // This user's bid was NOT the winning one
            return { text: "Outbid", color: "bg-orange-500/20 text-orange-400", icon: XCircle, borderColor: "border-orange-500/30" };
        }

        // Sale is accepted to a buyer but not yet completed
        if (sale.state === SaleState.AcceptedToABuyer) {
            if (isThisBidAccepted) {
                return { text: "Accepted! Pay Now", color: "bg-green-500/20 text-green-400", icon: CheckCircle, borderColor: "border-green-500/50" };
            }
            // Another bid was accepted
            return { text: "Outbid", color: "bg-orange-500/20 text-orange-400", icon: XCircle, borderColor: "border-orange-500/30" };
        }

        // Otherwise pending (sale still active)
        return { text: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock, borderColor: "border-yellow-500/30" };
    };

    // ISSUE-2: Show loading while checking registration
    if (isCheckingRegistration && !mounted) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground animate-pulse">Loading...</div>
                </div>
            </DashboardLayout>
        );
    }

    // ISSUE-2: Block unregistered users with a message
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
