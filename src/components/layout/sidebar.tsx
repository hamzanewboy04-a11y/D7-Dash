"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  DollarSign,
  Users,
  Settings,
  TrendingUp,
  Upload,
  ClipboardEdit,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  ShoppingCart,
  Share2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface AuthUser {
  id: string;
  username: string;
  role: string;
  email: string | null;
  allowedSections: string[];
}

const navigation = [
  { name: "Дашборд", href: "/", icon: LayoutDashboard, section: "dashboard" },
  { name: "Страны", href: "/countries", icon: Globe, section: "countries" },
  { name: "Баинг", href: "/buying", icon: ShoppingCart, section: "buying" },
  { name: "SMM", href: "/smm", icon: Share2, section: "smm" },
  { name: "Финансы", href: "/finance", icon: DollarSign, section: "finance" },
  { name: "ФОТ", href: "/payroll", icon: Users, section: "payroll" },
  { name: "Импорт", href: "/import", icon: Upload, section: "import" },
  { name: "Ввод данных", href: "/data-entry", icon: ClipboardEdit, section: "data-entry" },
  { name: "Аналитика", href: "/analytics", icon: TrendingUp, section: "analytics" },
  { name: "Настройки", href: "/settings", icon: Settings, section: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  const filteredNavigation = navigation.filter((item) => {
    if (!user) return true;
    if (user.role === "admin") return true;
    if (user.allowedSections.length === 0) return true;
    return user.allowedSections.includes(item.section);
  });

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      admin: "Админ",
      editor: "Редактор",
      viewer: "Просмотр",
    };
    return labels[role] || role;
  };

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
        {filteredNavigation.map((item) => {
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

      {/* Footer with user info */}
      <div className="p-4 border-t border-[#1e293b]">
        {user && !collapsed && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-slate-400">{getRoleLabel(user.role)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full justify-start text-slate-400 hover:text-white hover:bg-[#1e293b]"
            >
              <LogOut size={16} className="mr-2" />
              {loggingOut ? "Выход..." : "Выйти"}
            </Button>
          </div>
        )}
        {collapsed && user && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-slate-400 hover:text-white hover:bg-[#1e293b]"
            title="Выйти"
          >
            <LogOut size={18} />
          </Button>
        )}
        {!collapsed && (
          <p className="text-xs text-slate-400">D7 Dashboard v1.0</p>
        )}
      </div>
    </div>
  );
}
