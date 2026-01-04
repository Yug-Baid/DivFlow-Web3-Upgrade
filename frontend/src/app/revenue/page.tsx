"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Building, CheckCircle, Search, FileCheck, ShoppingBag } from "lucide-react";

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

  const { writeContract, data: hash, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => {
        refetch();
        resetWrite();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, refetch, resetWrite]);

  // Determine if the user is authorized
  const isAuthorized = address && authorizedEmployee && address.toLowerCase() === authorizedEmployee.toLowerCase();

  // B5 FIX: Handle sale approval (not initial verification - that's done by Inspector)
  const handleApproveSale = async (propertyId: bigint) => {
    if (!address) {
      alert("Please connect wallet");
      return;
    }
    if (!isAuthorized) {
      alert("You are NOT the authorized employee for this department.");
      return;
    }

    try {
      writeContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "approveSaleRequest",
        args: [propertyId],
      });
    } catch (error) {
      console.error("Sale approval failed:", error);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // B5 FIX: Filter to only show properties with state 6 (SalePending)
  // These are properties that have been verified by Inspector and owner wants to sell
  const salePendingProperties = (properties as any[])?.filter((p: any) => p.state === 6) || [];

  const getStateLabel = (state: number) => {
    switch (state) {
      case 0: return "Created";
      case 2: return "Verified";
      case 3: return "Rejected";
      case 4: return "On Sale";
      case 5: return "Bought";
      case 6: return "Sale Pending";
      default: return "Unknown";
    }
  };

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
        {/* B5 FIX: Updated description to reflect sale approval workflow */}
        <p className="text-muted-foreground">Approve sale requests for verified properties</p>
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
              <span className="text-muted-foreground">Your Status:</span>
              {isAuthorized ? (
                <span className="text-green-500 font-bold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                  <CheckCircle className="w-3 h-3" /> Authorized Officer
                </span>
              ) : (
                <div className="flex flex-col items-end">
                  <span className="text-yellow-500 font-bold flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                    <FileCheck className="w-3 h-3" /> View Only Mode
                  </span>
                  {authorizedEmployee && authorizedEmployee !== "0x0000000000000000000000000000000000000000" && (
                    <span className="text-[10px] text-muted-foreground mt-1">
                      Switch wallet to approve
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* B5 FIX: Info box explaining the workflow */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400">
              <strong>Workflow:</strong> Properties appear here after Land Inspector verification and when owner requests sale.
              Approve the sale to allow the property to be listed on the marketplace.
            </p>
          </div>
        </GlassCard>
      </div>

      <main>
        {!isMounted ? (
          <div className="text-center py-10 text-muted-foreground animate-pulse">Initializing...</div>
        ) : isLoading ? (
          <div className="text-center py-10 text-muted-foreground animate-pulse">Loading departmental records...</div>
        ) : salePendingProperties.length === 0 ? (
          <GlassCard className="text-center py-16">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Sale Requests</h3>
            <p className="text-muted-foreground mt-2">There are no pending sale requests for Department ID {deptId}.</p>
            <p className="text-xs text-muted-foreground mt-4">
              Properties must be verified by Land Inspector first, then owner requests sale.
            </p>
          </GlassCard>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {salePendingProperties.map((property: any) => (
              <motion.div key={property.propertyId.toString()} variants={itemVariants}>
                <GlassCard hover className="relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg text-foreground">Property #{property.propertyId.toString()}</h3>
                    <span className="text-xs px-2 py-1 rounded-full border bg-orange-500/10 text-orange-500 border-orange-500/20">
                      {getStateLabel(property.state)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-6">
                    <div className="flex justify-between p-2 rounded bg-secondary/30">
                      <span className="text-muted-foreground">Owner</span>
                      <span className="font-mono text-xs text-foreground">{property.owner.slice(0, 8)}...</span>
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

                  {/* B5 FIX: Sale approval button for SalePending properties */}
                  <div className="flex gap-3">
                    {isAuthorized ? (
                      <Button
                        onClick={() => handleApproveSale(property.propertyId)}
                        disabled={isConfirming}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        {isConfirming ? "Approving..." : "Approve Sale"}
                      </Button>
                    ) : (
                      <div className="w-full text-center p-2 text-xs text-muted-foreground bg-secondary/50 rounded border border-border/50">
                        Only authorized officers can approve sales
                      </div>
                    )}
                  </div>

                  {isConfirmed && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="bg-card p-4 rounded-xl border border-border shadow-2xl animate-in zoom-in text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-bold text-green-500">Sale Approved!</p>
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
