"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { formatEther, parseEther } from "viem";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Tag, ShoppingCart, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Marketplace() {
  const { address } = useAccount();
  const [offerPrice, setOfferPrice] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<bigint | null>(null);

  const { data: allSales, isLoading, refetch } = useReadContract({
    address: TRANSFER_OWNERSHIP_ADDRESS,
    abi: TRANSFER_OWNERSHIP_ABI,
    functionName: "getAllSales",
  });

  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const sales = allSales;

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

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Land <span className="text-gradient">Marketplace</span>
        </h1>
        <p className="text-muted-foreground">Browse verified properties listed for sale</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           {/* Placeholder for future filtering details */}
            <p className="text-sm text-muted-foreground">
                Showing {sales ? (sales as any[]).length : 0} active listings
            </p>
        </div>
        <Button variant="ghost-glow" onClick={() => refetch()} size="sm">
            Refresh Listings
        </Button>
      </div>

      {isLoading ? (
         <div className="text-center py-20 text-muted-foreground animate-pulse">Loading properties...</div>
      ) : !sales || (sales as any[]).length === 0 ? (
        <GlassCard className="text-center py-20">
            <h3 className="text-lg font-medium text-foreground">No Properties Found</h3>
            <p className="text-muted-foreground">No properties listed for sale at the moment.</p>
        </GlassCard>
      ) : (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {(sales as any[]).map((sale: any, index: number) => (
            <motion.div key={sale.saleId.toString()} variants={itemVariants}>
                <GlassCard hover className="group relative overflow-hidden">
                    {/* Visual Header */}
                    <div className={`aspect-video rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} mb-4 relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                        
                        {/* Tags */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                            <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-sm font-bold border border-white/10">
                                {formatEther(sale.price)} ETH
                            </span>
                            {sale.owner === address && (
                                <span className="px-2 py-1 rounded-full bg-yellow-500/80 text-black text-xs font-bold shadow-lg">
                                    Your Listing
                                </span>
                            )}
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                            <div className="flex items-center gap-2 text-foreground">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-mono tracking-tighter">Sale #{sale.saleId.toString()}</span>
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
                                <p className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
                                    {sale.owner.slice(0,6)}...{sale.owner.slice(-4)}
                                </p>
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
                                                {isConfirming ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirm"}
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

    </DashboardLayout>
  );
}
