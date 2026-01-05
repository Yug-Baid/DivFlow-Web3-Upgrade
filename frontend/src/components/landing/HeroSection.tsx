"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Globe, Rocket } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useReadContract } from "wagmi";
import { USERS_ADDRESS, USERS_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";

// Admin wallet address (Anvil account 0)
const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export const HeroSection = () => {
  const { address, isConnected } = useAccount();

  // Check if user is registered
  const { data: isRegistered } = useReadContract({
    address: USERS_ADDRESS,
    abi: USERS_ABI,
    functionName: "isUserRegistered",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // BUG-9 FIX: Check if wallet is assigned as Land Inspector
  const { data: inspectorLocationId } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getInspectorLocation",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // BUG-9 FIX: Check if wallet is assigned as Revenue Employee
  const { data: employeeRevenueDeptId } = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getEmployeeRevenueDept",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Determine if user is staff (Admin, Land Inspector, or Revenue Employee)
  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  const isLandInspector = inspectorLocationId && (inspectorLocationId as bigint) > BigInt(0);
  const isRevenueEmployee = employeeRevenueDeptId && (employeeRevenueDeptId as bigint) > BigInt(0);
  const isStaff = isAdmin || isLandInspector || isRevenueEmployee;

  // Determine button text and destination - Staff gets "Launch App" even if not registered
  const buttonText = isConnected && (isRegistered || isStaff) ? "Launch App" : "Get Started";
  const buttonHref = isConnected && (isRegistered || isStaff) ? "/dashboard" : "/register";
  const ButtonIcon = isConnected && (isRegistered || isStaff) ? Rocket : ArrowRight;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">

      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <Image
          src="/hero-bgg.jpg"
          alt="Land Registry Background"
          fill
          className="opacity-70 mb-30"

        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background/40" />
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none opacity-50 mix-blend-overlay" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none opacity-20 z-0" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8 backdrop-blur-md mt-10"
          >
            <Zap className="w-4 h-4" />
            Blockchain-Powered Land Registry
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] tracking-tight mb-6"
          >
            SECURE YOUR{" "}
            <span className="text-gradient drop-shadow-lg">PROPERTY</span>{" "}
            ON-CHAIN.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-md"
          >
            Register, verify, and transfer land ownership with immutable blockchain technology.
            Transparent, secure, and tamper-proof property records for the digital age.
          </motion.p>

          {/* CTA Buttons - BUG 4 FIX: Dynamic button based on registration status */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href={buttonHref}>
              <Button variant="hero" size="lg" className="group shadow-glow">
                {buttonText}
                <ButtonIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="ghost-glow" size="lg">
              View Documentation
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
          >
            {[
              { icon: Shield, value: "100%", label: "Immutable Records" },
              { icon: Zap, value: "< 3s", label: "Transaction Time" },
              { icon: Globe, value: "24/7", label: "Global Access" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="glass-card rounded-2xl p-6 text-center group hover:border-primary/50 transition-all duration-300 backdrop-blur-md"
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
