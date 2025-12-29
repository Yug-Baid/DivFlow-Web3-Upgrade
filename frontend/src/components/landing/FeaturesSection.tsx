"use client";

import { motion } from "framer-motion";
import { Shield, FileCheck, Users, Globe, Lock, Zap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Immutable Security",
    description: "Every land record is cryptographically secured on the blockchain, ensuring tamper-proof documentation.",
  },
  {
    icon: FileCheck,
    title: "Instant Verification",
    description: "Verify property ownership in seconds with our decentralized verification system.",
  },
  {
    icon: Users,
    title: "Transparent Transfers",
    description: "Transfer property ownership seamlessly with full transaction history visible to all parties.",
  },
  {
    icon: Globe,
    title: "Global Accessibility",
    description: "Access your property records from anywhere in the world, 24/7, without intermediaries.",
  },
  {
    icon: Lock,
    title: "Smart Contracts",
    description: "Automated escrow and conditional transfers powered by trustless smart contract technology.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Complete property registrations and transfers in minutes, not weeks or months.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
};

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-primary text-sm font-semibold uppercase tracking-wider mb-4 block">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built for the <span className="text-gradient">Future</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our platform combines cutting-edge blockchain technology with intuitive design 
            to revolutionize how property ownership is managed globally.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group"
            >
              <div className="glass-card rounded-2xl p-8 h-full hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
