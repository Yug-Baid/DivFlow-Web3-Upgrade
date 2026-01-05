"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract, usePublicClient } from "wagmi";
import { USERS_ADDRESS, USERS_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, MapPin, User, Calendar, CreditCard, Wallet, AlertTriangle, ShieldX } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/shared/GlassCard";
import { motion } from "framer-motion";
import { keccak256, encodePacked } from "viem";
import { WalletConnect } from "@/components/WalletConnect";

// Admin address for role detection
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function RegisterUser() {
  const router = useRouter();
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

  const [role, setRole] = useState("buyer");
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    dob: "",
    aadhar: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false); // Pre-check loading state

  // BUG 2 FIX: Redirect already registered users to dashboard
  useEffect(() => {
    if (!isCheckingRegistration && isRegistered === true && address) {
      router.push('/dashboard');
    }
  }, [isRegistered, isCheckingRegistration, address, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // A1 FIX: Handle Aadhaar input - only allow digits, max 12 characters
  const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    setFormData({ ...formData, aadhar: value });
  };

  // A1 FIX: Validate Aadhaar is exactly 12 digits
  const isAadharValid = formData.aadhar.length === 12;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSubmitError(null);

    // A1 FIX: Validate Aadhaar before submission
    if (formData.aadhar.length !== 12) {
      setSubmitError("Aadhaar number must be exactly 12 digits");
      return;
    }

    setIsChecking(true);

    try {
      // PRIVACY: Hash the identity data before sending to blockchain
      const identityHash = keccak256(
        encodePacked(
          ['string', 'string', 'string', 'string'],
          [formData.fname, formData.lname, formData.dob, formData.aadhar]
        )
      );
      const aadharHash = keccak256(encodePacked(['string'], [formData.aadhar]));

      // PRE-CHECK: Check if Aadhaar is already registered (saves gas!)
      try {
        const isAadharTaken = await publicClient?.readContract({
          address: USERS_ADDRESS,
          abi: USERS_ABI,
          functionName: "isAadharRegistered",
          args: [aadharHash],
        });

        if (isAadharTaken) {
          setSubmitError("⚠️ This Aadhaar number is already registered to another account. Please use a different Aadhaar.");
          setIsChecking(false);
          return;
        }
      } catch (preCheckErr) {
        // If pre-check fails, proceed with transaction (contract will revert if duplicate)
        console.warn("Pre-check failed, proceeding with transaction:", preCheckErr);
      }

      setIsChecking(false);

      writeContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "registerUser",
        args: [identityHash, aadharHash],
      });
    } catch (error: any) {
      console.error("Registration failed:", error);
      setSubmitError(error.message || "Registration failed");
      setIsChecking(false);
    }
  };

  // BUG 6 FIX: Redirect to dashboard after successful registration
  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => router.push('/dashboard'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, router]);

  // F2 FIX: Block staff from registration - they don't need to register
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
        {/* Background Effects */}
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
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                <MapPin className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Create Your Identity
              </h1>
              <p className="text-muted-foreground">
                Register on the blockchain to verify your land transactions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

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
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="dob" name="dob" type="date"
                    className="pl-10 bg-secondary/50 border-border"
                    value={formData.dob} onChange={handleChange} required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aadhar">Aadhaar Number (12 digits)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="aadhar" name="aadhar"
                    placeholder="123456789012"
                    className={`pl-10 bg-secondary/50 ${formData.aadhar.length > 0 ? (isAadharValid ? 'border-green-500' : 'border-yellow-500') : 'border-border'}`}
                    value={formData.aadhar}
                    onChange={handleAadharChange}
                    maxLength={12}
                    minLength={12}
                    pattern="[0-9]{12}"
                    required
                  />
                </div>
                <p className={`text-xs ${isAadharValid ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {formData.aadhar.length}/12 digits {isAadharValid && '✓'}
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="terms" className="rounded border-border bg-secondary text-primary focus:ring-primary" required />
                <label htmlFor="terms" className="text-sm text-muted-foreground">
                  I agree to the <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                </label>
              </div>

              {/* Display pre-check and submit errors */}
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
                disabled={isConfirming || isChecking || !address}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Checking Aadhaar...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Registering...
                  </>
                ) : (
                  "Register Identity"
                )}
              </Button>

            </form>

            {writeError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center">
                {writeError.message.split('\n')[0].slice(0, 100)}...
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
