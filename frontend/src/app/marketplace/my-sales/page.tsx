"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
// import { WalletConnect } from "@/components/WalletConnect";
import dynamic from 'next/dynamic';
const WalletConnect = dynamic(() => import('@/components/WalletConnect').then(mod => mod.WalletConnect), { ssr: false });
import { formatEther } from "viem";
import Link from "next/link";

export default function MySales() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all sales and filter on client to ensure consistency with Marketplace
  const { data: allSales, isLoading } = useReadContract({
    address: TRANSFER_OWNERSHIP_ADDRESS,
    abi: TRANSFER_OWNERSHIP_ABI,
    functionName: "getAllSales",
  });

  // Filter for my sales safely
  const mySales = (allSales as any[])?.filter(
      (sale: any) => address && sale.owner.toLowerCase() === address.toLowerCase()
  );

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Sales</h1>
            <p className="text-muted-foreground mt-2">
              Manage your listed properties and requests
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/marketplace" className="text-sm hover:underline">Marketplace</Link>
             <WalletConnect />
          </div>
        </header>

        <main>
          {isLoading ? (
             <div className="text-center py-10">Loading sales...</div>
          ) : !mySales || mySales.length === 0 ? (
            <div className="text-center py-20 border rounded-lg bg-card">
                <h3 className="text-lg font-medium">No Active Sales</h3>
                <p className="text-muted-foreground">You haven't listed any properties for sale.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {mySales.map((sale: any) => (
                <SaleItem key={sale.saleId.toString()} sale={sale} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
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
        <div className="border rounded-lg p-6 bg-card shadow-sm">
            <div className="flex justify-between items-center">
                <div>
                   <h3 className="font-semibold text-lg">Sale #{sale.saleId.toString()} (Property #{sale.propertyId.toString()})</h3>
                   <span className="text-sm text-gray-500">Listed Price: {formatEther(sale.price)} ETH</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                     sale.state === 1 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                    {sale.state === 0 ? 'Active' : sale.state === 1 ? 'Accepted' : 'Closed'}
                </div>
            </div>

            {sale.state === 0 && (
                <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium text-sm mb-3">Purchase Requests</h4>
                    {isLoadingRequests ? <div>Loading requests...</div> : 
                     !requests || (requests as any[]).length === 0 ? <p className="text-sm text-muted-foreground">No requests yet.</p> :
                     (
                        <div className="space-y-2">
                             {(requests as any[]).map((req: any, idx: number) => (
                                 <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                     <div className="text-sm">
                                         <p><span className="font-bold">Buyer:</span> {req.user.slice(0,6)}...{req.user.slice(-4)}</p>
                                         <p><span className="font-bold">Offer:</span> {formatEther(req.priceOffered)} ETH</p>
                                     </div>
                                     {req.state === 0 && ( // Pending request
                                          <button 
                                            onClick={() => handleAccept(req.user, req.priceOffered)}
                                            disabled={isConfirming}
                                            className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-md hover:bg-primary/90"
                                          >
                                              {isConfirming ? "Accepting..." : "Accept Offer"}
                                          </button>
                                     )}
                                     {req.state === 2 && <span className="text-green-600 text-xs font-bold">Accepted</span>}
                                 </div>
                             ))}
                        </div>
                     )
                    }
                </div>
            )}
             {isConfirmed && <p className="text-green-600 text-sm mt-2">Offer Accepted Successfully!</p>}
        </div>
    )
}
