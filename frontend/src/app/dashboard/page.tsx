"use client";

import { useAccount, useReadContract } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";
import Link from "next/link";
import { useState } from "react";
import TransferOwnershipModal from "@/components/TransferOwnershipModal";
import SellPropertyModal from "@/components/SellPropertyModal";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Plus, Store, FileText, MapPin, TrendingUp, Clock, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { address } = useAccount();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<bigint | null>(null);

  const result = useReadContract({
    address: LAND_REGISTRY_ADDRESS,
    abi: LAND_REGISTRY_ABI,
    functionName: "getPropertiesOfOwner",
    args: address ? [address] : undefined,
    query: {
         enabled: !!address,
    }
  });

  const properties = result.data;
  const isLoading = result.isLoading;
  const error = result.error;

  const stats = [
    { label: "Total Properties", value: properties ? (properties as any[]).length.toString() : "0", icon: MapPin },
    { label: "Total Value", value: "--- ETH", icon: TrendingUp }, 
    { label: "Account Age", value: "Active", icon: Clock },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, <span className="text-gradient hover:text-primary transition-colors cursor-default">User</span>
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your property portfolio
        </p>
      </div>

      {/* Stats Keys */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <GlassCard hover className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link href="/register-land">
          <Button variant="hero">
            <Plus className="w-4 h-4 mr-2" />
            Register New Land
          </Button>
        </Link>
        <Link href="/marketplace">
          <Button variant="ghost-glow">
            <Store className="w-4 h-4 mr-2" />
            View Marketplace
          </Button>
        </Link>
        <Link href="/marketplace/my-sales">
          <Button variant="ghost-glow">
            <FileText className="w-4 h-4 mr-2" />
            Manage Sales
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">My Properties</h2>
        </div>

        {isLoading ? (
             <div className="text-center py-10 text-muted-foreground animate-pulse">Loading properties...</div>
        ) : !address ? (
            <GlassCard className="text-center py-20">
                <h3 className="text-lg font-medium text-foreground">Wallet Not Connected</h3>
                <p className="text-muted-foreground">Please connect your wallet to view your properties.</p>
            </GlassCard>
        ) : properties && (properties as any[]).length > 0 ? (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {(properties as any[]).map((property: any) => (
                <motion.div key={property.propertyId.toString()} variants={itemVariants}>
                  <GlassCard hover className="group h-full flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                Property #{property.propertyId.toString()}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                property.state === 2 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                                {property.state === 2 ? 'Verified' : 'Pending'}
                            </span>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Location ID</span>
                                <span className="font-mono text-foreground">{property.locationId.toString()}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Survey No</span>
                                <span className="font-mono text-foreground">{property.surveyNumber.toString()}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Area</span>
                                <span className="font-mono text-foreground">{property.area.toString()} sq.ft</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-auto">
                        {property.state === 2 && (
                            <Button 
                                variant="hero"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                    setSelectedPropertyId(property.propertyId);
                                    setIsSellModalOpen(true);
                                }}
                            >
                                Sell
                            </Button>
                        )}
                        <Button 
                            variant="bs" // Using default/outline logic but customized
                            className="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 flex-1"
                            size="sm"
                             onClick={() => {
                                setSelectedPropertyId(property.propertyId);
                                setIsTransferModalOpen(true);
                            }}
                        >
                            Transfer
                        </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
        ) : (
            <GlassCard className="text-center py-20">
              <h3 className="text-lg font-medium text-foreground">No Properties Found</h3>
              <p className="text-muted-foreground mt-2 mb-6">You haven't registered any properties yet.</p>
              <Link href="/register-land">
                <Button variant="hero">Register your first property</Button>
              </Link>
            </GlassCard>
        )}
      </div>

      {selectedPropertyId !== null && (
        <>
            <TransferOwnershipModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                    setIsTransferModalOpen(false);
                    setSelectedPropertyId(null);
                }}
                propertyId={selectedPropertyId}
            />
            <SellPropertyModal
                isOpen={isSellModalOpen}
                onClose={() => {
                    setIsSellModalOpen(false);
                    setSelectedPropertyId(null);
                }}
                propertyId={selectedPropertyId}
            />
        </>
      )}
    </DashboardLayout>
  );
}
