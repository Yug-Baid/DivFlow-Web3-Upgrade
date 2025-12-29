"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import dynamic from 'next/dynamic';
import { formatEther } from "viem";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Although Shadcn Badge isn't explicitly requested, simple divs work
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
    const { data: requests, isLoading: isLoadingRequests } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getRequestedUsers",
        args: [sale.saleId],
    });

    const { writeContract, data: hash, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const handleAccept = async (buyer: string, price: bigint) => {
        try {
             writeContract({
                address: TRANSFER_OWNERSHIP_ADDRESS,
                abi: TRANSFER_OWNERSHIP_ABI,
                functionName: "acceptBuyerRequest",
                args: [sale.saleId, buyer as `0x${string}`, price],
             });
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <GlassCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-secondary/20">
                <div>
                   <div className="flex items-center gap-3 mb-1">
                       <h3 className="font-semibold text-lg text-foreground">Sale #{sale.saleId.toString()}</h3>
                       <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            sale.state === 1 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : sale.state === 2 
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                       }`}>
                           {sale.state === 0 ? 'Active' : sale.state === 1 ? 'Accepted' : 'Closed'}
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

            {sale.state === 0 && (
                <div className="p-6">
                    <h4 className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Purchase Requests
                    </h4>
                    
                    {isLoadingRequests ? (
                        <div className="text-sm text-muted-foreground">Loading requests...</div>
                    ) : !requests || (requests as any[]).length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">No purchase requests received yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                             {(requests as any[]).map((req: any, idx: number) => (
                                 <div key={idx} className="flex justify-between items-center bg-secondary/30 p-4 rounded-xl border border-border/50 transition-colors hover:bg-secondary/50">
                                     <div className="flex flex-col gap-1">
                                         <p className="text-sm">
                                             <span className="text-muted-foreground mr-2">Buyer:</span> 
                                             <span className="font-mono text-foreground">{req.user.slice(0,6)}...{req.user.slice(-4)}</span>
                                         </p>
                                         <p className="text-sm">
                                             <span className="text-muted-foreground mr-2">Offer:</span> 
                                             <span className="font-mono text-primary font-bold">{formatEther(req.priceOffered)} ETH</span>
                                         </p>
                                     </div>
                                     
                                     {req.state === 0 && ( 
                                          <Button 
                                            onClick={() => handleAccept(req.user, req.priceOffered)}
                                            disabled={isConfirming}
                                            variant="secondary"
                                            size="sm"
                                            className="hover:bg-green-600 hover:text-white transition-colors"
                                          >
                                              {isConfirming ? "Accepting..." : "Accept Offer"}
                                          </Button>
                                     )}
                                     {req.state === 2 && (
                                         <span className="flex items-center gap-1 text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                             <Check className="w-3 h-3" /> Accepted
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
