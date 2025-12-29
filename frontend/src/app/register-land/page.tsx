"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Building, FileText, Ruler, Hash, ArrowLeft } from "lucide-react";

export default function RegisterLand() {
  const router = useRouter();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, router]);

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

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // or a loading spinner

  return (
    <DashboardLayout>
       <div className="mb-4">
           <Link href="/dashboard" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors">
               <ArrowLeft className="w-4 h-4" /> Back to Dashboard
           </Link>
       </div>
       
       <div className="max-w-2xl mx-auto">
           <GlassCard className="p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                        <MapPin className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Register New Land</h1>
                    <p className="text-muted-foreground mt-2">
                        Enter property details to register on blockchain
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="locationId">Location ID</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="locationId"
                                    type="number"
                                    name="locationId"
                                    required
                                    className="pl-10 bg-secondary/50 border-input"
                                    value={formData.locationId}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="revenueDeptId">Revenue Dept ID</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="revenueDeptId"
                                    type="number"
                                    name="revenueDeptId"
                                    required
                                    className="pl-10 bg-secondary/50 border-input"
                                    value={formData.revenueDeptId}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="surveyNumber">Survey Number</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="surveyNumber"
                                    type="number"
                                    name="surveyNumber"
                                    required
                                    className="pl-10 bg-secondary/50 border-input"
                                    value={formData.surveyNumber}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area">Area (sq. ft)</Label>
                            <div className="relative">
                                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="area"
                                    type="number"
                                    name="area"
                                    required
                                    className="pl-10 bg-secondary/50 border-input"
                                    value={formData.area}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ipfsHash">Document Hash (IPFS CID)</Label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="ipfsHash"
                                type="text"
                                name="ipfsHash"
                                required
                                placeholder="Qm..."
                                className="pl-10 bg-secondary/50 border-input"
                                value={formData.ipfsHash}
                                onChange={handleChange}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">This is the secure hash of your land deed document.</p>
                    </div>

                    <Button
                        type="submit"
                        disabled={isConfirming}
                        className="w-full"
                        variant="hero"
                    >
                        {isConfirming ? "Confirming..." : "Register Property"}
                    </Button>
                </form>

                {hash && <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-xs break-all font-mono border border-border">Tx Hash: {hash}</div>}
                
                {isConfirmed && (
                     <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-center text-sm font-bold animate-in bounce-in">
                        Success! Redirecting to dashboard...
                     </div>
                )}
                
                {writeError && <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center">Error: {writeError.message}</div>}

           </GlassCard>
       </div>
    </DashboardLayout>
  );
}
