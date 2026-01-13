"use client";

import { useAccount, useReadContract } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/GlassCard";
import Link from "next/link";

// Admin address for role detection
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

interface StaffRouteGuardProps {
  children: ReactNode;
}

/**
 * StaffRouteGuard - Prevents staff members from accessing user pages
 * 
 * Staff includes:
 * - Admin
 * - Land Inspectors
 * - Revenue Employees
 * 
 * Staff can only access:
 * - /chat (global chat)
 * - /inspector (inspector portal)
 * - /revenue (revenue portal)
 * - /admin (admin portal)
 */
export function StaffRouteGuard({ children }: StaffRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [isChecking, setIsChecking] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [staffRole, setStaffRole] = useState<string>("");

  // Check if user is a Land Inspector
  const { data: inspectorLocation, isLoading: isLoadingInspector } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getInspectorLocation",
    args: address ? [address] : undefined,
  });

  // Check if user is a Revenue Employee
  const { data: employeeDept, isLoading: isLoadingEmployee } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getEmployeeRevenueDept",
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setIsChecking(false);
      return;
    }

    if (isLoadingInspector || isLoadingEmployee) {
      return;
    }

    const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
    const isLandInspector = !!(inspectorLocation && Number(inspectorLocation) > 0);
    const isRevenueEmployee = !!(employeeDept && Number(employeeDept) > 0);
    const userIsStaff = isAdmin || isLandInspector || isRevenueEmployee;

    setIsStaff(userIsStaff);
    
    if (isAdmin) {
      setStaffRole("Admin");
    } else if (isLandInspector) {
      setStaffRole("Land Inspector");
    } else if (isRevenueEmployee) {
      setStaffRole("Revenue Employee");
    }

    setIsChecking(false);
  }, [address, isConnected, inspectorLocation, employeeDept, isLoadingInspector, isLoadingEmployee]);

  // Get redirect URL based on staff role
  const getStaffPortalUrl = () => {
    if (staffRole === "Admin") return "/admin";
    if (staffRole === "Land Inspector") return "/inspector";
    if (staffRole === "Revenue Employee") return "/revenue";
    return "/";
  };

  // Show loading while checking
  if (isChecking || isLoadingInspector || isLoadingEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Block staff from accessing this page
  if (isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          
          <p className="text-muted-foreground mb-6">
            As a <span className="text-primary font-semibold">{staffRole}</span>, you cannot access user pages.
            Please use your dedicated portal.
          </p>

          <div className="space-y-3">
            <Button
              variant="hero"
              className="w-full"
              onClick={() => router.push(getStaffPortalUrl())}
            >
              Go to {staffRole} Portal
            </Button>
            
            <Link href="/chat">
              <Button variant="outline" className="w-full">
                Open Global Chat
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Staff members have dedicated portals with specialized tools for their roles.
          </p>
        </GlassCard>
      </div>
    );
  }

  // Not staff - render children normally
  return <>{children}</>;
}
