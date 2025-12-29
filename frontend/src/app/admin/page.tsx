"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { isAddress } from "viem";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserPlus, Building, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdminPage() {
  const { address } = useAccount();
  const [deptId, setDeptId] = useState("");
  const [employeeAddr, setEmployeeAddr] = useState("");

  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [formError, setFormError] = useState("");

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!deptId || !employeeAddr) return;

    if (!isAddress(employeeAddr)) {
        setFormError("Invalid Ethereum Address format.");
        return;
    }

    try {
        writeContract({
            address: LAND_REGISTRY_ADDRESS,
            abi: LAND_REGISTRY_ABI,
            functionName: "mapRevenueDeptIdToEmployee",
            args: [BigInt(deptId), employeeAddr],
        });
    } catch(err) {
        console.error(err);
    }
  };

  return (
    <DashboardLayout>
       <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage Revenue Department Employee Authorization</p>
      </div>

      <div className="max-w-2xl mx-auto">
          <GlassCard className="p-8">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                      <h2 className="text-xl font-semibold text-foreground">Authorize Employee</h2>
                      <p className="text-sm text-muted-foreground">Grant permissions to revenue department officers.</p>
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
                  
                  {formError && (
                      <div className="flex items-center gap-2 p-3 text-destructive bg-destructive/10 rounded-md text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          {formError}
                      </div>
                  )}
                  {writeError && (
                      <div className="flex items-center gap-2 p-3 text-destructive bg-destructive/10 rounded-md text-sm break-all">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>Error: {writeError?.message ? writeError.message.split("\n")[0] : "Transaction failed"}</span>
                      </div>
                  )}

                  <Button 
                      type="submit" 
                      disabled={isConfirming}
                      className="w-full"
                      variant="hero"
                  >
                      {isConfirming ? "Processing Authorization..." : "Authorize Employee"}
                  </Button>

                  {isConfirmed && (
                      <div className="flex items-center justify-center gap-2 p-4 text-green-500 bg-green-500/10 rounded-lg font-medium animate-in zoom-in border border-green-500/20">
                          <CheckCircle className="w-5 h-5" />
                          Employee Authorized Successfully!
                      </div>
                  )}
              </form>
          </GlassCard>

          <div className="mt-6 flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg text-sm text-yellow-600/80">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p><strong>Security Note:</strong> This action permanently maps a Department ID to a wallet address. Only the contract owner (Government) has the authority to perform this action. Ensure the wallet address is correct before confirming.</p>
          </div>
      </div>
    </DashboardLayout>
  );
}
