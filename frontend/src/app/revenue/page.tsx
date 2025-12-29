"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useState, useEffect } from "react";
// import { WalletConnect } from "@/components/WalletConnect";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Building, CheckCircle, XCircle, Search, FileCheck, AlertTriangle } from "lucide-react";

export default function RevenueDashboard() {
  const { address } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [deptId, setDeptId] = useState<string>("101"); 

  useEffect(() => {
    setIsMounted(true);
  }, []); 

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

  if (isConfirmed) {
      setTimeout(() => refetch(), 1000);
  }

  const handleVerify = async (propertyId: bigint) => {
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
      refetch();
  };

  const isAuthorized = address && authorizedEmployee && address.toLowerCase() === authorizedEmployee.toLowerCase();

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
        <h1 className="text-3xl font-bold text-foreground mb-2">Revenue Portal</h1>
        <p className="text-muted-foreground">Verify and authorize land registrations</p>
      </div>

      <div className="grid gap-6 mb-8">
          <GlassCard className="p-6">
              <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="space-y-2 flex-grow">
                      <Label htmlFor="deptId">Department ID</Label>
                      <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                              id="deptId"
                              type="number" 
                              value={deptId} 
                              onChange={(e) => setDeptId(e.target.value)}
                              className="pl-10 bg-secondary/30"
                              placeholder="Enter Dept ID"
                          />
                      </div>
                  </div>
                  <Button onClick={handleRefresh} variant="secondary">
                      <Search className="w-4 h-4 mr-2" />
                      Load Properties
                  </Button>
              </div>

              <div className="mt-6 p-4 bg-secondary/20 rounded-lg border border-border/50 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Authorized Officer:</span>
                      <span className="font-mono bg-background/50 px-2 py-1 rounded border border-border/50">
                           {authorizedEmployee && authorizedEmployee !== "0x0000000000000000000000000000000000000000" 
                              ? `${authorizedEmployee.slice(0, 8)}...${authorizedEmployee.slice(-6)}`
                              : "None Assigned"}
                      </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      {isAuthorized ? (
                          <span className="text-green-500 font-bold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                              <CheckCircle className="w-3 h-3" /> Authorized
                          </span>
                      ) : (
                          <div className="flex flex-col items-end">
                              <span className="text-red-500 font-bold flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                  <XCircle className="w-3 h-3" /> Unauthorized
                              </span>
                              {authorizedEmployee && authorizedEmployee !== "0x0000000000000000000000000000000000000000" && (
                                  <span className="text-[10px] text-muted-foreground mt-1">
                                      Switch wallet to: {authorizedEmployee.slice(0, 6)}...{authorizedEmployee.slice(-4)}
                                  </span>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </GlassCard>
      </div>

      <main>
        {!isMounted ? (
             <div className="text-center py-10 text-muted-foreground animate-pulse">Initializing...</div>
        ) : isLoading ? (
             <div className="text-center py-10 text-muted-foreground animate-pulse">Loading departmental records...</div>
        ) : !properties || (properties as any[]).length === 0 ? (
          <GlassCard className="text-center py-16">
              <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No Pending Registrations</h3>
              <p className="text-muted-foreground mt-2">There are no properties to verify for Department ID {deptId}.</p>
          </GlassCard>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {(properties as any[]).map((property: any) => (
              <motion.div key={property.propertyId.toString()} variants={itemVariants}>
                  <GlassCard hover className="relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg text-foreground">Property #{property.propertyId.toString()}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                          property.state === 2 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          property.state === 3 ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }`}>
                        {property.state === 2 ? 'Verified' : property.state === 3 ? 'Rejected' : 'Pending Review'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-6">
                      <div className="flex justify-between p-2 rounded bg-secondary/30">
                        <span className="text-muted-foreground">Applicant</span>
                        <span className="font-mono text-xs text-foreground">{property.owner.slice(0,8)}...</span>
                      </div>
                      <div className="flex justify-between px-2">
                        <span className="text-muted-foreground">Survey No</span>
                        <span className="font-mono text-foreground">{property.surveyNumber.toString()}</span>
                      </div>
                      <div className="flex justify-between px-2">
                        <span className="text-muted-foreground">Area</span>
                        <span className="font-mono text-foreground">{property.area.toString()} sq.ft</span>
                      </div>
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground block mb-1">Document Hash</span>
                        {property.ipfsHash ? (
                            <a 
                                href={`https://ipfs.io/ipfs/${property.ipfsHash}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block p-2 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 text-xs truncate hover:bg-blue-500/20 transition-colors"
                            >
                              {property.ipfsHash}
                            </a>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">No document attached</span>
                        )}
                      </div>
                    </div>

                    {property.state === 0 && ( 
                        <div className="flex gap-3">
                            <Button 
                               onClick={() => handleVerify(property.propertyId)}
                               disabled={isConfirming || !isAuthorized}
                               className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                               size="sm"
                            >
                               {isConfirming ? "Verifying..." : "Verify"}
                            </Button>
                            <Button 
                               disabled={isConfirming || !isAuthorized}
                               className="flex-1 bg-red-600/80 hover:bg-red-700 text-white"
                               size="sm"
                            >
                               Reject
                            </Button>
                         </div>
                     )}
                     
                     {!isAuthorized && property.state === 0 && (
                         <div className="mt-2 flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded">
                             <AlertTriangle className="w-3 h-3" />
                             Auth Required
                         </div>
                     )}

                     {isConfirmed && (
                         <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                             <div className="bg-card p-4 rounded-xl border border-border shadow-2xl animate-in zoom-in text-center">
                                 <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                 <p className="font-bold text-green-500">Verified!</p>
                             </div>
                         </div>
                     )}
                     
                     {writeError && (
                          <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 break-words">
                              {writeError.message}
                          </div>
                     )}
                  </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </DashboardLayout>
  );
}
