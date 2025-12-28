"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { WalletConnect } from "@/components/WalletConnect";
import { isAddress } from "viem";

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">
            Manage Revenue Department Employees
          </p>
        </header>

        <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Add Employee</h2>
            <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Revenue Department ID</label>
                    <input 
                        type="number" 
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background"
                        placeholder="e.g. 101"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Employee Wallet Address</label>
                    <input 
                        type="text" 
                        value={employeeAddr}
                        onChange={(e) => setEmployeeAddr(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background"
                        placeholder="0x..."
                        required
                    />
                </div>
                
                {formError && (
                    <div className="text-red-500 text-sm">
                        {formError}
                    </div>
                )}
                {writeError && (
                    <div className="text-red-500 text-sm">
                        Error: {writeError.message.split("\n")[0]}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={isConfirming}
                    className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90"
                >
                    {isConfirming ? "Processing..." : "Authorize Employee"}
                </button>

                {isConfirmed && (
                    <div className="text-green-600 font-medium text-center">
                        Employee Authorized Successfully!
                    </div>
                )}
            </form>
        </div>

        <div className="text-sm text-gray-500">
            <p><strong>Note:</strong> Only the contract owner (Government) can perform this action.</p>
        </div>
      </div>
    </div>
  );
}
