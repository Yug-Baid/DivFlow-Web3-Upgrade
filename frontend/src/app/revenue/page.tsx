"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";

export default function RevenueDashboard() {
  const { address } = useAccount();
  const [deptId, setDeptId] = useState<string>("101"); 

  const safeDeptId = deptId && !isNaN(Number(deptId)) ? BigInt(deptId) : BigInt(0);

  // Read properties for a specific revenue department
  const { data: properties, isLoading, refetch } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getPropertiesByRevenueDeptId",
    args: [safeDeptId],
  });

  // Read authorized employee for this department
  const { data: authorizedEmployeeData } = useReadContract({
      address: LAND_REGISTRY_ADDRESS,
      abi: LAND_REGISTRY_ABI,
      functionName: "revenueDeptIdToEmployee",
      args: [safeDeptId],
      query: {
         enabled: !!deptId
      }
  });
  
  const authorizedEmployee = authorizedEmployeeData as string | undefined;

  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Auto-refresh properties after successful verification
  if (isConfirmed) {
      setTimeout(() => refetch(), 1000);
  }

  const handleVerify = async (propertyId: bigint) => {
    console.log("Verifying property:", propertyId);
    if (!address) {
        alert("Please connect wallet");
        return;
    }
    if (authorizedEmployee && address.toLowerCase() !== authorizedEmployee.toLowerCase()) {
        alert("You are NOT the authorized employee for this department. Transaction will fail.");
    }

    try {
      writeContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "verifyProperty",
        args: [propertyId],
      });
    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  const handleRefresh = () => {
      console.log("Refreshing for Dept ID:", deptId);
      refetch();
  };

  const isAuthorized = address && authorizedEmployee && address.toLowerCase() === authorizedEmployee.toLowerCase();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenue Dept. Portal</h1>
            <p className="text-muted-foreground mt-2">
              Verify and Manage Land Registrations
            </p>
          </div>
          <div className="flex items-center gap-4">
             <WalletConnect />
          </div>
        </header>

        <div className="bg-muted/30 p-4 rounded-lg border">
            <div className="flex items-end gap-4 mb-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Department ID</label>
                    <input 
                        type="number" 
                        value={deptId} 
                        onChange={(e) => setDeptId(e.target.value)}
                        className="p-2 border rounded-md bg-background w-32"
                    />
                </div>
                <button onClick={handleRefresh} className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                    Refresh List
                </button>
            </div>
            
            <div className="text-sm space-y-1">
                <div className="flex gap-2">
                    <span className="font-semibold">Authorized Officer:</span>
                    <span className="font-mono text-muted-foreground">
                         {authorizedEmployee && authorizedEmployee !== "0x0000000000000000000000000000000000000000" 
                            ? (authorizedEmployee as string)
                            : "None Assigned"}
                    </span>
                </div>
                <div className="flex gap-2">
                    <span className="font-semibold">Your Status:</span>
                    {isAuthorized ? (
                        <span className="text-green-600 font-bold">✅ Authorized</span>
                    ) : (
                        <span className="text-red-500 font-bold">❌ Not Authorized (Switch Account)</span>
                    )}
                </div>
            </div>
        </div>

        <main>
          {isLoading ? (
             <div className="text-center py-10">Loading properties...</div>
          ) : !properties || (properties as any[]).length === 0 ? (
            <div className="text-center py-20 border rounded-lg bg-card">
                <h3 className="text-lg font-medium">No Properties Found</h3>
                <p className="text-muted-foreground">No properties pending in this department.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(properties as any[]).map((property: any) => (
                <div key={property.propertyId.toString()} className="border rounded-lg p-6 bg-card shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg">Property #{property.propertyId.toString()}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        property.state === 2 ? 'bg-green-100 text-green-800' : 
                        property.state === 3 ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                      {property.state === 2 ? 'Verified' : property.state === 3 ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Owner:</span>
                      <span className="font-mono text-xs">{property.owner.slice(0,6)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Survey No:</span>
                      <span className="font-mono">{property.surveyNumber.toString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Area:</span>
                      <span className="font-mono">{property.area.toString()} sq.ft</span>
                    </div>
                    <div className="flex justify-between items-center bg-muted/50 p-2 rounded mt-2">
                      <span>Document:</span>
                      {property.ipfsHash ? (
                          <a href={`https://ipfs.io/ipfs/${property.ipfsHash}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs truncate max-w-[100px]">
                            {property.ipfsHash}
                          </a>
                      ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>

                  {property.state === 0 && ( // Created state
                      <div className="mt-6 pt-4 border-t flex gap-2">
                          <button 
                             onClick={() => handleVerify(property.propertyId)}
                             className="flex-1 bg-green-600 text-white text-sm px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                             disabled={isConfirming}
                          >
                             {isConfirming ? "Verifying..." : "Verify"}
                          </button>
                          <button 
                             className="flex-1 bg-red-600 text-white text-sm px-3 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                             disabled={isConfirming}
                          >
                             Reject
                          </button>
                       </div>
                   )}
                   {isConfirmed && <div className="mt-2 text-xs text-green-600 text-center font-bold">Action Confirmed! Refreshing...</div>}
                   {writeError && (
                        <div className="mt-2 text-xs text-red-600 text-center break-words bg-red-100 p-2 rounded">
                            <p className="font-bold">Error Details:</p>
                            {writeError.message}
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
