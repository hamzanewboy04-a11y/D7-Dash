"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  DollarSign,
  Users,
  Settings,
  TrendingUp,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Дашборд", href: "/", icon: LayoutDashboard },
  { name: "Страны", href: "/countries", icon: Globe },
  { name: "Финансы", href: "/finance", icon: DollarSign },
  { name: "ФОТ", href: "/payroll", icon: Users },
  { name: "Импорт", href: "/import", icon: Upload },
  { name: "Аналитика", href: "/analytics", icon: TrendingUp },
  { name: "Настройки", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-[#0f172a] text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1e293b]">
        {!collapsed && (
          <span className="text-xl font-bold text-[#60a5fa]">D7 Team</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-300 hover:text-white hover:bg-[#1e293b]"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-[#3b82f6] text-white"
                  : "text-slate-300 hover:text-white hover:bg-[#1e293b]"
              )}
            >
              <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-[#1e293b]">
          <p className="text-xs text-slate-400">D7 Dashboard v1.0</p>
        </div>
      )}
    </div>
  );
}
