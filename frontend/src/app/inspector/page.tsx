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
import { MapPin, CheckCircle, XCircle, Search, FileCheck, AlertTriangle, Eye } from "lucide-react";

export default function InspectorDashboard() {
    const { address } = useAccount();
    const [isMounted, setIsMounted] = useState(false);
    const [locationId, setLocationId] = useState<string>("1");
    const [rejectPropertyId, setRejectPropertyId] = useState<bigint | null>(null);
    const [rejectReason, setRejectReason] = useState<string>("");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const safeLocationId = locationId && !isNaN(Number(locationId)) ? BigInt(locationId) : BigInt(0);

    // Read properties for a specific location
    const { data: properties, isLoading, refetch } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getPropertiesByLocation",
        args: [safeLocationId],
    });

    // Read authorized inspector for this location
    const { data: authorizedInspectorData } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "landInspectorByLocation",
        args: [safeLocationId],
        query: {
            enabled: !!locationId
        }
    });

    const authorizedInspector = authorizedInspectorData as string | undefined;

    const { writeContract, data: hash, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        if (isConfirmed) {
            setTimeout(() => {
                refetch();
                resetWrite();
                setRejectPropertyId(null);
                setRejectReason("");
            }, 1000);
        }
    }, [isConfirmed, refetch, resetWrite]);

    // Determine if the user is authorized
    const isAuthorized = address && authorizedInspector && address.toLowerCase() === authorizedInspector.toLowerCase();

    const handleVerify = async (propertyId: bigint) => {
        if (!address) {
            alert("Please connect wallet");
            return;
        }
        if (!isAuthorized) {
            alert("You are NOT the authorized land inspector for this location.");
            return;
        }

        try {
            writeContract({
                address: LAND_REGISTRY_ADDRESS,
                abi: LAND_REGISTRY_ABI,
                functionName: "verifyPropertyByInspector",
                args: [propertyId],
            });
        } catch (error) {
            console.error("Verification failed:", error);
        }
    };

    const handleReject = async (propertyId: bigint) => {
        if (!address) {
            alert("Please connect wallet");
            return;
        }
        if (!isAuthorized) {
            alert("You are NOT the authorized land inspector for this location.");
            return;
        }
        if (!rejectReason.trim()) {
            alert("Please provide a reason for rejection");
            return;
        }

        try {
            writeContract({
                address: LAND_REGISTRY_ADDRESS,
                abi: LAND_REGISTRY_ABI,
                functionName: "rejectPropertyByInspector",
                args: [propertyId, rejectReason],
            });
        } catch (error) {
            console.error("Rejection failed:", error);
        }
    };

    const handleRefresh = () => {
        refetch();
    };

    const getStateLabel = (state: number) => {
        switch (state) {
            case 0: return "Pending Review";
            case 2: return "Verified";
            case 3: return "Rejected";
            case 4: return "On Sale";
            case 5: return "Bought";
            case 6: return "Sale Pending";
            default: return "Unknown";
        }
    };

    const getStateColor = (state: number) => {
        switch (state) {
            case 0: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case 2: return "bg-green-500/10 text-green-500 border-green-500/20";
            case 3: return "bg-red-500/10 text-red-500 border-red-500/20";
            case 4: return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case 5: return "bg-purple-500/10 text-purple-500 border-purple-500/20";
            case 6: return "bg-orange-500/10 text-orange-500 border-orange-500/20";
            default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    const getLandTypeLabel = (landType: number) => {
        return landType === 0 ? "With Papers" : "Without Papers";
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    // Filter to show only pending properties (state === 0)
    const pendingProperties = (properties as any[])?.filter((p: any) => p.state === 0) || [];

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Land Inspector Portal</h1>
                <p className="text-muted-foreground">Verify and inspect land registrations for your assigned location</p>
            </div>

            <div className="grid gap-6 mb-8">
                <GlassCard className="p-6">
                    <div className="flex flex-col md:flex-row items-end gap-4">
                        <div className="space-y-2 flex-grow">
                            <Label htmlFor="locationId">Location ID</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="locationId"
                                    type="number"
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="pl-10 bg-secondary/30"
                                    placeholder="Enter Location ID"
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
                            <span className="text-muted-foreground">Authorized Inspector:</span>
                            <span className="font-mono bg-background/50 px-2 py-1 rounded border border-border/50">
                                {authorizedInspector && authorizedInspector !== "0x0000000000000000000000000000000000000000"
                                    ? `${authorizedInspector.slice(0, 8)}...${authorizedInspector.slice(-6)}`
                                    : "None Assigned"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Your Status:</span>
                            {isAuthorized ? (
                                <span className="text-green-500 font-bold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                                    <CheckCircle className="w-3 h-3" /> Authorized Inspector
                                </span>
                            ) : (
                                <div className="flex flex-col items-end">
                                    <span className="text-yellow-500 font-bold flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                                        <Eye className="w-3 h-3" /> View Only Mode
                                    </span>
                                    {authorizedInspector && authorizedInspector !== "0x0000000000000000000000000000000000000000" && (
                                        <span className="text-[10px] text-muted-foreground mt-1">
                                            Switch wallet to verify
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
                    <div className="text-center py-10 text-muted-foreground animate-pulse">Loading location records...</div>
                ) : pendingProperties.length === 0 ? (
                    <GlassCard className="text-center py-16">
                        <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileCheck className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">No Pending Inspections</h3>
                        <p className="text-muted-foreground mt-2">There are no properties awaiting inspection for Location ID {locationId}.</p>
                    </GlassCard>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {pendingProperties.map((property: any) => (
                            <motion.div key={property.propertyId.toString()} variants={itemVariants}>
                                <GlassCard hover className="relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-semibold text-lg text-foreground">Property #{property.propertyId.toString()}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full border ${getStateColor(property.state)}`}>
                                            {getStateLabel(property.state)}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm mb-6">
                                        <div className="flex justify-between p-2 rounded bg-secondary/30">
                                            <span className="text-muted-foreground">Applicant</span>
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
                                        <div className="flex justify-between px-2">
                                            <span className="text-muted-foreground">Land Type</span>
                                            <span className={`font-mono text-xs px-2 py-0.5 rounded ${property.landType === 0 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                {getLandTypeLabel(property.landType)}
                                            </span>
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
                                        <div className="space-y-3">
                                            {isAuthorized ? (
                                                rejectPropertyId === property.propertyId ? (
                                                    // Reject reason form
                                                    <div className="space-y-2">
                                                        <Input
                                                            placeholder="Enter rejection reason..."
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                            className="text-sm"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => handleReject(property.propertyId)}
                                                                disabled={isConfirming || !rejectReason.trim()}
                                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                                                size="sm"
                                                            >
                                                                {isConfirming ? "Rejecting..." : "Confirm Reject"}
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    setRejectPropertyId(null);
                                                                    setRejectReason("");
                                                                }}
                                                                variant="secondary"
                                                                size="sm"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Verify/Reject buttons
                                                    <div className="flex gap-3">
                                                        <Button
                                                            onClick={() => handleVerify(property.propertyId)}
                                                            disabled={isConfirming}
                                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                            size="sm"
                                                        >
                                                            {isConfirming ? "Verifying..." : "Verify"}
                                                        </Button>
                                                        <Button
                                                            onClick={() => setRejectPropertyId(property.propertyId)}
                                                            disabled={isConfirming}
                                                            className="flex-1 bg-red-600/80 hover:bg-red-700 text-white"
                                                            size="sm"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-full text-center p-2 text-xs text-muted-foreground bg-secondary/50 rounded border border-border/50">
                                                    Only authorized inspectors can verify
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isConfirmed && (
                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                            <div className="bg-card p-4 rounded-xl border border-border shadow-2xl animate-in zoom-in text-center">
                                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                                <p className="font-bold text-green-500">Action Complete!</p>
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
