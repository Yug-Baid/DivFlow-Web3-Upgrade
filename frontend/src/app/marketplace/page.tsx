"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { WalletConnect } from "@/components/WalletConnect";
import { formatEther, parseEther } from "viem";
import Link from "next/link";

export default function Marketplace() {
  const { address } = useAccount();
  const [locationId, setLocationId] = useState(""); // Filter by location (optional)
  const [offerPrice, setOfferPrice] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<bigint | null>(null);

  // Fetch all sales
  const { data: allSales, isLoading, refetch } = useReadContract({
    address: TRANSFER_OWNERSHIP_ADDRESS,
    abi: TRANSFER_OWNERSHIP_ABI,
    functionName: "getAllSales",
  });

  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Filter sales on client side if locationId is provided (ignoring for now as property details structure in getAllSales might not strictly include locationId unless we fetch it separately, but checking `getSalesByLocation` returns `Sales` struct which has `propertyId`, but `Sales` struct in contract DOES NOT have `locationId`. Wait.
  // The `Sales` struct has `propertyId`. 
  // `getAllSales` returns `Sales[]`. 
  // We can't filter by `locationId` purely from `Sales` struct unless we fetch property details too.
  // However, the `getSalesByLocation` function in contract did the filtering.
  // The user just wants to SEE the land. So showing ALL sales is the best fix.
  // I will just display all sales.

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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground mt-2">
              Browse and Buy Properties
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex gap-4 text-sm mr-4">
                 <Link href="/marketplace/my-sales" className="hover:underline">My Sales</Link>
                 <Link href="/marketplace/requested" className="hover:underline">My Requests</Link>
             </div>
             <WalletConnect />
          </div>
        </header>

        {/* Removed Location ID Search - Showing All Properties By Default */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">All Active Listings</h2>
            <button onClick={() => refetch()} className="text-sm border px-3 py-2 rounded-md hover:bg-accent">
                Refresh Listings
            </button>
        </div>

        <main>
          {isLoading ? (
             <div className="text-center py-10">Loading properties...</div>
          ) : !sales || (sales as any[]).length === 0 ? (
            <div className="text-center py-20 border rounded-lg bg-card">
                <h3 className="text-lg font-medium">No Properties Found</h3>
                <p className="text-muted-foreground">No properties listed for sale in this location.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(sales as any[]).map((sale: any) => (
                <div key={sale.saleId.toString()} className="border rounded-lg p-6 bg-card shadow-sm hover:shadow-md transition relative overflow-hidden">
                   {sale.owner === address && (
                       <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-bl-lg">Your Listing</div>
                   )}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg">Sale #{sale.saleId.toString()}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                       Price: {formatEther(sale.price)} ETH
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-6">
                    <div className="flex justify-between">
                      <span>Property ID:</span>
                      <span className="font-mono">{sale.propertyId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Owner:</span>
                      <span className="font-mono text-xs">{sale.owner.slice(0,6)}...{sale.owner.slice(-4)}</span>
                    </div>
                  </div>

                  {sale.owner !== address && sale.state === 0 && ( // Active state check
                      <div className="mt-4 pt-4 border-t">
                        {selectedSaleId === sale.saleId ? (
                             <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                                 <input
                                    type="number"
                                    step="0.0001" 
                                    placeholder="Offer Price (ETH)"
                                    className="w-full p-2 text-sm border rounded-md"
                                    value={offerPrice}
                                    onChange={(e) => setOfferPrice(e.target.value)}
                                    autoFocus
                                 />
                                 <div className="flex gap-2">
                                     <button 
                                        onClick={() => handleRequestPurchase(sale.saleId)}
                                        className="flex-1 bg-green-600 text-white text-sm px-3 py-2 rounded-md hover:bg-green-700"
                                        disabled={isConfirming}
                                     >
                                        {isConfirming ? "Sending..." : "Confirm Request"}
                                     </button>
                                     <button 
                                        onClick={() => setSelectedSaleId(null)}
                                        className="bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded-md hover:bg-gray-300"
                                     >
                                        Cancel
                                     </button>
                                 </div>
                             </div>
                        ) : (
                             <button 
                                onClick={() => {
                                    setSelectedSaleId(sale.saleId);
                                    setOfferPrice(formatEther(sale.price)); // Default to asking price
                                }}
                                className="w-full bg-primary text-primary-foreground text-sm px-3 py-2 rounded-md hover:bg-primary/90"
                             >
                                Request to Buy
                             </button>
                        )}
                      </div>
                  )}
                  
                  {isConfirmed && selectedSaleId === sale.saleId && (
                      <div className="mt-2 text-xs text-green-600 text-center font-medium">
                          Request Sent Successfully!
                      </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
