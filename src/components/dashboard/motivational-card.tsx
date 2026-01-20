"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Sparkles, Target, TrendingUp, Zap } from "lucide-react";

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
  roi = 0,
  monthlyGoal = 10000,
  currentMonthlyProfit = 0,
  dailyGoal = 500,
  currentDailyProfit = 0,
}: MotivationalCardProps) {
  const [quote, setQuote] = useState(motivationalQuotes[0]);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setQuote(motivationalQuotes[randomIndex]);

    const interval = setInterval(() => {
      const newIndex = Math.floor(Math.random() * motivationalQuotes.length);
      setQuote(motivationalQuotes[newIndex]);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (roi > 50) {
      setShowCelebration(true);
    }
  }, [roi]);

  const monthlyProgress = Math.min((currentMonthlyProfit / monthlyGoal) * 100, 100);
  const dailyProgress = Math.min((currentDailyProfit / dailyGoal) * 100, 100);

  return (
    <Card className="relative overflow-hidden border-2 border-[#3b82f6]/20 bg-gradient-to-r from-[#3b82f6]/5 to-[#60a5fa]/10">
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 left-4 animate-bounce">
            <Sparkles className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="absolute top-4 right-8 animate-bounce delay-100">
            <Sparkles className="h-5 w-5 text-[#60a5fa]" />
          </div>
          <div className="absolute bottom-4 left-12 animate-bounce delay-200">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div className="absolute top-6 left-1/3 animate-bounce delay-300">
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="absolute bottom-6 right-1/4 animate-bounce delay-150">
            <Sparkles className="h-6 w-6 text-[#60a5fa]" />
          </div>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#3b82f6]">
            <Zap className="h-5 w-5" />
            Мотивация дня
          </CardTitle>
          {profitableDaysStreak > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 rounded-full">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-600">
                {profitableDaysStreak} {profitableDaysStreak === 1 ? "день" : profitableDaysStreak < 5 ? "дня" : "дней"} подряд!
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <p className="text-lg font-medium text-slate-700 italic">"{quote}"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-slate-600">
                <Target className="h-4 w-4 text-[#3b82f6]" />
                Дневная цель
              </span>
              <span className="font-medium">
                ${currentDailyProfit.toFixed(0)} / ${dailyGoal}
              </span>
            </div>
            <Progress value={dailyProgress} className="h-2" />
            {dailyProgress >= 100 && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Цель достигнута!
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-slate-600">
                <TrendingUp className="h-4 w-4 text-[#3b82f6]" />
                Месячная цель
              </span>
              <span className="font-medium">
                ${currentMonthlyProfit.toFixed(0)} / ${monthlyGoal}
              </span>
            </div>
            <Progress value={monthlyProgress} className="h-2" />
            {monthlyProgress >= 100 && (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Месячная цель достигнута!
              </p>
            )}
          </div>
        </div>

        {showCelebration && (
          <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border border-yellow-200">
            <p className="text-center font-bold text-orange-600 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              🎉 ROI превысил 50%! Отличная работа! 🎉
              <Sparkles className="h-5 w-5" />
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
