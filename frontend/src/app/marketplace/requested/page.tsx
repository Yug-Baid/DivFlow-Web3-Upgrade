"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { formatEther } from "viem";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function RequestedSales() {
  const { address } = useAccount();

  const { data: sales, isLoading } = useReadContract({
    address: TRANSFER_OWNERSHIP_ADDRESS,
    abi: TRANSFER_OWNERSHIP_ABI,
    functionName: "getRequestedSales",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

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

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Requests</h1>
        <p className="text-muted-foreground">Track the status of your purchase requests</p>
      </div>

      {isLoading ? (
             <div className="text-center py-10 text-muted-foreground animate-pulse">Loading requests...</div>
      ) : !sales || (sales as any[]).length === 0 ? (
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
          {(sales as any[]).map((sale: any) => {
             const isAccepted = sale.state === 1 && sale.acceptedFor.toLowerCase() === address?.toLowerCase();
             const isCompleted = sale.state === 3;
             
             return (
                <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                    <GlassCard 
                        hover 
                        className={`relative overflow-hidden border-l-4 ${
                            isAccepted ? "border-l-green-500" : isCompleted ? "border-l-gray-500" : "border-l-yellow-500"
                        }`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-semibold text-lg text-foreground">Sale #{sale.saleId.toString()}</h3>
                                <p className="text-sm text-muted-foreground">Property #{sale.propertyId.toString()}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                                isAccepted ? 'bg-green-500/20 text-green-400' :
                                isCompleted ? 'bg-secondary text-muted-foreground' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                                {isAccepted ? <CheckCircle className="w-3 h-3"/> : isCompleted ? <CheckCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                                {isAccepted ? 'Accepted! Pay Now' : isCompleted ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                                <span className="text-sm text-muted-foreground">Your Offer</span>
                                <span className="font-mono text-foreground font-medium">{formatEther(sale.price)} ETH</span>
                            </div>
                            {isAccepted && (
                                <div className="flex justify-between items-center p-2 rounded bg-green-500/10 border border-green-500/20">
                                    <span className="text-sm text-green-400 font-medium">Accepted Price</span>
                                    <span className="font-mono text-green-400 font-bold">{formatEther(sale.acceptedPrice)} ETH</span>
                                </div>
                            )}
                        </div>

                        {isAccepted && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <Button 
                                    onClick={() => handlePayment(sale.saleId, sale.acceptedPrice)}
                                    disabled={isConfirming}
                                    variant="hero"
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    {isConfirming ? "Processing Payment..." : (
                                        <span className="flex items-center gap-2">
                                            Pay {formatEther(sale.acceptedPrice)} ETH & Claim
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    This will transfer ownership to your wallet immediately.
                                </p>
                            </div>
                        )}
                        
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
    </DashboardLayout>
  );
}
