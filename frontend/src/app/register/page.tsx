"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, MapPin, User, Calendar, CreditCard } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/shared/GlassCard";
import { motion } from "framer-motion";

export default function RegisterUser() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [role, setRole] = useState("buyer");
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    dob: "",
    aadhar: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    try {
      writeContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "registerUser",
        args: [formData.fname, formData.lname, formData.dob, formData.aadhar],
      });
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  if (isConfirmed) {
      setTimeout(() => router.push('/dashboard'), 2000);
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
                    <Label htmlFor="aadhar">Aadhar Number (Govt ID)</Label>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            id="aadhar" name="aadhar" 
                            placeholder="XXXX-XXXX-XXXX" 
                            className="pl-10 bg-secondary/50 border-border"
                            value={formData.aadhar} onChange={handleChange} required
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <input type="checkbox" id="terms" className="rounded border-border bg-secondary text-primary focus:ring-primary" required />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                        I agree to the <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                    </label>
                </div>

                <Button 
                    type="submit" 
                    variant="hero"
                    className="w-full"
                    disabled={isConfirming || !address}
                >
                    {isConfirming ? (
                        <>
                            <Loader2 className="animate-spin w-4 h-4 mr-2"/> 
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
