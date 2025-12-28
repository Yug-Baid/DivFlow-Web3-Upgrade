"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { WalletConnect } from "@/components/WalletConnect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const heroRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Check Registration Status
  const { data: isRegistered, isLoading: isCheckingRegistration } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    setMounted(true);
    const ctx = gsap.context(() => {
      gsap.from(".hero-text", {
        y: 100,
        opacity: 0,
        duration: 1.5,
        stagger: 0.2,
        ease: "power4.out",
      });
      gsap.from(".hero-card", {
        scale: 0.9,
        opacity: 0,
        duration: 1,
        delay: 0.5,
        ease: "back.out(1.7)",
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Redirect if registered
  useEffect(() => {
    if (isConnected && isRegistered) {
       // Optional: Auto-redirect or show button
       // router.push("/dashboard"); 
    }
  }, [isConnected, isRegistered, router]);

  if (!mounted) return null;

  return (
    <main ref={heroRef} className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden text-white">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl space-y-12">
        <div className="space-y-6">
          <h1 className="hero-text text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            DivFlow Web3
          </h1>
          <p className="hero-text text-lg md:text-2xl text-slate-400 max-w-2xl mx-auto font-light">
            The next generation of decentralized land registration. 
            <br className="hidden md:block"/> Secure, Transparent, and Immutable.
          </p>
        </div>

        <div className="hero-card w-full max-w-md mx-auto">
            {!isConnected ? (
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white">Get Started</CardTitle>
                        <CardDescription className="text-slate-400">Connect your wallet to enter the platform</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                       {/* We wrap the WalletConnect button or allow it to be the main trigger */}
                       <div className="scale-125">
                            <WalletConnect />
                       </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center justify-center gap-2">
                            {isCheckingRegistration ? <Loader2 className="animate-spin" /> : 
                             isRegistered ? <ShieldCheck className="text-green-500" /> : "Welcome New User"}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            {isCheckingRegistration ? "Verifying identity..." : 
                             isRegistered ? `Welcome, ${address?.slice(0,6)}...` : 
                             "Please complete your profile to continue"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isCheckingRegistration ? (
                            <div className="h-10 w-full bg-slate-800 animate-pulse rounded"></div>
                        ) : isRegistered ? (
                            <Button 
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold h-12 text-lg"
                            >
                                Enter Dashboard <ArrowRight className="ml-2 h-5 w-5"/>
                            </Button>
                        ) : (
                            <Button 
                                onClick={() => router.push('/register')}
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold h-12 text-lg"
                            >
                                Register Identity <ArrowRight className="ml-2 h-5 w-5"/>
                            </Button>
                        )}
                        
                        {!isRegistered && !isCheckingRegistration && (
                             <p className="text-xs text-slate-500 mt-2">
                                You need to register to buy or sell land.
                             </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
      </div>

      <footer className="absolute bottom-6 text-slate-600 text-sm">
        &copy; 2025 DivFlow. All rights reserved on-chain.
      </footer>
    </main>
  );
}
