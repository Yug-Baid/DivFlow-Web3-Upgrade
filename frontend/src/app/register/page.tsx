"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WalletConnect } from "@/components/WalletConnect";

export default function RegisterUser() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [role, setRole] = useState("buyer"); // For UI intent only
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
          <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
              <div className="text-center space-y-4">
                  <div className="text-green-500 text-6xl animate-bounce">✓</div>
                  <h2 className="text-3xl font-bold">Registration Successful!</h2>
                  <p className="text-slate-400">Redirecting to dashboard...</p>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
       {/* Top Bar */}
       <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
           <Link href="/" className="text-slate-400 hover:text-white flex items-center gap-2 transition">
                <ArrowLeft className="w-4 h-4"/> Back to Home
           </Link>
           <WalletConnect />
       </div>

        {/* Background Gradients */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[30%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
       </div>

      <Card className="w-full max-w-lg bg-slate-900/80 border-slate-800 text-white backdrop-blur-md shadow-2xl z-10">
        <CardHeader>
            <CardTitle className="text-2xl text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Create Your Identity
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
                Register on the blockchain to verify your land transactions.
            </CardDescription>
        </CardHeader>
        
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Role/Intent Selection */}
                <div className="space-y-2">
                    <Label htmlFor="role">I primarily want to...</Label>
                    <Select onValueChange={setRole} defaultValue={role}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Select intent" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            <SelectItem value="buyer">Buy Land</SelectItem>
                            <SelectItem value="seller">Sell Land</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fname">First Name</Label>
                        <Input 
                            id="fname" name="fname" 
                            placeholder="John" 
                            className="bg-slate-800 border-slate-700 text-white"
                            value={formData.fname} onChange={handleChange} required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lname">Last Name</Label>
                        <Input 
                            id="lname" name="lname" 
                            placeholder="Doe" 
                            className="bg-slate-800 border-slate-700 text-white"
                            value={formData.lname} onChange={handleChange} required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input 
                        id="dob" name="dob" type="date"
                        className="bg-slate-800 border-slate-700 text-white"
                        value={formData.dob} onChange={handleChange} required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="aadhar">Aadhar Number (Government ID)</Label>
                    <Input 
                        id="aadhar" name="aadhar" 
                        placeholder="XXXX-XXXX-XXXX" 
                        className="bg-slate-800 border-slate-700 text-white"
                        value={formData.aadhar} onChange={handleChange} required
                    />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                    <input type="checkbox" id="terms" className="rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary" required />
                    <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-400">
                        I agree to the Decentralized Terms of Service
                    </label>
                </div>

                <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11"
                    disabled={isConfirming || !address}
                >
                    {isConfirming ? <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> Registering...</span> : "Register Identity"}
                </Button>

            </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t border-slate-800 pt-6">
            {writeError && <p className="text-red-400 text-sm text-center font-medium bg-red-900/20 p-2 rounded w-full">{writeError.message.split('\n')[0].slice(0, 100)}...</p>}
            <p className="text-xs text-slate-500 text-center w-full">
                Your data is hashed and stored securely on the blockchain.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
