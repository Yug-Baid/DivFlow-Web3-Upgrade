"use client";

import { motion } from "framer-motion";
import { Store, ArrowRight, TrendingUp, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const benefits = [
    {
        icon: ShieldCheck,
        title: "Verified Listings",
        description: "All properties are verified by land inspectors before being listed.",
    },
    {
        icon: TrendingUp,
        title: "Competitive Bidding",
        description: "Transparent bidding system ensures fair market prices.",
    },
    {
        icon: Wallet,
        title: "Secure Payments",
        description: "Smart contract escrow protects both buyers and sellers.",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
        },
    },
};

export const MarketplaceSection = () => {
    return (
        <section id="marketplace" className="py-32 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left Column - Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-primary text-sm font-semibold uppercase tracking-wider mb-4 block">
                            Property Marketplace
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Buy & Sell Property <br />
                            <span className="text-gradient">On-Chain</span>
                        </h2>
                        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                            Explore verified properties listed by owners across the network.
                            Make offers, track requests, and complete purchases with full
                            transparency and security of blockchain technology.
                        </p>

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="space-y-4 mb-10"
                        >
                            {benefits.map((benefit) => (
                                <motion.div
                                    key={benefit.title}
                                    variants={itemVariants}
                                    className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <benefit.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground mb-1">{benefit.title}</h4>
                                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        <Link href="/marketplace">
                            <Button variant="hero" size="lg" className="group">
                                <Store className="w-5 h-5 mr-2" />
                                Explore Marketplace
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Right Column - Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="relative">
                            {/* Main Card */}
                            <div className="glass-card rounded-2xl p-6 border border-border/50">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                        <Store className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Featured Listings</h3>
                                        <p className="text-sm text-muted-foreground">Verified properties ready for sale</p>
                                    </div>
                                </div>

                                {/* Mock Property Cards */}
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="p-4 rounded-xl bg-secondary/50 border border-border/30 hover:border-primary/30 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-sm text-primary">Property #{i}0{i + 1}</span>
                                                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full">
                                                    Verified
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">2,500 sq.ft • Bangalore</span>
                                                <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                                    {(100 + i * 25).toFixed(2)} ETH
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-border/50 text-center">
                                    <span className="text-sm text-muted-foreground">
                                        + More properties available
                                    </span>
                                </div>
                            </div>

                            {/* Floating Stats */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="absolute -top-6 -right-6 glass-card rounded-xl p-4 border border-primary/30"
                            >
                                <div className="text-2xl font-bold text-gradient">500+</div>
                                <div className="text-xs text-muted-foreground">Active Listings</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                className="absolute -bottom-4 -left-4 glass-card rounded-xl p-4 border border-accent/30"
                            >
                                <div className="text-2xl font-bold text-accent">₹100Cr+</div>
                                <div className="text-xs text-muted-foreground">Total Volume</div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
