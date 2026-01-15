"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, usePublicClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { USERS_ADDRESS, USERS_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, MapPin, User, CreditCard, Wallet, AlertTriangle, ShieldX, Phone, Shield, CheckCircle2, Send, RotateCcw } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/shared/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { keccak256, encodePacked } from "viem";
import { WalletConnect } from "@/components/WalletConnect";
import { validateAadhaar, validateMobile, verifyAadhaarMobileLink, maskAadhaar, validatePAN, maskPAN } from "@/lib/aadhaar";
import { sendOTP, verifyOTP, getResendCooldown, canResendOTP } from "@/lib/otp";
import { OTPInput, OTPTimer } from "@/components/OTPInput";

// Admin address for role detection
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

// Verification steps
type VerificationStep = "form" | "verifying" | "otp" | "complete";

export default function RegisterUser() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // BUG 2 FIX: Check if user is already registered
  const { data: isRegistered, isLoading: isCheckingRegistration } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
  });

  // F2 FIX: Staff role detection
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

  // Form state
  const [role, setRole] = useState("buyer");
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    pan: "",
    aadhar: "",
    mobile: "",
  });

  // Verification state
  const [demoMode, setDemoMode] = useState(true);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>("form");
  const [verificationId, setVerificationId] = useState<string>("");
  const [demoOTP, setDemoOTP] = useState<string>("");
  const [otpValue, setOtpValue] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Validation state
  const [aadhaarValidation, setAadhaarValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [mobileValidation, setMobileValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: false });
  const [panValidation, setPanValidation] = useState<{ isValid: boolean; error?: string; entityType?: string }>({ isValid: false });

  // Error state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // BUG 2 FIX: Redirect already registered users to dashboard
  useEffect(() => {
    if (!isCheckingRegistration && isRegistered === true && address) {
      router.push('/dashboard');
    }
  }, [isRegistered, isCheckingRegistration, address, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Aadhaar input with validation
  const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    setFormData({ ...formData, aadhar: value });

    if (value.length === 12) {
      const validation = validateAadhaar(value);
      setAadhaarValidation(validation);
    } else {
      setAadhaarValidation({ isValid: false });
    }
  };

  // Handle Mobile input with validation
  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, mobile: value });

    if (value.length === 10) {
      const validation = validateMobile(value);
      setMobileValidation(validation);
    } else {
      setMobileValidation({ isValid: false });
    }
  };

  // Handle PAN input with validation
  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 10);
    setFormData({ ...formData, pan: value });

    if (value.length === 10) {
      const validation = validatePAN(value);
      setPanValidation(validation);
    } else {
      setPanValidation({ isValid: false });
    }
  };

  // Step 1: Verify Aadhaar-Mobile link and send OTP
  const handleVerifyAndSendOTP = async () => {
    setSubmitError(null);
    setVerificationStep("verifying");

    try {
      // DUPLICATE CHECK: Check if Aadhaar is already registered
      const aadharHash = keccak256(encodePacked(["string"], [formData.aadhar]));

      const isAadharUsed = await publicClient?.readContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "isAadharRegistered",
        args: [aadharHash],
      });

      if (isAadharUsed) {
        setSubmitError("This Aadhaar number is already registered. Each Aadhaar can only be used once.");
        setVerificationStep("form");
        return;
      }

      // DUPLICATE CHECK: Check if PAN is already registered
      const panHash = keccak256(encodePacked(["string"], [formData.pan]));

      const isPanUsed = await publicClient?.readContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "isPanRegistered",
        args: [panHash],
      });

      if (isPanUsed) {
        setSubmitError("This PAN card is already registered. Each PAN can only be used once.");
        setVerificationStep("form");
        return;
      }

      // Verify Aadhaar-Mobile link
      const linkResult = await verifyAadhaarMobileLink(
        formData.aadhar,
        formData.mobile,
        demoMode
      );

      if (!linkResult.linked) {
        setSubmitError(linkResult.message);
        setVerificationStep("form");
        return;
      }

      // Send OTP
      const otpResult = await sendOTP(formData.mobile, demoMode);

      if (!otpResult.success) {
        setSubmitError(otpResult.message);
        setVerificationStep("form");
        return;
      }

      setVerificationId(otpResult.verificationId || "");
      setDemoOTP(otpResult.demoOTP || "");
      setOtpExpiresIn(otpResult.expiresIn || 300);
      setResendCooldown(30);
      setVerificationStep("otp");
    } catch (error: any) {
      setSubmitError(error.message || "Verification failed");
      setVerificationStep("form");
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setSubmitError(null);
    const otpResult = await sendOTP(formData.mobile, demoMode);

    if (!otpResult.success) {
      setSubmitError(otpResult.message);
      return;
    }

    setVerificationId(otpResult.verificationId || "");
    setDemoOTP(otpResult.demoOTP || "");
    setOtpExpiresIn(otpResult.expiresIn || 300);
    setResendCooldown(30);
    setOtpValue("");
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    setSubmitError(null);
    setIsChecking(true);

    try {
      const result = await verifyOTP(otpValue, verificationId);

      if (!result.success) {
        setSubmitError(result.message);
        setIsChecking(false);
        return;
      }

      setVerificationStep("complete");
      // Proceed to blockchain registration
      await handleBlockchainRegistration();
    } catch (error: any) {
      setSubmitError(error.message || "OTP verification failed");
      setIsChecking(false);
    }
  };

  // Step 3: Blockchain registration
  const handleBlockchainRegistration = async () => {
    if (!address) return;

    try {
      // PRIVACY: Hash the identity data before sending to blockchain
      const identityHash = keccak256(
        encodePacked(
          ['string', 'string', 'string', 'string'],
          [formData.fname, formData.lname, formData.pan, formData.aadhar]
        )
      );
      const aadharHash = keccak256(encodePacked(['string'], [formData.aadhar]));
      const panHash = keccak256(encodePacked(['string'], [formData.pan]));

      // PRE-CHECK: Check if Aadhaar is already registered
      try {
        const isAadharTaken = await publicClient?.readContract({
          address: USERS_ADDRESS,
          abi: USERS_ABI,
          functionName: "isAadharRegistered",
          args: [aadharHash],
        });

        if (isAadharTaken) {
          setSubmitError("⚠️ This Aadhaar number is already registered to another account.");
          setIsChecking(false);
          return;
        }
      } catch (preCheckErr) {
        console.warn("Aadhaar pre-check failed, proceeding:", preCheckErr);
      }

      // PRE-CHECK: Check if PAN is already registered
      try {
        const isPanTaken = await publicClient?.readContract({
          address: USERS_ADDRESS,
          abi: USERS_ABI,
          functionName: "isPanRegistered",
          args: [panHash],
        });

        if (isPanTaken) {
          setSubmitError("⚠️ This PAN card is already registered to another account.");
          setIsChecking(false);
          return;
        }
      } catch (preCheckErr) {
        console.warn("PAN pre-check failed, proceeding:", preCheckErr);
      }

      // IPFS: Upload user profile for staff visibility
      // Using simple client-side encryption for Aadhaar/PAN
      const { uploadUserProfile } = await import("@/lib/ipfs");
      const { encryptData, maskAadhaar, maskPAN } = await import("@/lib/simpleEncrypt");

      // Encrypt sensitive data client-side
      const panEncrypted = encryptData(formData.pan);
      const aadhaarEncrypted = encryptData(formData.aadhar);

      console.log("✅ Encryption:", panEncrypted ? "successful" : "failed");

      const userProfile = {
        walletAddress: address,
        firstName: formData.fname,
        lastName: formData.lname,
        // Store encrypted versions (if available) or empty for security
        panEncrypted: panEncrypted || "",
        panMasked: `XXXXXX${formData.pan.slice(-4)}`,
        aadhaarEncrypted: aadhaarEncrypted || "",
        aadhaarMasked: `XXXX XXXX ${formData.aadhar.slice(-4)}`,
        mobile: formData.mobile,
        registeredAt: Date.now(),
        encryptionVersion: panEncrypted ? 1 : 0, // Track if encrypted
      };

      const uploadResult = await uploadUserProfile(userProfile);
      const profileCID = uploadResult.success ? uploadResult.cid || "" : "";

      if (!uploadResult.success) {
        console.warn("Profile upload failed, proceeding without CID:", uploadResult.error);
      }

      writeContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "registerUser",
        args: [identityHash, aadharHash, panHash, profileCID],
      });

      setIsChecking(false);
    } catch (error: any) {
      console.error("Registration failed:", error);
      setSubmitError(error.message || "Registration failed");
      setIsChecking(false);
    }
  };

  // Form submission (starts verification flow)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSubmitError(null);

    // Validate all fields
    if (!aadhaarValidation.isValid) {
      setSubmitError(aadhaarValidation.error || "Please enter a valid Aadhaar number");
      return;
    }

    if (!panValidation.isValid) {
      setSubmitError(panValidation.error || "Please enter a valid PAN number");
      return;
    }

    if (!mobileValidation.isValid) {
      setSubmitError(mobileValidation.error || "Please enter a valid mobile number");
      return;
    }

    // Start verification flow
    await handleVerifyAndSendOTP();
  };

  // BUG 6 FIX: Redirect to dashboard after successful registration
  // Also invalidate queries to ensure dashboard fetches fresh registration status
  useEffect(() => {
    if (isConfirmed) {
      // Invalidate ALL queries to ensure fresh data when navigating to dashboard
      queryClient.invalidateQueries();

      const timer = setTimeout(() => router.push('/dashboard'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, router, queryClient]);

  // F2 FIX: Block staff from registration
  if (isStaff && isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 relative z-10 p-8 glass-card rounded-3xl max-w-md"
        >
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Staff Account</h2>
          <p className="text-muted-foreground">
            You are a {isAdmin ? "Government Admin" : isLandInspector ? "Land Inspector" : "Revenue Employee"}.
          </p>
          <p className="text-sm text-muted-foreground">
            Staff members don't need to register as users. Go directly to your portal.
          </p>
          <Button
            onClick={() => router.push(isAdmin ? '/admin' : isLandInspector ? '/inspector' : '/revenue')}
            variant="hero"
            className="w-full"
          >
            Go to My Portal
          </Button>
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors block mt-4">
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // BUG 5 FIX: Show connect wallet prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-primary/20 to-transparent blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 relative z-10 p-8 glass-card rounded-3xl max-w-md"
        >
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Connect Your Wallet</h2>
          <p className="text-muted-foreground">Please connect your wallet to register on the platform</p>
          <div className="flex justify-center">
            <WalletConnect />
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors block mt-4">
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // Show loading while checking registration status
  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-green-500/20 to-transparent blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 relative z-10 p-8 glass-card rounded-3xl"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-green-500 text-4xl">✓</div>
          </div>
          <h2 className="text-3xl font-bold text-foreground">Registration Successful!</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-radial from-primary/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-radial from-accent/10 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard className="p-8">
            {/* Demo Mode Notice - Always enabled for hackathon */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500 font-medium">Demo Mode Active - OTP will be shown on screen</span>
            </div>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                <MapPin className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Create Your Identity
              </h1>
              <p className="text-muted-foreground">
                Register on the blockchain with Aadhaar verification
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {["form", "otp", "complete"].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${verificationStep === step ||
                      (verificationStep === "verifying" && step === "form") ||
                      (verificationStep === "complete" && index <= 2)
                      ? "bg-primary text-primary-foreground"
                      : index < ["form", "otp", "complete"].indexOf(verificationStep)
                        ? "bg-green-500 text-white"
                        : "bg-secondary text-muted-foreground"
                      }`}
                  >
                    {index < ["form", "verifying", "otp", "complete"].indexOf(verificationStep) ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 2 && (
                    <div className={`w-12 h-1 mx-1 rounded ${index < ["form", "verifying", "otp", "complete"].indexOf(verificationStep) - (verificationStep === "verifying" ? 0 : 0)
                      ? "bg-green-500"
                      : "bg-secondary"
                      }`} />
                  )}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1: Form */}
              {(verificationStep === "form" || verificationStep === "verifying") && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label htmlFor="role">I primarily want to...</Label>
                    <Select onValueChange={setRole} defaultValue={role}>
                      <SelectTrigger className="bg-secondary/50 border-border">
                        <SelectValue placeholder="Select intent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">Buy Land</SelectItem>
                        <SelectItem value="seller">Sell Land</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fname">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="fname" name="fname"
                          placeholder="John"
                          className="pl-10 bg-secondary/50 border-border"
                          value={formData.fname} onChange={handleChange} required
                          disabled={verificationStep === "verifying"}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lname">Last Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="lname" name="lname"
                          placeholder="Doe"
                          className="pl-10 bg-secondary/50 border-border"
                          value={formData.lname} onChange={handleChange} required
                          disabled={verificationStep === "verifying"}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN Card Number</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="pan" name="pan"
                        placeholder="ABCDE1234F"
                        className={`pl-10 bg-secondary/50 uppercase ${formData.pan.length === 10
                          ? (panValidation.isValid ? 'border-green-500' : 'border-red-500')
                          : 'border-border'
                          }`}
                        value={formData.pan}
                        onChange={handlePanChange}
                        maxLength={10}
                        required
                        disabled={verificationStep === "verifying"}
                      />
                    </div>
                    <p className={`text-xs ${panValidation.isValid ? 'text-green-500' : formData.pan.length === 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {formData.pan.length}/10 characters
                      {panValidation.isValid && ` ✓ Valid (${panValidation.entityType})`}
                      {formData.pan.length === 10 && !panValidation.isValid && ` - ${panValidation.error}`}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aadhar">Aadhaar Number (12 digits)</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="aadhar" name="aadhar"
                        placeholder="Enter 12-digit Aadhaar"
                        className={`pl-10 bg-secondary/50 ${formData.aadhar.length === 12
                          ? (aadhaarValidation.isValid ? 'border-green-500' : 'border-red-500')
                          : 'border-border'
                          }`}
                        value={formData.aadhar}
                        onChange={handleAadharChange}
                        maxLength={12}
                        required
                        disabled={verificationStep === "verifying"}
                      />
                    </div>
                    <div className="flex justify-between">
                      <p className={`text-xs ${aadhaarValidation.isValid ? 'text-green-500' : formData.aadhar.length === 12 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {formData.aadhar.length}/12 digits
                        {aadhaarValidation.isValid && ' ✓ Valid (Verhoeff check passed)'}
                        {formData.aadhar.length === 12 && !aadhaarValidation.isValid && ` - ${aadhaarValidation.error}`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number (Linked to Aadhaar)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <div className="absolute left-10 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</div>
                      <Input
                        id="mobile" name="mobile"
                        placeholder="9876543210"
                        className={`pl-20 bg-secondary/50 ${formData.mobile.length === 10
                          ? (mobileValidation.isValid ? 'border-green-500' : 'border-red-500')
                          : 'border-border'
                          }`}
                        value={formData.mobile}
                        onChange={handleMobileChange}
                        maxLength={10}
                        required
                        disabled={verificationStep === "verifying"}
                      />
                    </div>
                    <p className={`text-xs ${mobileValidation.isValid ? 'text-green-500' : formData.mobile.length === 10 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {formData.mobile.length}/10 digits
                      {mobileValidation.isValid && ' ✓ Valid'}
                      {formData.mobile.length === 10 && !mobileValidation.isValid && ` - ${mobileValidation.error}`}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input type="checkbox" id="terms" className="rounded border-border bg-secondary text-primary focus:ring-primary" required />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      I agree to the <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                    </label>
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    disabled={verificationStep === "verifying" || !aadhaarValidation.isValid || !panValidation.isValid || !mobileValidation.isValid}
                  >
                    {verificationStep === "verifying" ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        Verifying Aadhaar-Mobile Link...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Verify & Send OTP
                      </>
                    )}
                  </Button>
                </motion.form>
              )}

              {/* Step 2: OTP Verification */}
              {verificationStep === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Enter OTP</h3>
                    <p className="text-sm text-muted-foreground">
                      We've sent a 6-digit OTP to +91 {formData.mobile}
                    </p>
                    {demoMode && demoOTP && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-500">
                          🔑 Demo OTP: <span className="font-mono font-bold text-lg">{demoOTP}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <OTPInput
                    value={otpValue}
                    onChange={setOtpValue}
                    onComplete={() => { }}
                    disabled={isChecking}
                    error={!!submitError}
                  />

                  <div className="flex justify-center items-center gap-2 text-sm">
                    <span className="text-muted-foreground">OTP expires in:</span>
                    <OTPTimer
                      initialSeconds={otpExpiresIn}
                      onExpire={() => setSubmitError("OTP expired. Please request a new one.")}
                    />
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      onClick={handleVerifyOTP}
                      variant="hero"
                      className="w-full"
                      disabled={otpValue.length !== 6 || isChecking}
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="animate-spin w-4 h-4 mr-2" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Verify OTP
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleResendOTP}
                      variant="outline"
                      className="w-full"
                      disabled={resendCooldown > 0}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </Button>

                    <Button
                      onClick={() => {
                        setVerificationStep("form");
                        setOtpValue("");
                        setSubmitError(null);
                      }}
                      variant="ghost"
                      className="w-full"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Change Details
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Complete - Blockchain Registration */}
              {verificationStep === "complete" && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center"
                >
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-500">OTP Verified!</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Aadhaar: {maskAadhaar(formData.aadhar)}
                    </p>
                  </div>

                  {isConfirming && (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin w-5 h-5 text-primary" />
                      <span className="text-muted-foreground">Registering on blockchain...</span>
                    </div>
                  )}

                  {writeError && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{writeError.message.split('\n')[0].slice(0, 100)}...</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
