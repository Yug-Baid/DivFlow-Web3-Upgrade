"use client";

import { useAccount, useReadContract } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import Link from "next/link";
import { useState } from "react";
import TransferOwnershipModal from "@/components/TransferOwnershipModal";
import SellPropertyModal from "@/components/SellPropertyModal";
// Fix Hydration Error: Import WalletConnect dynamically with no SSR
import dynamic from 'next/dynamic';
const WalletConnect = dynamic(() => import('@/components/WalletConnect').then(mod => mod.WalletConnect), { ssr: false });

export default function Dashboard() {
  const { address } = useAccount();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<bigint | null>(null);

  // Fetch properties owned by the user
  const result = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getPropertiesOfOwner",
    args: address ? [address] : undefined,
    query: {
         enabled: !!address,
    }
  });

  const properties = result.data;
  const isLoading = result.isLoading;
  const error = result.error;

  if (error) {
    console.error("Error fetching properties:", error);
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your registered properties
            </p>
          </div>




          <div className="flex items-center gap-4">
             <WalletConnect />
             <Link
              href="/register-land"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition"
            >
              + Register New Land
            </Link>
          </div>
        </header>

        <main>
          {isLoading ? (
             <div className="text-center py-10">Loading properties...</div>
          ) : !address ? (
            <div className="text-center py-20 border rounded-lg bg-card">
                <h3 className="text-lg font-medium">Wallet Not Connected</h3>
                <p className="text-muted-foreground">Please connect your wallet to view your properties.</p>
            </div>
          ) : properties && (properties as any[]).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(properties as any[]).map((property: any) => (
                <div key={property.propertyId.toString()} className="border rounded-lg p-6 bg-card shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg">Property #{property.propertyId.toString()}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        property.state === 2 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {property.state === 2 ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Location ID:</span>
                      <span className="font-mono">{property.locationId.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Survey No:</span>
                      <span className="font-mono">{property.surveyNumber.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Area:</span>
                      <span className="font-mono">{property.area.toString()} sq.ft</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t flex gap-2">
                     <button className="flex-1 bg-secondary text-secondary-foreground text-sm px-3 py-2 rounded-md hover:bg-secondary/80">
                        View Details
                     </button>
                     {/* Check if state is Verified (2) to allow selling */}
                     {property.state === 2 && (
                         <button 
                            onClick={() => {
                                setSelectedPropertyId(property.propertyId);
                                setIsSellModalOpen(true);
                            }}
                            className="flex-1 bg-teal-600 text-white text-sm px-3 py-2 rounded-md hover:bg-teal-700"
                         >
                            Sell
                         </button>
                     )}
                     <button 
                        onClick={() => {
                            setSelectedPropertyId(property.propertyId);
                            setIsTransferModalOpen(true);
                        }}
                        className="flex-1 border text-sm px-3 py-2 rounded-md hover:bg-accent text-destructive border-destructive/20 hover:text-destructive"
                     >
                        Transfer
                     </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border rounded-lg bg-card">
              <h3 className="text-lg font-medium">No Properties Found</h3>
              <p className="text-muted-foreground mt-2">You haven't registered any properties yet.</p>
              <Link href="/register-land" className="text-primary hover:underline mt-4 inline-block">
                Register your first property
              </Link>
            </div>
          )}
        </main>
        
        {selectedPropertyId !== null && (
            <>
                <TransferOwnershipModal
                    isOpen={isTransferModalOpen}
                    onClose={() => {
                        setIsTransferModalOpen(false);
                        setSelectedPropertyId(null);
                    }}
                    propertyId={selectedPropertyId}
                />
                <SellPropertyModal
                    isOpen={isSellModalOpen}
                    onClose={() => {
                        setIsSellModalOpen(false);
                        setSelectedPropertyId(null);
                    }}
                    propertyId={selectedPropertyId}
                />
            </>
        )}
      </div>
    </div>
  );
}
