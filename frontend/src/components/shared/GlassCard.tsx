import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard = ({ children, className, hover = false }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-6",
        hover && "hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
        className
      )}
    >
      {children}
    </div>
  );
};
