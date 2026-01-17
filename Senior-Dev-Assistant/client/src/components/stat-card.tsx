import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ title, value, icon, description, trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border/50 shadow-sm rounded-xl p-6 transition-all duration-300 hover:shadow-md hover:border-primary/20",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-primary/60">{icon}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-display font-bold text-foreground">{value}</span>
        {description && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend === "up" && <span className="text-green-500">↑</span>}
            {trend === "down" && <span className="text-red-500">↓</span>}
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
