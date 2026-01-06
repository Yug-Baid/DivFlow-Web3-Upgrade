"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, usePublicClient } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Building, Ruler, Hash, ArrowLeft, Upload, AlertTriangle, FileText, Loader2, Cloud, ShieldX } from "lucide-react";
import { keccak256, encodePacked } from "viem";
import { uploadToIPFS, isPinataConfigured, getIPFSUrl } from "@/lib/ipfs";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function RegisterLand() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Check if user is registered
  const { data: isRegistered, isLoading: isCheckingRegistration } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
  });

  // STAFF DETECTION: Check if user is a staff member
  const { data: inspectorLocation } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getInspectorLocation",
    args: address ? [address] : undefined,
  });

  const { data: employeeDept } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getEmployeeRevenueDept",
    args: address ? [address] : undefined,
  });

  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  const isLandInspector = inspectorLocation && Number(inspectorLocation) > 0;
  const isRevenueEmployee = employeeDept && Number(employeeDept) > 0;
  const isStaff = isAdmin || isLandInspector || isRevenueEmployee;

  // Reset form after successful registration
  useEffect(() => {
    if (isConfirmed) {
      // Reset form state for registering another property
      setFormData({
        locationId: "",
        revenueDeptId: "",
        surveyNumber: "",
        area: "",
      });
      setDocumentFile(null);
      setGeneratedHash("");

      // Redirect to dashboard after showing success message
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, router]);

  // Redirect unregistered users
  useEffect(() => {
    if (!isCheckingRegistration && isRegistered === false && address && !isStaff) {
      router.push('/register');
    }
  }, [isRegistered, isCheckingRegistration, address, router, isStaff]);

  const [formData, setFormData] = useState({
    locationId: "",
    revenueDeptId: "",
    surveyNumber: "",
    area: "",
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [generatedHash, setGeneratedHash] = useState<string>("");
  // landType is always 0 (WithPapers) - removed dropdown per ISSUE-4
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const publicClient = usePublicClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Upload file to IPFS via Pinata
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentFile(file);
    setUploadError(null);
    setGeneratedHash("");

    // Check if Pinata is configured
    if (!isPinataConfigured()) {
      // Fallback: Generate local hash for demo
      const fileData = `${file.name}-${file.size}-${file.lastModified}-${address}`;
      const hash = keccak256(encodePacked(['string'], [fileData]));
      const ipfsLikeHash = `Qm${hash.slice(2, 48)}`;
      setGeneratedHash(ipfsLikeHash);
      setUploadError("Pinata not configured - using local hash for demo");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadToIPFS(file);
      if (result.success && result.cid) {
        setGeneratedHash(result.cid);
      } else {
        setUploadError(result.error || "Upload failed");
        // Fallback to local hash
        const fileData = `${file.name}-${file.size}-${file.lastModified}-${address}`;
        const hash = keccak256(encodePacked(['string'], [fileData]));
        setGeneratedHash(`Qm${hash.slice(2, 48)}`);
      }
    } catch (err: any) {
      setUploadError(err.message || "IPFS upload failed");
      // Fallback to local hash
      const fileData = `${file.name}-${file.size}-${file.lastModified}-${address}`;
      const hash = keccak256(encodePacked(['string'], [fileData]));
      setGeneratedHash(`Qm${hash.slice(2, 48)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!generatedHash) {
      setSubmitError("Please upload a document first");
      return;
    }

    const args = [
      BigInt(formData.locationId),
      BigInt(formData.revenueDeptId),
      BigInt(formData.surveyNumber),
      BigInt(formData.area),
      generatedHash,
      0 // ISSUE-4: Always WithPapers - only valid paperwork allowed
    ] as const;

    // BUG 1 & 7 FIX: Simulate transaction first to catch reverts before spending gas
    try {
      await publicClient?.simulateContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "addLand",
        args: args,
        account: address,
      });
    } catch (simError: any) {
      setSubmitError(getErrorMessage(simError));
      return; // Don't send transaction if simulation fails
    }

    // Proceed with actual transaction
    try {
      writeContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "addLand",
        args: args,
      });
    } catch (error: any) {
      console.error("Registration failed:", error);
      setSubmitError(getErrorMessage(error));
    }
  };

  // Parse user-friendly error message from contract revert
  const getErrorMessage = (error: any): string => {
    if (!error) return "";

    // Extract message from various error formats (wagmi/viem)
    let msg = "";

    // Check for shortMessage (viem ContractFunctionExecutionError)
    if (error.shortMessage) {
      msg = error.shortMessage;
    }
    // Check for cause with shortMessage
    else if (error.cause?.shortMessage) {
      msg = error.cause.shortMessage;
    }
    // Check for cause.reason (contract revert reason)
    else if (error.cause?.reason) {
      msg = error.cause.reason;
    }
    // Check for data.message
    else if (error.data?.message) {
      msg = error.data.message;
    }
    // Fall back to error.message
    else if (error.message) {
      msg = error.message;
    }

    // Match specific contract error messages
    if (msg.includes("Property already registered") || msg.includes("already registered with these identifiers")) {
      return "This property (Location + Revenue Dept + Survey Number) is already registered!";
    }
    if (msg.includes("IPFS hash") || msg.includes("document") || msg.includes("already registered to another")) {
      return "This document has already been used for another property registration!";
    }
    if (msg.includes("User denied") || msg.includes("rejected") || msg.includes("user rejected")) {
      return "Transaction was rejected by user";
    }
    if (msg.includes("insufficient funds")) {
      return "Insufficient funds for gas fees";
    }

    // Return cleaned error message (first line, trimmed)
    const cleanMsg = msg.split('\n')[0].replace(/^Error:\s*/i, '').trim();
    return cleanMsg.slice(0, 200) || "Transaction failed. Please try again.";
  };

  if (!isMounted) return null;

  // STAFF ACCESS DENIED: Block staff from registering land
  if (isStaff) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <ShieldX className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-destructive">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            Government staff members cannot register land properties.
          </p>
          <p className="text-sm text-muted-foreground">
            As a {isAdmin ? "Admin" : isLandInspector ? "Land Inspector" : "Revenue Employee"},
            you can only verify/approve land registrations, not create them.
          </p>
        </GlassCard>
      </DashboardLayout>
    );
  }

  // Show loading while checking registration
  if (isCheckingRegistration) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Checking registration status...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Block unregistered users
  if (!isRegistered && address) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Registration Required</h2>
          <p className="text-muted-foreground mb-4">
            You must register your identity before registering properties.
          </p>
          <Button onClick={() => router.push('/register')} variant="hero">
            Register Now
          </Button>
        </GlassCard>
      </DashboardLayout>
    );
  }

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

            {/* ISSUE-4: Land Type Selector removed - only lands with valid paperwork allowed */}

            {/* File Upload for Document - IPFS Upload */}
            <div className="space-y-2">
              <Label htmlFor="document">Upload Land Deed Document</Label>
              <div className="relative">
                <input
                  id="document"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="document"
                  className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors bg-secondary/30 ${isUploading ? "border-primary animate-pulse" : "border-border hover:border-primary"
                    }`}
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isUploading
                        ? "Uploading to IPFS..."
                        : documentFile
                          ? documentFile.name
                          : "Click to upload document"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isUploading
                        ? "Please wait while your document is being pinned to IPFS"
                        : "PDF, JPG, PNG (Land deed, survey map, etc.)"}
                    </p>
                  </div>
                  {generatedHash && !isUploading && (
                    <Cloud className="w-6 h-6 text-green-500 ml-auto" />
                  )}
                </label>
              </div>
              {uploadError && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-500">{uploadError}</p>
                </div>
              )}
              {generatedHash && (
                <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> IPFS Hash (CID):
                  </p>
                  <p className="text-xs font-mono text-muted-foreground break-all">{generatedHash}</p>
                </div>
              )}
            </div>

            {/* Submit Error Display */}
            {submitError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Registration Error</p>
                    <p className="text-xs mt-1">{submitError}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isConfirming || !generatedHash || isUploading}
              className="w-full"
              variant="hero"
            >
              {isConfirming ? "Confirming..." : isUploading ? "Uploading..." : "Register Property"}
            </Button>
          </form>

          {hash && <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-xs break-all font-mono border border-border">Tx Hash: {hash}</div>}

          {isConfirmed && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-center text-sm font-bold animate-in bounce-in">
              Success! Redirecting to dashboard...
            </div>
          )}

          {writeError && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Registration Failed</p>
                  <p className="text-xs mt-1">{getErrorMessage(writeError)}</p>
                </div>
              </div>
            </div>
          )}

        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
