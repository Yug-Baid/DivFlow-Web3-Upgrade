"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, Server } from "lucide-react";

const securityFeatures = [
  {
    icon: Shield,
    title: "Military-Grade Encryption",
    description: "All data is encrypted using AES-256 encryption standards.",
  },
  {
    icon: Lock,
    title: "Multi-Signature Verification",
    description: "Critical operations require multiple signature approvals.",
  },
  {
    icon: Eye,
    title: "Transparent Audit Trail",
    description: "Complete history of all transactions visible on-chain.",
  },
  {
    icon: Server,
    title: "Decentralized Storage",
    description: "Data distributed across nodes for maximum resilience.",
  },
];

export const SecuritySection = () => {
  return (
    <section id="security" className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-primary text-sm font-semibold uppercase tracking-wider mb-4 block">
              Security
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Enterprise-Grade <span className="text-gradient">Security</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              Your property records are protected by the same cryptographic 
              technology that secures billions of dollars in digital assets worldwide.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {securityFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-radial from-primary/20 to-transparent blur-3xl" />
              
              <div className="relative z-10">
                {/* Shield Animation */}
                <div className="flex justify-center mb-8">
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 20px hsl(var(--primary) / 0.3)",
                        "0 0 60px hsl(var(--primary) / 0.5)",
                        "0 0 20px hsl(var(--primary) / 0.3)",
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
                  >
                    <Shield className="w-16 h-16 text-primary-foreground" />
                  </motion.div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-background/50">
                    <div className="text-3xl font-bold text-gradient mb-1">99.99%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-background/50">
                    <div className="text-3xl font-bold text-gradient mb-1">0</div>
                    <div className="text-sm text-muted-foreground">Security Breaches</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
