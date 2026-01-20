"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  Star,
  Flame,
  Target,
  Globe,
  TrendingUp,
  Award,
  Zap,
  Crown,
  Medal,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

interface AchievementsProps {
  totalProfit: number;
  profitableDaysStreak: number;
  roi: number;
  activeCountries: number;
  totalRevenue: number;
}

export function Achievements({
  totalProfit = 0,
  profitableDaysStreak = 0,
  roi = 0,
  activeCountries = 0,
  totalRevenue = 0,
}: AchievementsProps) {
  const achievements: Achievement[] = [
    {
      id: "first-1000",
      title: "Первые $1,000",
      description: "Заработать первую тысячу долларов",
      icon: Star,
      unlocked: totalProfit >= 1000,
      progress: Math.min(totalProfit, 1000),
      maxProgress: 1000,
    },
    {
      id: "first-5000",
      title: "Серьёзный игрок",
      description: "Заработать $5,000 прибыли",
      icon: Trophy,
      unlocked: totalProfit >= 5000,
      progress: Math.min(totalProfit, 5000),
      maxProgress: 5000,
    },
    {
      id: "first-10000",
      title: "Мастер прибыли",
      description: "Заработать $10,000 прибыли",
      icon: Crown,
      unlocked: totalProfit >= 10000,
      progress: Math.min(totalProfit, 10000),
      maxProgress: 10000,
    },
    {
      id: "week-profit",
      title: "Неделя в плюсе",
      description: "7 дней подряд с прибылью",
      icon: Flame,
      unlocked: profitableDaysStreak >= 7,
      progress: Math.min(profitableDaysStreak, 7),
      maxProgress: 7,
    },
    {
      id: "month-streak",
      title: "Стабильность",
      description: "30 дней подряд с прибылью",
      icon: Medal,
      unlocked: profitableDaysStreak >= 30,
      progress: Math.min(profitableDaysStreak, 30),
      maxProgress: 30,
    },
    {
      id: "roi-champion",
      title: "ROI Чемпион",
      description: "Достичь ROI более 50%",
      icon: TrendingUp,
      unlocked: roi > 50,
      progress: Math.min(roi, 50),
      maxProgress: 50,
    },
    {
      id: "roi-master",
      title: "ROI Мастер",
      description: "Достичь ROI более 100%",
      icon: Zap,
      unlocked: roi > 100,
      progress: Math.min(roi, 100),
      maxProgress: 100,
    },
    {
      id: "5-countries",
      title: "5 Стран",
      description: "Активная работа в 5 странах",
      icon: Globe,
      unlocked: activeCountries >= 5,
      progress: Math.min(activeCountries, 5),
      maxProgress: 5,
    },
    {
      id: "10-countries",
      title: "Глобальная экспансия",
      description: "Активная работа в 10 странах",
      icon: Globe,
      unlocked: activeCountries >= 10,
      progress: Math.min(activeCountries, 10),
      maxProgress: 10,
    },
    {
      id: "revenue-king",
      title: "Король дохода",
      description: "Сгенерировать $50,000 дохода",
      icon: Award,
      unlocked: totalRevenue >= 50000,
      progress: Math.min(totalRevenue, 50000),
      maxProgress: 50000,
    },
    {
      id: "first-target",
      title: "Целеустремлённый",
      description: "Достичь дневной цели",
      icon: Target,
      unlocked: totalProfit > 0,
    },
    {
      id: "top-performer",
      title: "Топ перформер",
      description: "Заработать $100,000 прибыли",
      icon: Crown,
      unlocked: totalProfit >= 100000,
      progress: Math.min(totalProfit, 100000),
      maxProgress: 100000,
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className="border-2 border-[#3b82f6]/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#3b82f6]">
            <Trophy className="h-5 w-5" />
            Достижения
          </CardTitle>
          <div className="text-sm text-slate-500">
            {unlockedCount} / {achievements.length} разблокировано
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {achievements.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const Icon = achievement.icon;
  const progressPercent =
    achievement.progress !== undefined && achievement.maxProgress
      ? (achievement.progress / achievement.maxProgress) * 100
      : 0;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-300",
        achievement.unlocked
          ? "bg-gradient-to-b from-[#3b82f6]/10 to-[#60a5fa]/20 border-[#3b82f6] shadow-lg shadow-[#3b82f6]/20"
          : "bg-slate-50 border-slate-200 opacity-60"
      )}
    >
      {achievement.unlocked && (
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
        </div>
      )}

      <div
        className={cn(
          "relative w-12 h-12 rounded-full flex items-center justify-center mb-2",
          achievement.unlocked
            ? "bg-gradient-to-br from-[#3b82f6] to-[#60a5fa]"
            : "bg-slate-200"
        )}
      >
        {achievement.unlocked ? (
          <Icon className="h-6 w-6 text-white" />
        ) : (
          <Lock className="h-5 w-5 text-slate-400" />
        )}
      </div>

      <p
        className={cn(
          "text-xs font-medium text-center leading-tight",
          achievement.unlocked ? "text-[#3b82f6]" : "text-slate-400"
        )}
      >
        {achievement.title}
      </p>

      <p className="text-[10px] text-slate-400 text-center mt-1 leading-tight">
        {achievement.description}
      </p>

      {!achievement.unlocked && achievement.maxProgress && (
        <div className="w-full mt-2">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#60a5fa] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[9px] text-slate-400 text-center mt-1">
            {achievement.progress?.toLocaleString()} / {achievement.maxProgress?.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
