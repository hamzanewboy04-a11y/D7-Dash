"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "text-[#3b82f6]",
  className,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center mt-1 text-xs">
            <TrendIcon
              className={cn(
                "h-3 w-3 mr-1",
                isPositive ? "text-[#22c55e]" : "text-[#ef4444]"
              )}
            />
            <span className={isPositive ? "text-[#22c55e]" : "text-[#ef4444]"}>
              {isPositive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
            {changeLabel && (
              <span className="text-slate-500 ml-1">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
