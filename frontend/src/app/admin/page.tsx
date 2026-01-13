"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { isAddress } from "viem";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserPlus, Building, AlertTriangle, CheckCircle, ShieldX, MapPin, Users } from "lucide-react";

// Contract owner address - Anvil account 0 (deployer)
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

export default function AdminPage() {
    const { address, isConnected } = useAccount();
    const [isMounted, setIsMounted] = useState(false);

    // Tab state for switching between Revenue and Inspector
    const [activeTab, setActiveTab] = useState<"revenue" | "inspector">("revenue");

    // Revenue Employee form state
    const [deptId, setDeptId] = useState("");
    const [employeeAddr, setEmployeeAddr] = useState("");
    const [revenueFormError, setRevenueFormError] = useState("");

    // Land Inspector form state
    const [locationId, setLocationId] = useState("");
    const [inspectorAddr, setInspectorAddr] = useState("");
    const [inspectorFormError, setInspectorFormError] = useState("");

    // ISSUE-1: Check for existing assignments (what's assigned to this location/dept)
    const { data: existingEmployee } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "revenueDeptIdToEmployee",
        args: deptId ? [BigInt(deptId)] : undefined,
        query: { enabled: !!deptId && !isNaN(Number(deptId)) },
    });

    const { data: existingInspector } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "landInspectorByLocation",
        args: locationId ? [BigInt(locationId)] : undefined,
        query: { enabled: !!locationId && !isNaN(Number(locationId)) },
    });

    // ISSUE-1 FIX: Check REVERSE mapping - is this ADDRESS already assigned to ANOTHER location/dept?
    // Using refetchOnMount/refetchOnWindowFocus/staleTime to ensure fresh data
    const { data: employeeCurrentDeptId, refetch: refetchEmployeeDept } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getEmployeeRevenueDept",
        args: employeeAddr && isAddress(employeeAddr) ? [employeeAddr as `0x${string}`] : undefined,
        query: {
            enabled: !!employeeAddr && isAddress(employeeAddr),
            staleTime: 0, // Always consider data stale
        },
    });

    const { data: inspectorCurrentLocationId, refetch: refetchInspectorLocation } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getInspectorLocation",
        args: inspectorAddr && isAddress(inspectorAddr) ? [inspectorAddr as `0x${string}`] : undefined,
        query: {
            enabled: !!inspectorAddr && isAddress(inspectorAddr),
            staleTime: 0, // Always consider data stale
        },
    });

    // Refetch when address inputs change
    useEffect(() => {
        if (employeeAddr && isAddress(employeeAddr)) {
            refetchEmployeeDept();
        }
    }, [employeeAddr, refetchEmployeeDept]);

    useEffect(() => {
        if (inspectorAddr && isAddress(inspectorAddr)) {
            refetchInspectorLocation();
        }
    }, [inspectorAddr, refetchInspectorLocation]);

    // Check if addresses are valid (not zero address)
    const hasExistingEmployee = existingEmployee && existingEmployee !== "0x0000000000000000000000000000000000000000";
    const hasExistingInspector = existingInspector && existingInspector !== "0x0000000000000000000000000000000000000000";

    // ISSUE-1 FIX: Check if the address is already assigned to a DIFFERENT location/dept
    const employeeAssignedElsewhere = Boolean(employeeCurrentDeptId) &&
        Number(employeeCurrentDeptId) !== 0 &&
        Number(employeeCurrentDeptId) !== Number(deptId);
    const inspectorAssignedElsewhere = Boolean(inspectorCurrentLocationId) &&
        Number(inspectorCurrentLocationId) !== 0 &&
        Number(inspectorCurrentLocationId) !== Number(locationId);

    // Shared write contract state
    const { writeContract, data: hash, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Reset success and error state after showing
    useEffect(() => {
        if (isConfirmed) {
            const timer = setTimeout(() => {
                resetWrite();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isConfirmed, resetWrite]);

    // ISSUE-1 FIX: Auto-clear write errors after 5 seconds
    useEffect(() => {
        if (writeError) {
            const timer = setTimeout(() => {
                resetWrite();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [writeError, resetWrite]);

    // Auto-clear form errors after 5 seconds
    useEffect(() => {
        if (revenueFormError) {
            const timer = setTimeout(() => {
                setRevenueFormError("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [revenueFormError]);

    useEffect(() => {
        if (inspectorFormError) {
            const timer = setTimeout(() => {
                setInspectorFormError("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [inspectorFormError]);

    // Check if current user is admin (contract owner)
    const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

    // Handle Add Revenue Employee
    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        setRevenueFormError("");
        if (!deptId || !employeeAddr) return;

        if (!isAddress(employeeAddr)) {
            setRevenueFormError("Invalid Ethereum Address format.");
            return;
        }

        // ISSUE-1 FIX: Block if address is already assigned to a different department
        if (employeeAssignedElsewhere) {
            setRevenueFormError(`This address is already assigned to Department #${employeeCurrentDeptId}. Remove them first.`);
            return;
        }

        try {
            writeContract({
                address: LAND_REGISTRY_ADDRESS,
                abi: LAND_REGISTRY_ABI,
                functionName: "mapRevenueDeptIdToEmployee",
                args: [BigInt(deptId), employeeAddr],
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Handle Add Land Inspector
    const handleAddInspector = async (e: React.FormEvent) => {
        e.preventDefault();
        setInspectorFormError("");
        if (!locationId || !inspectorAddr) return;

        if (!isAddress(inspectorAddr)) {
            setInspectorFormError("Invalid Ethereum Address format.");
            return;
        }

        // ISSUE-1 FIX: Block if address is already assigned to a different location
        if (inspectorAssignedElsewhere) {
            setInspectorFormError(`This address is already assigned to Location #${inspectorCurrentLocationId}. Remove them first.`);
            return;
        }

        try {
            writeContract({
                address: LAND_REGISTRY_ADDRESS,
                abi: LAND_REGISTRY_ABI,
                functionName: "assignLandInspector",
                args: [BigInt(locationId), inspectorAddr],
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Prevent hydration mismatch
    if (!isMounted) return null;

    // Show access denied for non-connected users
    if (!isConnected) {
        return (
            <DashboardLayout>
                <GlassCard className="p-8 max-w-md mx-auto text-center">
                    <ShieldX className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Wallet Not Connected</h2>
                    <p className="text-muted-foreground">
                        Please connect your wallet to access this page.
                    </p>
                </GlassCard>
            </DashboardLayout>
        );
    }

    // Show access denied for non-admin users
    if (!isAdmin) {
        return (
            <DashboardLayout>
                <GlassCard className="p-8 max-w-md mx-auto text-center">
                    <ShieldX className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2 text-destructive">Access Denied</h2>
                    <p className="text-muted-foreground mb-4">
                        This page is restricted to the Government (contract owner) only.
                    </p>
                    <div className="p-3 bg-secondary/50 rounded-lg text-xs font-mono break-all text-muted-foreground">
                        <p className="mb-1 text-foreground text-sm font-sans font-medium">Your wallet:</p>
                        {address}
                    </div>
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg text-xs">
                        <p className="text-muted-foreground">
                            Only the admin wallet ({ADMIN_ADDRESS.slice(0, 6)}...{ADMIN_ADDRESS.slice(-4)}) can manage staff.
                        </p>
                    </div>
                </GlassCard>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
                <p className="text-muted-foreground">Manage Staff Authorization - Land Inspectors & Revenue Employees</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
                <Button
                    variant={activeTab === "revenue" ? "hero" : "secondary"}
                    onClick={() => setActiveTab("revenue")}
                    className="flex items-center gap-2"
                >
                    <Building className="w-4 h-4" />
                    Revenue Employees
                </Button>
                <Button
                    variant={activeTab === "inspector" ? "hero" : "secondary"}
                    onClick={() => setActiveTab("inspector")}
                    className="flex items-center gap-2"
                >
                    <MapPin className="w-4 h-4" />
                    Land Inspectors
                </Button>
            </div>

            <div className="max-w-2xl mx-auto">
                {/* Revenue Employee Tab */}
                {activeTab === "revenue" && (
                    <GlassCard className="p-8">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
                            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                                <Building className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Add Revenue Employee</h2>
                                <p className="text-sm text-muted-foreground">Assign employee to approve sale requests</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddEmployee} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="deptId">Revenue Department ID</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="deptId"
                                        type="number"
                                        value={deptId}
                                        onChange={(e) => setDeptId(e.target.value)}
                                        className="pl-10 bg-secondary/30"
                                        placeholder="e.g. 101"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This ID will be auto-assigned to properties for this employee to review
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="employeeAddr">Employee Wallet Address</Label>
                                <div className="relative">
                                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="employeeAddr"
                                        type="text"
                                        value={employeeAddr}
                                        onChange={(e) => setEmployeeAddr(e.target.value)}
                                        className="pl-10 bg-secondary/30 font-mono"
                                        placeholder="0x..."
                                        required
                                    />
                                </div>
                            </div>

                            {revenueFormError && (
                                <div className="flex items-center gap-2 p-3 text-destructive bg-destructive/10 rounded-md text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    {revenueFormError}
                                </div>
                            )}

                            {/* ISSUE-1 FIX: Show RED error if address already assigned elsewhere */}
                            {employeeAssignedElsewhere && (
                                <div className="flex items-start gap-2 p-3 text-red-500 bg-red-500/10 rounded-md text-sm border border-red-500/30">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Address Already Assigned!</p>
                                        <p className="text-xs mt-1">
                                            This wallet is already assigned to Department #{String(employeeCurrentDeptId)}.
                                        </p>
                                        <p className="text-xs mt-1 text-red-400">
                                            Cannot assign to multiple departments. Remove from current assignment first.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ISSUE-1: Show existing assignment warning */}
                            {hasExistingEmployee && !employeeAssignedElsewhere && (
                                <div className="flex items-start gap-2 p-3 text-yellow-600 bg-yellow-500/10 rounded-md text-sm border border-yellow-500/20">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Department Already Assigned</p>
                                        <p className="text-xs mt-1 font-mono break-all">
                                            Current: {existingEmployee as string}
                                        </p>
                                        <p className="text-xs mt-1 text-yellow-600/70">
                                            Submitting will replace the existing employee.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isConfirming || employeeAssignedElsewhere}
                                className="w-full"
                                variant="hero"
                            >
                                {isConfirming ? "Processing Authorization..." : employeeAssignedElsewhere ? "Cannot Assign (Already Used)" : "Authorize Revenue Employee"}
                            </Button>
                        </form>
                    </GlassCard>
                )}

                {/* Land Inspector Tab */}
                {activeTab === "inspector" && (
                    <GlassCard className="p-8">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Add Land Inspector</h2>
                                <p className="text-sm text-muted-foreground">Assign inspector to verify property registrations</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddInspector} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="locationId">Land Registry ID (Location)</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="locationId"
                                        type="number"
                                        value={locationId}
                                        onChange={(e) => setLocationId(e.target.value)}
                                        className="pl-10 bg-secondary/30"
                                        placeholder="e.g. 1"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Properties with this Land Registry ID will be assigned to this inspector
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="inspectorAddr">Inspector Wallet Address</Label>
                                <div className="relative">
                                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="inspectorAddr"
                                        type="text"
                                        value={inspectorAddr}
                                        onChange={(e) => setInspectorAddr(e.target.value)}
                                        className="pl-10 bg-secondary/30 font-mono"
                                        placeholder="0x..."
                                        required
                                    />
                                </div>
                            </div>

                            {inspectorFormError && (
                                <div className="flex items-center gap-2 p-3 text-destructive bg-destructive/10 rounded-md text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    {inspectorFormError}
                                </div>
                            )}

                            {/* ISSUE-1 FIX: Show RED error if address already assigned elsewhere */}
                            {inspectorAssignedElsewhere && (
                                <div className="flex items-start gap-2 p-3 text-red-500 bg-red-500/10 rounded-md text-sm border border-red-500/30">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Address Already Assigned!</p>
                                        <p className="text-xs mt-1">
                                            This wallet is already assigned to Location #{String(inspectorCurrentLocationId)}.
                                        </p>
                                        <p className="text-xs mt-1 text-red-400">
                                            Cannot assign to multiple locations. Remove from current assignment first.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ISSUE-1: Show existing assignment warning */}
                            {hasExistingInspector && !inspectorAssignedElsewhere && (
                                <div className="flex items-start gap-2 p-3 text-yellow-600 bg-yellow-500/10 rounded-md text-sm border border-yellow-500/20">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Location Already Assigned</p>
                                        <p className="text-xs mt-1 font-mono break-all">
                                            Current: {existingInspector as string}
                                        </p>
                                        <p className="text-xs mt-1 text-yellow-600/70">
                                            Submitting will replace the existing inspector.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isConfirming || inspectorAssignedElsewhere}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                {isConfirming ? "Processing Assignment..." : inspectorAssignedElsewhere ? "Cannot Assign (Already Used)" : "Assign Land Inspector"}
                            </Button>
                        </form>
                    </GlassCard>
                )}

                {/* Success/Error Messages */}
                {isConfirmed && (
                    <div className="mt-6 flex items-center justify-center gap-2 p-4 text-green-500 bg-green-500/10 rounded-lg font-medium animate-in zoom-in border border-green-500/20">
                        <CheckCircle className="w-5 h-5" />
                        {activeTab === "revenue" ? "Revenue Employee" : "Land Inspector"} Authorized Successfully!
                    </div>
                )}

                {writeError && (
                    <div className="mt-6 flex items-center gap-2 p-3 text-destructive bg-destructive/10 rounded-md text-sm break-all">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Error: {writeError?.message ? writeError.message.split("\n")[0] : "Transaction failed"}</span>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-6 flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg text-sm text-yellow-600/80">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p><strong>Security Note:</strong> These actions permanently assign staff to departments/locations.</p>
                        <p className="mt-2 text-xs">
                            • <strong>Land Inspectors</strong> verify property registrations before they can be sold<br />
                            • <strong>Revenue Employees</strong> approve sale requests before properties go to marketplace
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
