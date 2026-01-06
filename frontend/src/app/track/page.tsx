"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Eye, Clock, CheckCircle, XCircle, Store, Wallet, AlertTriangle, FileText, MapPin, Loader2, User } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";

// Property state labels
const stateLabels: { [key: number]: { label: string; color: string; icon: any } } = {
    0: { label: "Pending Review", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Clock },
    1: { label: "Scheduled", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: Clock },
    2: { label: "Verified", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle },
    3: { label: "Rejected", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: XCircle },
    4: { label: "On Sale", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: Store },
    5: { label: "Sold", color: "bg-gray-500/20 text-gray-500 border-gray-500/30", icon: CheckCircle },
    6: { label: "Sale Pending Approval", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: Clock },
};

export default function TrackRequests() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Check if user is registered
    const { data: isRegistered, isLoading: isCheckingRegistration } = useReadContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "isUserRegistered",
        args: address ? [address] : undefined,
    });

    // Get user's properties
    const { data: properties, isLoading: isLoadingProperties, refetch } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getPropertiesOfOwner",
        args: address ? [address] : undefined,
        query: {
            enabled: !!address && isRegistered === true,
        }
    });

    const propertiesList = useMemo(() => (properties as any[]) || [], [properties]);

    // Fetch Land Inspectors for each property's location
    const inspectorQueries = useMemo(() =>
        propertiesList.map((property: any) => ({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: "landInspectorByLocation",
            args: [property.locationId],
        })),
        [propertiesList]
    );

    // Fetch Revenue Employees for each property's department
    const employeeQueries = useMemo(() =>
        propertiesList.map((property: any) => ({
            address: LAND_REGISTRY_ADDRESS as `0x${string}`,
            abi: LAND_REGISTRY_ABI,
            functionName: "revenueDeptIdToEmployee",
            args: [property.revenueDepartmentId],
        })),
        [propertiesList]
    );

    const { data: inspectorResults, isLoading: isLoadingInspectors } = useReadContracts({
        contracts: inspectorQueries,
        query: { enabled: propertiesList.length > 0 },
    });

    const { data: employeeResults, isLoading: isLoadingEmployees } = useReadContracts({
        contracts: employeeQueries,
        query: { enabled: propertiesList.length > 0 },
    });

    // Redirect unregistered users
    useEffect(() => {
        if (!isCheckingRegistration && isRegistered === false && address) {
            router.push('/register');
        }
    }, [isRegistered, isCheckingRegistration, address, router]);



    const isLoading = isCheckingRegistration || isLoadingProperties || isLoadingInspectors || isLoadingEmployees;

    // Redirect disconnected users
    useEffect(() => {
        if (isMounted && !isConnected) {
            router.push('/');
        }
    }, [isConnected, router, isMounted]);

    // Show loading checks
    if (!isMounted || isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isConnected) return null; // Prevent flash before redirect

    // Helper to format address for display
    const formatAddress = (addr: string) => {
        if (!addr || addr === "0x0000000000000000000000000000000000000000") return null;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Track Requests</h1>
                <p className="text-muted-foreground">Monitor the status of your property registrations and sales</p>
            </div>

            {/* Workflow Info */}
            <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Property Workflow
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded">1. Pending Review</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded">2. Inspector Verified</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-500 rounded">3. Sale Request Pending</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-500 rounded">4. On Marketplace</span>
                </div>
            </div>

            {propertiesList.length === 0 ? (
                <GlassCard className="text-center py-20">
                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Eye className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No Properties Found</h3>
                    <p className="text-muted-foreground mt-2 mb-6">You haven't registered any properties yet.</p>
                    <Link href="/register-land">
                        <Button variant="hero">Register New Land</Button>
                    </Link>
                </GlassCard>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    {propertiesList.map((property: any, idx: number) => {
                        const stateInfo = stateLabels[Number(property.state)] || stateLabels[0];
                        const StateIcon = stateInfo.icon;

                        // Get Land Inspector for this property's location
                        const landInspector = inspectorResults?.[idx]?.status === 'success'
                            ? inspectorResults[idx].result as string
                            : null;

                        // Get Revenue Employee for this property's department
                        const revenueEmployee = employeeResults?.[idx]?.status === 'success'
                            ? employeeResults[idx].result as string
                            : null;

                        return (
                            <GlassCard key={idx} className="p-0 overflow-hidden">
                                {/* Header */}
                                <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Property #{property.propertyId.toString()}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                Land Registry ID: {property.locationId.toString()} | Survey #{property.surveyNumber.toString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${stateInfo.color}`}>
                                        <StateIcon className="w-3 h-3" />
                                        {stateInfo.label}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Area</p>
                                        <p className="font-medium">{property.area.toString()} sq.ft</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Revenue Dept ID</p>
                                        <p className="font-medium">{property.revenueDepartmentId.toString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Listed Price</p>
                                        <p className="font-medium">
                                            {property.price > 0 ? `${formatEther(property.price)} ETH` : "Not Listed"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs mb-1">Registered</p>
                                        <p className="font-medium">
                                            {new Date(Number(property.registeredTime) * 1000).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Staff Contact Info - BUG-6 FIX: Show BOTH contacts */}
                                {(formatAddress(landInspector || '') || formatAddress(revenueEmployee || '')) && (
                                    <div className="p-4 border-t border-border/50 bg-secondary/10">
                                        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            Staff Contacts
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Land Inspector */}
                                            {formatAddress(landInspector || '') && (
                                                <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                                                            <Eye className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-blue-400 font-medium">Land Inspector</p>
                                                        <code className="text-xs font-mono text-foreground truncate block">
                                                            {landInspector}
                                                        </code>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Revenue Employee */}
                                            {formatAddress(revenueEmployee || '') && (
                                                <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                                                            <FileText className="w-4 h-4 text-orange-400" />
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-orange-400 font-medium">Revenue Dept Employee</p>
                                                        <code className="text-xs font-mono text-foreground truncate block">
                                                            {revenueEmployee}
                                                        </code>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Contact these addresses for updates on your request.
                                        </p>
                                    </div>
                                )}

                                {/* Rejection Reason - Show for both registration rejection (state 3) and sale rejection (state 2 with reason) */}
                                {(Number(property.state) === 3 || (Number(property.state) === 2 && property.rejectedReason)) && property.rejectedReason && (
                                    <div className="p-4 border-t border-red-500/20 bg-red-500/5">
                                        <p className="text-xs text-red-500 font-medium mb-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {Number(property.state) === 3 ? "Registration Rejection Reason" : "Sale Request Rejected"}
                                        </p>
                                        <p className="text-sm text-red-400">{property.rejectedReason}</p>
                                        {Number(property.state) === 2 && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Your sale request was rejected by the Revenue Department. You can request to sell again with updated details.
                                            </p>
                                        )}
                                        {Number(property.state) === 3 && (
                                            <div className="mt-3">
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    You can re-submit your application with corrected details.
                                                </p>
                                                <Link href="/register-land">
                                                    <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                                        Re-register Property
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}
                </motion.div>
            )}

            {/* Refresh Button */}
            <div className="mt-6 text-center">
                <Button onClick={() => refetch()} variant="secondary" size="sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Refresh Status
                </Button>
            </div>
        </DashboardLayout>
    );
}
