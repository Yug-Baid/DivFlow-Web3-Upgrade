"use client";

import { useRouter } from "next/navigation";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { MapPin, CheckCircle, XCircle, Search, FileCheck, AlertTriangle, Eye, Info, FileText, Image as ImageIcon, History, ExternalLink, MessageCircle, Copy } from "lucide-react";
import { UserInfoModal } from "@/components/UserInfoModal";
import { PropertyDetailsModal } from "@/components/PropertyDetailsModal";
import { resolveIPFS, getIPFSUrl, PropertyMetadata } from "@/lib/ipfs";
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/PropertyMap'), {
    ssr: false,
    loading: () => <div className="h-48 w-full bg-secondary/30 animate-pulse rounded-lg" />
});

// Metadata Cache
const metadataCache: Record<string, PropertyMetadata | null> = {};

export default function InspectorDashboard() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const [isMounted, setIsMounted] = useState(false);

    // State
    const [locationId, setLocationId] = useState<string>("560001"); // Default to example
    const [rejectPropertyId, setRejectPropertyId] = useState<bigint | null>(null);
    const [rejectReason, setRejectReason] = useState<string>("");
    const [selectedUserAddress, setSelectedUserAddress] = useState<string | null>(null);
    const [resolvedMetadata, setResolvedMetadata] = useState<Record<string, PropertyMetadata | string>>({});
    const [historyLogs, setHistoryLogs] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<any | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Redirect disconnected users
    useEffect(() => {
        if (isMounted && !isConnected) {
            router.push('/');
        }
    }, [isConnected, router, isMounted]);

    const safeLocationId = locationId && !isNaN(Number(locationId)) ? BigInt(locationId) : BigInt(0);

    // Read properties for a specific location
    const { data: properties, isLoading, refetch } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getPropertiesByLocation",
        args: [safeLocationId],
    });

    // Read authorized inspector
    const { data: authorizedInspectorData } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "landInspectorByLocation",
        args: [safeLocationId],
        query: { enabled: !!locationId }
    });
    const authorizedInspector = authorizedInspectorData as string | undefined;

    // Write Contract
    const { writeContract, data: hash, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed) {
            setTimeout(() => {
                refetch();
                resetWrite();
                setRejectPropertyId(null);
                setRejectReason("");
                fetchHistory(); // Refresh history
            }, 1000);
        }
    }, [isConfirmed, refetch, resetWrite]);

    const isAuthorized = address && authorizedInspector && address.toLowerCase() === authorizedInspector.toLowerCase();

    // Filter Pending Properties
    const pendingProperties = useMemo(() =>
        (properties as any[])?.filter((p: any) => p.state === 0) || [],
        [properties]);

    // Fetch Revenue Employees for each property's department using useReadContracts (batch query)
    const revenueEmployeeQueries = useMemo(() =>
        pendingProperties.map((property: any) => ({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: "revenueDeptIdToEmployee",
            args: [property.revenueDepartmentId],
        })),
        [pendingProperties]
    );

    const { data: revenueEmployeeResults } = useReadContracts({
        contracts: revenueEmployeeQueries,
        query: { enabled: pendingProperties.length > 0 },
    });

    // Resolve Metadata (separate effect for IPFS)
    useEffect(() => {
        pendingProperties.forEach(async (p: any) => {
            const hash = p.ipfsHash;
            if (hash && !resolvedMetadata[hash]) {
                if (metadataCache[hash]) {
                    setResolvedMetadata(prev => ({ ...prev, [hash]: metadataCache[hash]! }));
                } else {
                    const { isMetadata, data } = await resolveIPFS(hash);
                    metadataCache[hash] = data;
                    setResolvedMetadata(prev => ({ ...prev, [hash]: data }));
                }
            }
        });
    }, [pendingProperties]);

    // Fetch History Logs
    const fetchHistory = async () => {
        if (!publicClient || !address || !isAuthorized) return;
        setIsLoadingHistory(true);
        try {
            // Fetch Verify/Reject events for this inspector
            // Fetch ALL Verify/Reject events and filter in JS to be safe
            const verified = await publicClient.getContractEvents({
                address: LAND_REGISTRY_ADDRESS,
                abi: LAND_REGISTRY_ABI,
                eventName: 'PropertyVerifiedByInspector',
                fromBlock: 'earliest'
            });
            const rejected = await publicClient.getContractEvents({
                address: LAND_REGISTRY_ADDRESS,
                abi: LAND_REGISTRY_ABI,
                eventName: 'PropertyRejectedByInspector',
                fromBlock: 'earliest'
            });

            // Filter by inspector address in JS
            const myVerified = verified.filter(l => (l.args as any).inspector?.toString().toLowerCase() === address.toLowerCase());
            const myRejected = rejected.filter(l => (l.args as any).inspector?.toString().toLowerCase() === address.toLowerCase());

            const logs = [
                ...myVerified.map(l => ({ type: 'Verified', ...l })),
                ...myRejected.map(l => ({ type: 'Rejected', ...l }))
            ].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)); // Newest first

            setHistoryLogs(logs);
        } catch (e) {
            console.error("History fetch error:", e);
        }
        setIsLoadingHistory(false);
    };

    useEffect(() => {
        if (isAuthorized) fetchHistory();
    }, [isAuthorized, address]);


    // Actions
    const handleVerify = async (propertyId: bigint) => {
        if (!address || !isAuthorized) return;
        writeContract({
            address: LAND_REGISTRY_ADDRESS,
            abi: LAND_REGISTRY_ABI,
            functionName: "verifyPropertyByInspector",
            args: [propertyId],
        });
    };

    const handleReject = async (propertyId: bigint) => {
        if (!address || !isAuthorized || !rejectReason.trim()) return;
        writeContract({
            address: LAND_REGISTRY_ADDRESS,
            abi: LAND_REGISTRY_ABI,
            functionName: "rejectPropertyByInspector",
            args: [propertyId, rejectReason],
        });
    };

    const getMetadata = (hash: string) => {
        const data = resolvedMetadata[hash];
        return typeof data === 'object' ? data : null;
    };

    const getStateLabel = (state: number) => {
        switch (state) {
            case 0: return "Pending Review";
            case 2: return "Verified";
            case 3: return "Rejected";
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
                <h1 className="text-3xl font-bold text-foreground mb-2">Land Inspector Portal</h1>
                <p className="text-muted-foreground">Verify and inspect land registrations for your assigned location</p>
            </div>

            {/* Location Selector */}
            <GlassCard className="p-6 mb-8">
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="space-y-2 flex-grow">
                        <Label htmlFor="locationId">Location ID (Region Code)</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="locationId"
                                type="number"
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                                className="pl-10 bg-secondary/30"
                            />
                        </div>
                    </div>
                    <Button onClick={() => refetch()} variant="secondary">
                        <Search className="w-4 h-4 mr-2" /> Load Properties
                    </Button>
                </div>

                {/* Status Bar */}
                <div className="mt-4 flex items-center justify-between text-sm p-3 bg-secondary/20 rounded-lg border border-border/50">
                    <div>
                        <span className="text-muted-foreground">Assigned Inspector: </span>
                        <span className="font-mono">{authorizedInspector ? `${authorizedInspector.slice(0, 8)}...` : "None"}</span>
                    </div>
                    <div>
                        {isAuthorized ? (
                            <span className="text-green-500 font-bold flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Authorized
                            </span>
                        ) : (
                            <span className="text-yellow-500 font-bold flex items-center gap-1">
                                <Eye className="w-4 h-4" /> View Only
                            </span>
                        )}
                    </div>
                </div>
            </GlassCard>

            <Tabs defaultValue="pending" className="space-y-6">
                <TabsList className="bg-secondary/40 border border-border/50">
                    <TabsTrigger value="pending" className="gap-2">
                        <FileCheck className="w-4 h-4" /> Pending Inspections
                        {pendingProperties.length > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">{pendingProperties.length}</span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" /> My Action History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    {!isMounted ? (
                        <div className="text-center py-10 animate-pulse">Initializing...</div>
                    ) : isLoading ? (
                        <div className="text-center py-10 animate-pulse">Loading properties...</div>
                    ) : pendingProperties.length === 0 ? (
                        <GlassCard className="text-center py-16">
                            <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No Pending Inspections</h3>
                            <p className="text-muted-foreground">All caught up for Location {locationId}!</p>
                        </GlassCard>
                    ) : (
                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingProperties.map((property: any, idx: number) => {
                                const meta = getMetadata(property.ipfsHash);
                                // Get revenue employee from batch query results
                                const revenueEmployee = revenueEmployeeResults?.[idx]?.status === 'success'
                                    ? revenueEmployeeResults[idx].result as string
                                    : null;
                                const isValidRevEmployee = revenueEmployee && revenueEmployee !== '0x0000000000000000000000000000000000000000';

                                return (
                                    <motion.div key={property.propertyId.toString()} variants={itemVariants}>
                                        <GlassCard hover className="relative overflow-hidden flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-bold text-lg">Property #{property.propertyId.toString()}</h3>
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                    Pending Review
                                                </span>
                                            </div>

                                            <div className="space-y-3 flex-grow mb-6">
                                                {/* Details */}
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="bg-secondary/30 p-2 rounded">
                                                        <span className="text-xs text-muted-foreground block">Survey No</span>
                                                        <span className="font-mono">{property.surveyNumber.toString()}</span>
                                                    </div>
                                                    <div className="bg-secondary/30 p-2 rounded">
                                                        <span className="text-xs text-muted-foreground block">Area</span>
                                                        <span className="font-mono">{property.area.toString()} sq.ft</span>
                                                    </div>
                                                </div>

                                                {/* Property Address from IPFS */}
                                                {meta?.properties?.location?.address && (
                                                    <div className="p-2 bg-secondary/30 rounded text-sm">
                                                        <span className="text-xs text-muted-foreground block mb-1">Property Address</span>
                                                        <div className="flex items-start gap-1">
                                                            <MapPin className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                                                            <span className="text-foreground">{meta.properties.location.address}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Map Component */}
                                                {(meta?.properties?.location?.lat && meta?.properties?.location?.lng) && (
                                                    <div className="h-32 w-full rounded-lg overflow-hidden border border-border/50">
                                                        <DynamicMap
                                                            pos={[meta.properties.location.lat, meta.properties.location.lng]}
                                                            zoom={15}
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded text-sm mb-2">
                                                    <span className="text-muted-foreground">Applicant</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono">{property.owner.slice(0, 6)}...</span>
                                                        <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => setSelectedUserAddress(property.owner)}>
                                                            <Info className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/20 rounded text-sm">
                                                    <span className="text-blue-400 text-xs uppercase font-semibold">Revenue Officer</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono text-xs break-all max-w-[180px]">
                                                            {isValidRevEmployee ? `${revenueEmployee.slice(0, 6)}...${revenueEmployee.slice(-4)}` : "Not Assigned"}
                                                        </span>
                                                        {isValidRevEmployee && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-5 w-5 shrink-0"
                                                                onClick={() => navigator.clipboard.writeText(revenueEmployee)}
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Documents Section */}
                                                <div className="space-y-2 pt-2 border-t border-border/50">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</p>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {meta?.image && (
                                                            <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open(getIPFSUrl(meta.image), '_blank')}>
                                                                <ImageIcon className="w-3 h-3 mr-1" /> Cover
                                                            </Button>
                                                        )}
                                                        {meta?.properties?.deed && (
                                                            <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open(getIPFSUrl(meta.properties.deed), '_blank')}>
                                                                <FileText className="w-3 h-3 mr-1" /> Deed
                                                            </Button>
                                                        )}
                                                        {/* Additional Photos */}
                                                        {meta?.properties?.photos && meta.properties.photos.map((photo: string, i: number) => (
                                                            <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => window.open(getIPFSUrl(photo), '_blank')}>
                                                                <ImageIcon className="w-3 h-3 mr-1" /> Photo {i + 1}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* View Details Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full mt-2"
                                                    onClick={() => setSelectedProperty(property)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" /> View Details
                                                </Button>
                                            </div>

                                            {/* Actions */}
                                            {isAuthorized ? (
                                                rejectPropertyId === property.propertyId ? (
                                                    <div className="space-y-2 animate-in slide-in-from-bottom-2">
                                                        <Input
                                                            placeholder="Reason for rejection..."
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                            className="text-sm"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button
                                                                className="flex-1 bg-red-600 hover:bg-red-700"
                                                                size="sm"
                                                                onClick={() => handleReject(property.propertyId)}
                                                                disabled={isConfirming}
                                                            >
                                                                {isConfirming ? "Rejecting..." : "Confirm"}
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => { setRejectPropertyId(null); setRejectReason(""); }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                                            size="sm"
                                                            onClick={() => handleVerify(property.propertyId)}
                                                            disabled={isConfirming}
                                                        >
                                                            {isConfirming ? "Verifying..." : "Verify"}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            className="flex-1"
                                                            size="sm"
                                                            onClick={() => setRejectPropertyId(property.propertyId)}
                                                            disabled={isConfirming}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="text-center text-xs text-muted-foreground p-2 bg-secondary/50 rounded">
                                                    Authorization Required
                                                </div>
                                            )}

                                            {writeError && <p className="text-xs text-red-500 mt-2 truncate">{writeError.message}</p>}
                                        </GlassCard>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </TabsContent>



                <TabsContent value="history">
                    <GlassCard>
                        <h3 className="text-lg font-bold mb-4">My Recent Actions</h3>
                        {isLoadingHistory ? (
                            <div className="text-center py-8">Loading history...</div>
                        ) : historyLogs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No actions recorded yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {historyLogs.map((log, i) => (
                                    <div className="flex flex-col md:flex-row items-center justify-between p-3 bg-secondary/20 rounded border border-border/50 gap-4">
                                        <div className="flex items-center gap-3">
                                            {log.type === 'Verified' ? (
                                                <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-red-500/10 rounded-full text-red-500">
                                                    <XCircle className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {log.type} Property #{log.args.propertyId.toString()}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono break-all">
                                                    Tx: {log.transactionHash}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(`https://sepolia.etherscan.io/tx/${log.transactionHash}`, '_blank')}
                                            className="h-8 text-xs shrink-0"
                                        >
                                            View <ExternalLink className="w-3 h-3 ml-2" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </TabsContent>
            </Tabs>

            <UserInfoModal
                isOpen={!!selectedUserAddress}
                onClose={() => setSelectedUserAddress(null)}
                userAddress={selectedUserAddress || ""}
                isStaffView={true}
            />

            <PropertyDetailsModal
                isOpen={!!selectedProperty}
                onClose={() => setSelectedProperty(null)}
                property={selectedProperty}
            />

        </DashboardLayout>
    );
}
