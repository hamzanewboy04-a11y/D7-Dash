"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Loader2,
  Home,
  Globe,
  ShoppingCart,
  Building2,
  Users,
  Receipt,
  Settings,
  HelpCircle,
  ChevronRight,
  BookOpen,
  Key,
  Calculator,
  FileText,
  ArrowUp,
} from "lucide-react";

const sections = [
  { id: "intro", title: "Введение", icon: BookOpen },
  { id: "login", title: "Вход в систему", icon: Key },
  { id: "dashboard", title: "Главная страница", icon: Home },
  { id: "countries", title: "Страны", icon: Globe },
  { id: "buying", title: "Баинг", icon: ShoppingCart },
  { id: "cabinets", title: "Кабинеты и Дески", icon: Building2 },
  { id: "employees", title: "Сотрудники", icon: Users },
  { id: "expenses", title: "Расходы", icon: Receipt },
  { id: "settings", title: "Настройки", icon: Settings },
  { id: "formulas", title: "Формулы расчётов", icon: Calculator },
  { id: "glossary", title: "Словарь терминов", icon: FileText },
];

export default function HelpPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState("intro");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex gap-6">
      <nav className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-4 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-4">
            <HelpCircle className="h-5 w-5 text-[#3b82f6]" />
            <span className="font-semibold text-slate-900">Навигация</span>
          </div>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  activeSection === section.id
                    ? "bg-[#1e40af] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.title}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 space-y-8 pb-20">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-[#3b82f6]" />
            Инструкция по использованию
          </h1>
          <p className="text-slate-500 mt-2">
            Подробное руководство по всем функциям D7 Team Dashboard
          </p>
        </div>

        <div className="lg:hidden">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Быстрая навигация</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <Button
                    key={section.id}
                    variant="outline"
                    size="sm"
                    onClick={() => scrollToSection(section.id)}
                    className={activeSection === section.id ? "bg-[#1e40af] text-white" : ""}
                  >
                    {section.title}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <section id="intro" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#3b82f6]" />
                Введение
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                <strong>D7 Team Dashboard</strong> — это система для управления финансами и метриками команды D7. 
                Здесь вы можете отслеживать:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
                <li>Расходы на рекламу (спенд) по странам</li>
                <li>Доходы от клиентов (FD, RD)</li>
                <li>Эффективность работы баеров</li>
                <li>Рекламные кабинеты и рабочие места (дески)</li>
                <li>Зарплаты сотрудников</li>
                <li>Общие расходы компании</li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800">
                  <strong>Совет:</strong> Используйте боковое меню слева для быстрой навигации между разделами.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="login" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-[#3b82f6]" />
                Вход в систему
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Как войти:</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4">
                  <li>Откройте сайт</li>
                  <li>Введите ваш логин (имя пользователя)</li>
                  <li>Введите пароль</li>
                  <li>Нажмите кнопку "Войти"</li>
                </ol>
              </div>

              <div className="space-y-3 mt-6">
                <h4 className="font-semibold text-slate-800">Роли пользователей:</h4>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-800">Admin (Администратор)</p>
                    <p className="text-green-700 text-sm mt-1">
                      Полный доступ ко всем функциям. Может создавать пользователей, редактировать любые данные, 
                      удалять записи и настраивать систему.
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="font-medium text-yellow-800">Editor (Редактор)</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Может добавлять и редактировать данные: метрики баинга, сотрудников, расходы. 
                      Не может создавать новых пользователей.
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="font-medium text-slate-800">Viewer (Наблюдатель)</p>
                    <p className="text-slate-600 text-sm mt-1">
                      Только просмотр данных. Не может ничего редактировать или удалять. 
                      Кнопки редактирования скрыты.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-amber-800">
                  <strong>Важно:</strong> Если вы забыли пароль, обратитесь к администратору системы.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="dashboard" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-[#3b82f6]" />
                Главная страница (Dashboard)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Главная страница показывает общую картину бизнеса за выбранный период.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Что показывается:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">Общий спенд</p>
                    <p className="text-slate-600 text-sm">Сколько всего потрачено на рекламу</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">Общий доход</p>
                    <p className="text-slate-600 text-sm">Сколько всего заработано</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">ROI (рентабельность)</p>
                    <p className="text-slate-600 text-sm">Насколько выгодно работает бизнес</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">Графики</p>
                    <p className="text-slate-600 text-sm">Динамика показателей по дням</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как выбрать период:</h4>
                <p className="text-slate-600">
                  В правом верхнем углу есть выпадающий список с периодами:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                  <li><strong>7 дней</strong> — последняя неделя</li>
                  <li><strong>30 дней</strong> — последний месяц</li>
                  <li><strong>90 дней</strong> — последние 3 месяца</li>
                  <li><strong>Всё время</strong> — все данные с начала</li>
                  <li><strong>Свой диапазон</strong> — выберите даты вручную</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="countries" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#3b82f6]" />
                Страны
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Раздел показывает статистику отдельно по каждой стране, где работает команда.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Страны в системе:</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="font-medium">Перу</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="font-medium">Италия (Ж)</p>
                    <p className="text-xs text-slate-500">Женская аудитория</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="font-medium">Италия (М)</p>
                    <p className="text-xs text-slate-500">Мужская аудитория</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="font-medium">Аргентина</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="font-medium">Чили</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Показатели по странам:</h4>
                <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
                  <li><strong>Спенд</strong> — расходы на рекламу в этой стране</li>
                  <li><strong>FD</strong> — количество первых депозитов</li>
                  <li><strong>nFD</strong> — первые депозиты через нейро-воронку</li>
                  <li><strong>RD</strong> — количество редепозитов (повторных депозитов)</li>
                  <li><strong>Доход</strong> — заработок от этой страны</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="buying" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#3b82f6]" />
                Баинг
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                <strong>Баинг</strong> — это модуль для отслеживания работы баеров (специалистов по закупке рекламы).
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Что такое баер?</h4>
                <p className="text-slate-600">
                  Баер — это человек, который настраивает и запускает рекламу. Он тратит деньги на рекламу (спенд), 
                  чтобы привлечь новых клиентов.
                </p>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Показатели в таблице:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left p-3 font-medium">Показатель</th>
                        <th className="text-left p-3 font-medium">Что это значит</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="p-3 font-medium">Спенд</td>
                        <td className="p-3 text-slate-600">Сколько денег потрачено на рекламу</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Подписки</td>
                        <td className="p-3 text-slate-600">Сколько людей подписалось на канал/бота</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Диалоги</td>
                        <td className="p-3 text-slate-600">Сколько людей начали общение</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">FD</td>
                        <td className="p-3 text-slate-600">First Deposit — первые депозиты клиентов</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Цена подписки</td>
                        <td className="p-3 text-slate-600">Спенд ÷ Подписки = сколько стоит один подписчик</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Цена FD</td>
                        <td className="p-3 text-slate-600">Спенд ÷ FD = сколько стоит один депозит</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Конверсия %</td>
                        <td className="p-3 text-slate-600">(Диалоги ÷ Подписки) × 100% = процент активных</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">ЗП</td>
                        <td className="p-3 text-slate-600">Зарплата баера (10% от спенда)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как добавить запись (только для Editor/Admin):</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4">
                  <li>Нажмите синюю кнопку <strong>"Добавить"</strong> справа вверху</li>
                  <li>Заполните форму: дата, баер, страна, спенд, подписки, диалоги, FD</li>
                  <li>Нажмите <strong>"Создать"</strong></li>
                </ol>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как редактировать:</h4>
                <p className="text-slate-600">
                  Нажмите на иконку карандаша в строке записи, измените данные и сохраните.
                </p>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как удалить:</h4>
                <p className="text-slate-600">
                  Нажмите на красную иконку корзины. Подтвердите удаление во всплывающем окне.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800">
                  <strong>Совет:</strong> Используйте фильтры (период, страна, баер) для быстрого поиска нужных записей.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="cabinets" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#3b82f6]" />
                Кабинеты и Дески
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Этот раздел помогает организовать рекламные аккаунты и рабочие места.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Что такое Кабинет?</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-700">
                    <strong>Кабинет</strong> — это рекламный аккаунт на платформе (Facebook, TikTok и т.д.).
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    Примеры кабинетов: "Camila 3", "Corie", "Cabrera"
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Что такое Деск?</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-700">
                    <strong>Деск</strong> — это рабочее место внутри кабинета. 
                    Один кабинет может иметь несколько десков.
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    Примеры десков: "Desk1", "Desk3", "Default"
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Структура:</h4>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="h-5 w-5 text-[#3b82f6] mt-0.5" />
                    <div>
                      <p className="font-medium">Страна (например, Перу)</p>
                      <div className="ml-4 mt-2 space-y-2">
                        <div className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Кабинет "Camila 3"</p>
                            <div className="ml-4 mt-1 text-xs text-slate-500">
                              <p>→ Desk1 (баер: Иван)</p>
                              <p>→ Desk3 (баер: Мария)</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Кабинет "Corie"</p>
                            <div className="ml-4 mt-1 text-xs text-slate-500">
                              <p>→ Default (не назначен)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как создать кабинет:</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4">
                  <li>Нажмите <strong>"Новый кабинет"</strong></li>
                  <li>Введите название (обязательно)</li>
                  <li>Укажите платформу (необязательно): Facebook, TikTok и т.д.</li>
                  <li>Введите ID платформы (необязательно)</li>
                  <li>Выберите страну</li>
                  <li>Нажмите <strong>"Создать"</strong></li>
                </ol>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как создать деск:</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4">
                  <li>Найдите нужный кабинет</li>
                  <li>Нажмите кнопку <strong>"+ Деск"</strong> справа</li>
                  <li>Введите название деска</li>
                  <li>Выберите сотрудника (необязательно)</li>
                  <li>Нажмите <strong>"Создать"</strong></li>
                </ol>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как назначить сотрудника на деск:</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4">
                  <li>Найдите нужный деск</li>
                  <li>Нажмите на иконку человечка</li>
                  <li>Выберите сотрудника из списка</li>
                  <li>Нажмите <strong>"Сохранить"</strong></li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="text-green-800">
                  <strong>Зачем это нужно?</strong> Метрики баинга привязываются к дескам, а не к сотрудникам. 
                  Это позволяет точнее отслеживать эффективность каждого рабочего места.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="employees" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#3b82f6]" />
                Сотрудники
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Управление командой: добавление, редактирование и настройка сотрудников.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Роли сотрудников:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">Баер</p>
                    <p className="text-slate-600 text-sm">Закупает рекламу, работает с трафиком</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">RD Handler</p>
                    <p className="text-slate-600 text-sm">Работает с редепозитами клиентов</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">SMM</p>
                    <p className="text-slate-600 text-sm">Ведёт социальные сети</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="font-medium text-slate-800">Другие роли</p>
                    <p className="text-slate-600 text-sm">Можно создать любую роль</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как добавить сотрудника:</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4">
                  <li>Нажмите <strong>"Добавить сотрудника"</strong></li>
                  <li>Введите имя</li>
                  <li>Выберите или введите роль</li>
                  <li>Выберите страну (если нужно)</li>
                  <li>Настройте ставку зарплаты</li>
                  <li>Нажмите <strong>"Создать"</strong></li>
                </ol>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Настройка зарплаты:</h4>
                <p className="text-slate-600">
                  Для каждого сотрудника можно настроить процент от определённой базы:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                  <li><strong>От спенда</strong> — процент от потраченного на рекламу</li>
                  <li><strong>От прибыли</strong> — процент от чистой прибыли</li>
                  <li><strong>От FD</strong> — процент от суммы первых депозитов</li>
                  <li><strong>От RD</strong> — процент от суммы редепозитов</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="expenses" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#3b82f6]" />
                Расходы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Учёт всех расходов компании, кроме расходов на рекламу (спенд).
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Категории расходов:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    "Аккаунты",
                    "Прокси",
                    "Хостинг",
                    "Софт",
                    "Реклама",
                    "Банковские комиссии",
                    "Связь",
                    "Офис",
                    "Зарплаты",
                    "Налоги",
                    "Юридические услуги",
                    "Другое"
                  ].map((cat) => (
                    <div key={cat} className="bg-slate-50 rounded-lg p-2 text-center text-sm">
                      {cat}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Как добавить расход:</h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4">
                  <li>Нажмите <strong>"Добавить расход"</strong></li>
                  <li>Выберите категорию</li>
                  <li>Введите сумму</li>
                  <li>Выберите дату</li>
                  <li>Добавьте описание (необязательно)</li>
                  <li>Нажмите <strong>"Создать"</strong></li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="settings" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#3b82f6]" />
                Настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Раздел только для администраторов.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-800">Управление пользователями:</h4>
                <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
                  <li>Создание новых пользователей</li>
                  <li>Изменение ролей (Admin, Editor, Viewer)</li>
                  <li>Сброс паролей</li>
                  <li>Удаление пользователей</li>
                </ul>
              </div>

              <div className="space-y-3 mt-4">
                <h4 className="font-semibold text-slate-800">Настройка целей:</h4>
                <p className="text-slate-600">
                  Можно установить целевые показатели для отслеживания прогресса:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                  <li>Целевой доход</li>
                  <li>Целевой ROI</li>
                  <li>Целевое количество FD</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="formulas" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#3b82f6]" />
                Формулы расчётов
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Все расчёты в системе делаются автоматически по этим формулам:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left p-3 font-medium">Показатель</th>
                      <th className="text-left p-3 font-medium">Формула</th>
                      <th className="text-left p-3 font-medium">Пример</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3 font-medium">ROI</td>
                      <td className="p-3 text-slate-600">(Доход − Расходы) ÷ Расходы × 100%</td>
                      <td className="p-3 text-slate-500">(1000 − 500) ÷ 500 × 100% = 100%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Цена подписки</td>
                      <td className="p-3 text-slate-600">Спенд ÷ Подписки</td>
                      <td className="p-3 text-slate-500">$100 ÷ 50 = $2</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Цена FD</td>
                      <td className="p-3 text-slate-600">Спенд ÷ FD</td>
                      <td className="p-3 text-slate-500">$100 ÷ 5 = $20</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Конверсия</td>
                      <td className="p-3 text-slate-600">(Диалоги ÷ Подписки) × 100%</td>
                      <td className="p-3 text-slate-500">(30 ÷ 50) × 100% = 60%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">ЗП баера</td>
                      <td className="p-3 text-slate-600">Спенд × 10%</td>
                      <td className="p-3 text-slate-500">$1000 × 10% = $100</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Agency Fee (Trust)</td>
                      <td className="p-3 text-slate-600">Спенд × 9%</td>
                      <td className="p-3 text-slate-500">$1000 × 9% = $90</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Agency Fee (другие)</td>
                      <td className="p-3 text-slate-600">Спенд × 8%</td>
                      <td className="p-3 text-slate-500">$1000 × 8% = $80</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Комиссия приёмки</td>
                      <td className="p-3 text-slate-600">Сумма × 15%</td>
                      <td className="p-3 text-slate-500">$1000 × 15% = $150</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">ЗП RD Handler</td>
                      <td className="p-3 text-slate-600">Сумма RD × 4%</td>
                      <td className="p-3 text-slate-500">$5000 × 4% = $200</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="glossary" className="scroll-mt-4">
          <Card className="border-l-4 border-l-[#3b82f6]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#3b82f6]" />
                Словарь терминов
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700">
                Основные термины, которые используются в системе:
              </p>

              <div className="space-y-3">
                {[
                  { term: "FD (First Deposit)", desc: "Первый депозит клиента. Когда новый клиент впервые вносит деньги." },
                  { term: "nFD (нейро First Deposit)", desc: "Первый депозит, полученный через нейро-воронку (автоматизированную систему)." },
                  { term: "RD (Редепозит)", desc: "Повторный депозит. Когда уже существующий клиент вносит деньги снова." },
                  { term: "Спенд", desc: "Расходы на рекламу. Деньги, которые тратятся на показ рекламы." },
                  { term: "Кабинет", desc: "Рекламный аккаунт на платформе (Facebook, TikTok и т.д.)." },
                  { term: "Деск", desc: "Рабочее место внутри кабинета. Один кабинет может иметь несколько десков." },
                  { term: "Баер", desc: "Специалист по закупке рекламы. Настраивает и оптимизирует рекламные кампании." },
                  { term: "RD Handler", desc: "Специалист, который работает с повторными депозитами клиентов." },
                  { term: "ROI", desc: "Return on Investment — возврат инвестиций. Показывает, насколько выгодно работает бизнес." },
                  { term: "Конверсия", desc: "Процент людей, которые совершили целевое действие (например, начали диалог)." },
                  { term: "Agency Fee", desc: "Комиссия агентства за использование рекламных аккаунтов." },
                  { term: "Приёмка", desc: "Процесс приёма и обработки платежей с комиссией." },
                ].map((item) => (
                  <div key={item.term} className="bg-slate-50 rounded-lg p-4">
                    <p className="font-semibold text-slate-800">{item.term}</p>
                    <p className="text-slate-600 text-sm mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="bg-[#1e40af] text-white">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-lg font-medium">Остались вопросы?</p>
              <p className="text-blue-200 mt-1">
                Обратитесь к администратору системы для получения помощи.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-[#1e40af] text-white p-3 rounded-full shadow-lg hover:bg-[#3b82f6] transition-colors"
          title="Наверх"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
