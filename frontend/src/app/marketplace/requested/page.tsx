"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { WalletConnect } from "@/components/WalletConnect";
import { formatEther } from "viem";
import Link from "next/link";

export default function RequestedSales() {
  const { address } = useAccount();

  // Fetch my requested sales
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
              value: price // Send value with transaction
           });
      } catch (e) {
          console.error(e);
      }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
            <p className="text-muted-foreground mt-2">
              Status of your purchase requests
            </p>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/marketplace" className="text-sm hover:underline">Marketplace</Link>
             <WalletConnect />
          </div>
        </header>

        <main>
          {isLoading ? (
             <div className="text-center py-10">Loading requests...</div>
          ) : !sales || (sales as any[]).length === 0 ? (
            <div className="text-center py-20 border rounded-lg bg-card">
                <h3 className="text-lg font-medium">No Requests Found</h3>
                <p className="text-muted-foreground">You haven't requested to buy any properties.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(sales as any[]).map((sale: any) => (
                <div key={sale.saleId.toString()} className="border rounded-lg p-6 bg-card shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg">Sale #{sale.saleId.toString()}</h3>
                    <div className="flex flex-col items-end gap-1">
                         <span className={`text-xs px-2 py-1 rounded-full ${
                             sale.state === 1 && sale.acceptedFor.toLowerCase() === address?.toLowerCase() ? 'bg-green-100 text-green-800' :
                             sale.state === 3 ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'
                         }`}>
                           {sale.state === 1 && sale.acceptedFor.toLowerCase() === address?.toLowerCase() ? 'Accepted! Pay Now' : 
                            sale.state === 3 ? 'Completed' : 'Pending'}
                         </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    <div className="flex justify-between">
                      <span>Property ID:</span>
                      <span className="font-mono">{sale.propertyId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-mono">{formatEther(sale.price)} ETH</span>
                    </div>
                    {sale.state === 1 && (
                         <div className="flex justify-between text-green-700 font-bold">
                             <span>Accepted Price:</span>
                             <span>{formatEther(sale.acceptedPrice)} ETH</span>
                         </div>
                    )}
                  </div>

                  {sale.state === 1 && sale.acceptedFor.toLowerCase() === address?.toLowerCase() && (
                      <div className="mt-4 pt-4 border-t">
                          <button 
                             onClick={() => handlePayment(sale.saleId, sale.acceptedPrice)}
                             disabled={isConfirming}
                             className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                             {isConfirming ? "Processing Payment..." : `Pay ${formatEther(sale.acceptedPrice)} ETH & Claim Ownership`}
                          </button>
                      </div>
                  )}
                   {isConfirmed && <p className="text-green-600 text-sm mt-2 text-center">Ownership Transferred Successfully!</p>}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
