"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterLand() {
  const router = useRouter();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [formData, setFormData] = useState({
    locationId: "",
    revenueDeptId: "",
    surveyNumber: "",
    area: "",
    ipfsHash: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      writeContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "addLand",
        args: [
          BigInt(formData.locationId),
          BigInt(formData.revenueDeptId),
          BigInt(formData.surveyNumber),
          BigInt(formData.area),
          formData.ipfsHash
        ],
      });
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-lg p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Register New Land</h1>
          <p className="text-muted-foreground text-sm">Enter property details to register on blockchain</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Location ID</label>
            <input
              type="number"
              name="locationId"
              required
              className="w-full p-2 rounded-md border bg-background text-foreground focus:ring-2 focus:ring-primary"
              value={formData.locationId}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Revenue Dept ID</label>
            <input
              type="number"
              name="revenueDeptId"
              required
              className="w-full p-2 rounded-md border bg-background text-foreground focus:ring-2 focus:ring-primary"
              value={formData.revenueDeptId}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Survey Number</label>
            <input
              type="number"
              name="surveyNumber"
              required
              className="w-full p-2 rounded-md border bg-background text-foreground focus:ring-2 focus:ring-primary"
              value={formData.surveyNumber}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Area (sq. ft)</label>
            <input
              type="number"
              name="area"
              required
              className="w-full p-2 rounded-md border bg-background text-foreground focus:ring-2 focus:ring-primary"
              value={formData.area}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Document Hash (IPFS CID)</label>
            <input
              type="text"
              name="ipfsHash"
              required
              placeholder="Qm..."
              className="w-full p-2 rounded-md border bg-background text-foreground focus:ring-2 focus:ring-primary"
              value={formData.ipfsHash}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground mt-1">Mock: Enter any string or 'Qm...'</p>
          </div>

          <button
            type="submit"
            disabled={isConfirming}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isConfirming ? "Confirming..." : "Register Property"}
          </button>
        </form>
        
        {hash && <div className="mt-4 p-3 bg-muted rounded-md text-xs break-all">Tx Hash: {hash}</div>}
        {isConfirmed && (
             <div className="mt-4 text-green-600 text-center text-sm font-medium">
                Success! Redirecting to dashboard...
                {setTimeout(() => router.push('/dashboard'), 2000) && ""} 
             </div>
        )}
        {writeError && <div className="mt-4 text-red-500 text-sm text-center">Error: {writeError.message}</div>}

        <div className="mt-6 text-center">
            <Link href="/dashboard" className="text-sm text-primary hover:underline">Cancel & Return to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
