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
import { MapPin, Building, Ruler, Hash, ArrowLeft, Upload, AlertTriangle, FileText, Loader2, Cloud, ShieldX, Image as ImageIcon, Plus } from "lucide-react";
import { uploadToIPFS, uploadMetadata, isPinataConfigured, PropertyMetadata } from "@/lib/ipfs";
import { PropertyLocationPicker } from "@/components/PropertyLocationPicker";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function RegisterLand() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [formData, setFormData] = useState({
    locationId: "",
    revenueDeptId: "",
    surveyNumber: "",
    area: "",
    addressLine: "", // NEW: Address from geocoding
    lat: 20.5937, // Default center
    lng: 78.9629,
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

  // AUTO-GENERATE SURVEY NUMBER
  // Fetch properties for the current location to determine the next survey number
  const safeLocationId = formData.locationId && !isNaN(Number(formData.locationId)) ? BigInt(formData.locationId) : undefined;

  const { data: locationProperties, isLoading: isLoadingLocationProps } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getPropertiesByLocation",
    args: safeLocationId !== undefined ? [safeLocationId] : undefined,
    query: { enabled: !!safeLocationId }
  });

  // Effect to update survey number when location properties load
  useEffect(() => {
    if (locationProperties) {
      const nextSurveyNo = (locationProperties as any[]).length + 1;
      setFormData(prev => ({ ...prev, surveyNumber: nextSurveyNo.toString() }));
    }
  }, [locationProperties]);

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
        addressLine: "",
        lat: 20.5937, // Default center
        lng: 78.9629,
      });
      setFiles({
        coverPhoto: null,
        deedDocument: null,
        extraPhotos: []
      });
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



  const [files, setFiles] = useState<{
    coverPhoto: File | null;
    deedDocument: File | null;
    extraPhotos: File[];
  }>({
    coverPhoto: null,
    deedDocument: null,
    extraPhotos: []
  });

  const [generatedHash, setGeneratedHash] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentUploadStep, setCurrentUploadStep] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const publicClient = usePublicClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // NEW: Handle location select from PropertyLocationPicker
  const handleLocationSelect = (data: { lat: number; lng: number; address: string; formatted?: string }) => {
    const { lat, lng, address, formatted } = data;

    // AUTO-ID GENERATION (MOCK LOGIC)
    // Simulate "Region Code" (Location ID) based on latitude integer
    const mockLocationId = Math.floor(lat * 1000).toString().slice(0, 6);

    // Simulate "Revenue Dept ID" based on longitude integer
    const mockRevenueId = Math.floor(lng * 10).toString().slice(0, 3);

    // Auto-fill the form with location data AND address
    setFormData(prev => ({
      ...prev,
      lat,
      lng,
      addressLine: address || formatted || '',
      locationId: mockLocationId,
      revenueDeptId: mockRevenueId
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'deed' | 'extra') => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (type === 'cover') {
      setFiles(prev => ({ ...prev, coverPhoto: selectedFiles[0] }));
    } else if (type === 'deed') {
      setFiles(prev => ({ ...prev, deedDocument: selectedFiles[0] }));
    } else if (type === 'extra') {
      const newPhotos = [...files.extraPhotos, ...Array.from(selectedFiles)];
      if (newPhotos.length > 5) {
        // Show error or just truncate? User said "5 images should be a hard limit"
        // I'll truncate and warn.
        alert("You can only upload a maximum of 5 additional photos.");
        setFiles(prev => ({
          ...prev,
          extraPhotos: newPhotos.slice(0, 5)
        }));
      } else {
        setFiles(prev => ({
          ...prev,
          extraPhotos: newPhotos
        }));
      }
    }
    setUploadError(null);
  };

  const removeExtraPhoto = (index: number) => {
    setFiles(prev => ({
      ...prev,
      extraPhotos: prev.extraPhotos.filter((_, i) => i !== index)
    }));
  };

  const uploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setUploadError(null);

    // Validation
    if (!files.coverPhoto) {
      setSubmitError("Please upload a Cover Photo for the marketplace.");
      return;
    }
    if (!files.deedDocument) {
      setSubmitError("Please upload the Property Deed Document.");
      return;
    }

    setIsUploading(true);
    setGeneratedHash(""); // Reset hash

    try {
      // 1. Upload Cover Photo
      setCurrentUploadStep("Uploading Cover Photo...");
      const coverResult = await uploadToIPFS(files.coverPhoto);
      if (!coverResult.success || !coverResult.cid) throw new Error(coverResult.error || "Failed to upload Cover Photo");

      // 2. Upload Deed
      setCurrentUploadStep("Uploading Deed Document...");
      const deedResult = await uploadToIPFS(files.deedDocument);
      if (!deedResult.success || !deedResult.cid) throw new Error(deedResult.error || "Failed to upload Deed");

      // 3. Upload Extra Photos (Parallel)
      let photoCids: string[] = [];
      if (files.extraPhotos.length > 0) {
        setCurrentUploadStep(`Uploading ${files.extraPhotos.length} Extra Photos...`);
        const photoPromises = files.extraPhotos.map(f => uploadToIPFS(f));
        const photoResults = await Promise.all(photoPromises);

        // check for errors
        const failed = photoResults.find(r => !r.success);
        if (failed) throw new Error(failed.error || "Failed to upload one or more extra photos");

        photoCids = photoResults.map(r => r.cid!).filter(Boolean);
      }

      // 4. Construct Metadata
      const metadata: PropertyMetadata = {
        name: `Property ${formData.surveyNumber}`,
        description: `Land registered in Revenue Dept ${formData.revenueDeptId}, Survey No. ${formData.surveyNumber}`,
        image: `ipfs://${coverResult.cid}`,
        properties: {
          deed: `ipfs://${deedResult.cid}`,
          photos: photoCids.map(cid => `ipfs://${cid}`),
          location: {
            lat: formData.lat,
            lng: formData.lng,
            address: formData.addressLine
          },
          owner: address
        }
      };

      // 5. Upload Metadata
      setCurrentUploadStep("Finalizing Registration Data...");
      const metadataResult = await uploadMetadata(metadata);
      if (!metadataResult.success || !metadataResult.cid) throw new Error(metadataResult.error || "Failed to upload Metadata");

      const finalIpfsHash = metadataResult.cid;
      setGeneratedHash(finalIpfsHash);

      // 6. Submit to Blockchain
      await submitToBlockchain(finalIpfsHash);

    } catch (err: any) {
      console.error("Upload process failed:", err);
      setUploadError(err.message || "Failed to upload files. Please try again.");
      setIsUploading(false);
    }
  };

  const submitToBlockchain = async (ipfsHash: string) => {
    setCurrentUploadStep("Waiting for Wallet Confirmation...");

    const args = [
      BigInt(formData.locationId),
      BigInt(formData.revenueDeptId),
      BigInt(formData.surveyNumber),
      BigInt(formData.area),
      ipfsHash,
      0 // ISSUE-4: Always WithPapers
    ] as const;

    // Simulate first
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
      setIsUploading(false);
      return;
    }

    // Write Contract
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
      setIsUploading(false);
    }
    // Note: isUploading stays true until tx is confirmed or rejected, but strict state mgmt happens in useEffect
    setIsUploading(false);
  };

  // Parse error message (reused)
  const getErrorMessage = (error: any): string => {
    if (!error) return "";
    let msg = error.shortMessage || error.cause?.shortMessage || error.cause?.reason || error.message || "";
    if (msg.includes("Property already registered")) return "This property is already registered!";
    if (msg.includes("User denied")) return "Transaction was rejected by user";
    return msg.slice(0, 200) || "Transaction failed.";
  };

  if (!isMounted) return null;

  // STAFF ACCESS DENIED
  if (isStaff) {
    return (
      <DashboardLayout>
        <GlassCard className="p-8 max-w-md mx-auto text-center">
          <ShieldX className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-destructive">Access Denied</h2>
          <p className="text-muted-foreground">Staff cannot register land.</p>
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

      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Register New Land</h1>
            <p className="text-muted-foreground mt-2">
              Upload documents, pick location, and register on blockchain
            </p>
          </div>

          <form onSubmit={uploadAndSubmit} className="space-y-8">

            {/* Section 1: Property Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="locationId">Location ID (Region Code)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="locationId" name="locationId" type="number" required className="pl-10 bg-secondary/50 border-input" value={formData.locationId} onChange={handleChange} placeholder="e.g. 560001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenueDeptId">Revenue Dept ID</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="revenueDeptId" name="revenueDeptId" type="number" required className="pl-10 bg-secondary/50 border-input" value={formData.revenueDeptId} onChange={handleChange} placeholder="e.g. 101" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="surveyNumber">Survey Number (Auto-Generated)</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="surveyNumber"
                    name="surveyNumber"
                    type="number"
                    required
                    readOnly
                    className="pl-10 bg-secondary/30 border-input cursor-not-allowed opacity-80"
                    value={formData.surveyNumber}
                    onChange={handleChange}
                    placeholder="Auto-generated..."
                  />
                  {isLoadingLocationProps && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Area (sq. ft)</Label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="area" name="area" type="number" required className="pl-10 bg-secondary/50 border-input" value={formData.area} onChange={handleChange} placeholder="e.g. 1200" />
                </div>
              </div>
            </div>

            {/* Section 2: Map Location with Address Autocomplete */}
            <PropertyLocationPicker
              onLocationSelect={handleLocationSelect}
              initialPosition={[formData.lat, formData.lng]}
              initialAddress={formData.addressLine}
              height="450px"
            />

            {/* Address Line Field - Auto-filled from map */}
            <div className="space-y-2">
              <Label htmlFor="addressLine">
                Property Address
                {formData.addressLine && <span className="text-green-500 text-xs ml-2">✓ Auto-filled from map</span>}
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <textarea
                  id="addressLine"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleChange}
                  className="w-full rounded-md border bg-background px-3 py-2 pl-10 text-sm min-h-[80px] resize-y"
                  placeholder="Click on the map above to auto-fill the address, or type manually..."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ✏️ You can edit the address after it's auto-filled from the map.
              </p>
              {formData.lat && formData.lng && (
                <div className="flex gap-4 text-xs font-mono text-muted-foreground bg-secondary/30 p-2 rounded mt-2">
                  <span>📍 Coordinates: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}</span>
                </div>
              )}
            </div>

            {/* Section 3: Documents & Photos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Cover Photo */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Cover Photo <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">Main image for marketplace listing (JPG/PNG)</p>
                <label className="block p-4 border-2 border-dashed border-border hover:border-primary rounded-lg cursor-pointer transition-colors bg-secondary/20">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'cover')} />
                  <div className="flex flex-col items-center gap-2 text-center">
                    {files.coverPhoto ? (
                      <>
                        <div className="text-primary font-medium truncate w-full">{files.coverPhoto.name}</div>
                        <div className="text-xs text-muted-foreground">Click to change</div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm">Upload Cover Photo</span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Deed Document */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Deed Document <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">Official Government Deed (PDF/Image)</p>
                <label className="block p-4 border-2 border-dashed border-border hover:border-primary rounded-lg cursor-pointer transition-colors bg-secondary/20">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleFileChange(e, 'deed')} />
                  <div className="flex flex-col items-center gap-2 text-center">
                    {files.deedDocument ? (
                      <>
                        <div className="text-primary font-medium truncate w-full">{files.deedDocument.name}</div>
                        <div className="text-xs text-muted-foreground">Click to change</div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm">Upload Deed (PDF)</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Extra Photos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Additional Photos <span className="text-xs text-muted-foreground font-normal">(Optional - Max 5 recommended)</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {files.extraPhotos.map((file, i) => (
                  <div key={i} className="relative group aspect-square bg-secondary rounded-lg flex items-center justify-center overflow-hidden border border-border">
                    <span className="text-xs text-center p-2 truncate w-full">{file.name}</span>
                    <button type="button" onClick={() => removeExtraPhoto(i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      Remove
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-border hover:border-primary rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:text-primary">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileChange(e, 'extra')} />
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-xs">Add</span>
                </label>
              </div>
            </div>

            {/* Submission Status */}
            {uploadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {uploadError}
              </div>
            )}
            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {submitError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isConfirming || isUploading}
              className="w-full"
              variant="hero"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Confirming Transaction...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {currentUploadStep}
                </>
              ) : (
                "Register Property"
              )}
            </Button>
          </form>

          {hash && <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-xs break-all font-mono border border-border">Tx Hash: {hash}</div>}

          {isConfirmed && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-center text-sm font-bold animate-in bounce-in">
              Success! Redirecting to dashboard...
            </div>
          )}

        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
