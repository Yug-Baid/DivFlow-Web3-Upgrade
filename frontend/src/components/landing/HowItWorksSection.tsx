"use client";

import { motion } from "framer-motion";
import { Wallet, FileText, CheckCircle, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    step: "01",
    title: "Connect Your Wallet",
    description: "Link your Web3 wallet to securely authenticate and interact with the blockchain.",
  },
  {
    icon: FileText,
    step: "02",
    title: "Submit Property Details",
    description: "Enter your property information and upload supporting documents for verification.",
  },
  {
    icon: CheckCircle,
    step: "03",
    title: "Receive On-Chain Proof",
    description: "Get your immutable property certificate stored permanently on the blockchain.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/2 right-0 w-96 h-96 rounded-full bg-gradient-radial from-primary/10 to-transparent blur-3xl pointer-events-none" />
      
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
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Three Simple <span className="text-gradient">Steps</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Register your property on the blockchain in minutes, not months. 
            Our streamlined process makes property registration effortless.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-24 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />

            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                <div className="glass-card rounded-2xl p-8 text-center group hover:border-primary/50 transition-all duration-300">
                  {/* Step Number */}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-8 h-8 text-primary-foreground" />
                  </div>

                  {/* Step Badge */}
                  <div className="text-primary font-bold text-sm mb-4">
                    STEP {step.step}
                  </div>

                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (Mobile) */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-4 md:hidden">
                    <ArrowRight className="w-6 h-6 text-primary rotate-90" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
