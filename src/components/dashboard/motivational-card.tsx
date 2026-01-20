"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Flame, Target, Zap } from "lucide-react";

const motivationalQuotes = [
  "Каждый день - это шаг к успеху!",
  "Маленькие победы ведут к большим результатам",
  "Прогресс важнее совершенства",
  "Настойчивость побеждает талант",
  "Сегодня - лучший день для роста",
  "Успех - это сумма маленьких усилий",
  "Верь в себя и свою команду!",
  "Каждая сделка приближает к цели",
  "Результат - награда за труд",
  "Двигайся вперёд, не останавливайся!",
];

interface MotivationalCardProps {
  profitableDaysStreak: number;
  roi: number;
  monthlyGoal: number;
  currentMonthlyProfit: number;
  dailyGoal: number;
  currentDailyProfit: number;
}

export function MotivationalCard({
  profitableDaysStreak = 0,
  monthlyGoal = 10000,
  currentMonthlyProfit = 0,
}: MotivationalCardProps) {
  const [quote, setQuote] = useState(motivationalQuotes[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setQuote(motivationalQuotes[randomIndex]);

    const interval = setInterval(() => {
      const newIndex = Math.floor(Math.random() * motivationalQuotes.length);
      setQuote(motivationalQuotes[newIndex]);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const monthlyProgress = Math.min((currentMonthlyProfit / monthlyGoal) * 100, 100);

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-[#3b82f6]/20 bg-gradient-to-r from-[#3b82f6]/5 to-[#60a5fa]/10 max-h-[70px]">
      <div className="flex items-center gap-2 text-[#3b82f6] flex-shrink-0">
        <Zap className="h-4 w-4" />
      </div>

      <p className="text-sm text-slate-600 italic flex-shrink-0 max-w-[280px] truncate">"{quote}"</p>

      <div className="h-6 w-px bg-slate-200 flex-shrink-0" />

      {profitableDaysStreak > 0 && (
        <>
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full flex-shrink-0">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-bold text-orange-600">
              {profitableDaysStreak} {profitableDaysStreak === 1 ? "день" : profitableDaysStreak < 5 ? "дня" : "дней"}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200 flex-shrink-0" />
        </>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
        <Target className="h-3 w-3 text-[#3b82f6] flex-shrink-0" />
        <span className="text-xs text-slate-500 flex-shrink-0">Цель:</span>
        <Progress value={monthlyProgress} className="h-2 flex-1" />
        <span className="text-xs font-medium text-slate-600 flex-shrink-0">
          ${currentMonthlyProfit.toFixed(0)}/${monthlyGoal}
        </span>
      </div>
    </div>
  );
}
