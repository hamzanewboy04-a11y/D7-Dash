"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Plus,
  RefreshCw,
  Calendar,
  Edit,
  Trash2,
  FileText,
  Image,
  MessageSquare,
  Star,
  Loader2,
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

const DATE_RANGE_OPTIONS = [
  { value: "1", label: "Сегодня" },
  { value: "7", label: "Последняя неделя" },
  { value: "30", label: "Последний месяц" },
  { value: "90", label: "Последние 3 месяца" },
  { value: "all", label: "Всё время" },
  { value: "custom", label: "Свой диапазон" },
];

const PROJECT_TABS = [
  { code: "all", name: "Все" },
  { code: "PE", name: "Перу" },
  { code: "IT_F", name: "Италия (Ж)" },
  { code: "IT_M", name: "Италия (М)" },
  { code: "AR", name: "Аргентина" },
  { code: "CL", name: "Чили" },
];

interface Country {
  id: string;
  name: string;
  code: string;
}

interface SmmMetric {
  id: string;
  date: string;
  postsPlan: number;
  postsPlanDaily: number;
  postsFactDaily: number;
  postsTotal: number;
  postsRemaining: number;
  storiesPlan: number;
  storiesPlanDaily: number;
  storiesFactDaily: number;
  storiesTotal: number;
  storiesRemaining: number;
  miniReviewsPlan: number;
  miniReviewsPlanDaily: number;
  miniReviewsFactDaily: number;
  miniReviewsTotal: number;
  miniReviewsRemaining: number;
  bigReviewsPlan: number;
  bigReviewsPlanDaily: number;
  bigReviewsFactDaily: number;
  bigReviewsTotal: number;
  bigReviewsRemaining: number;
  completionRate: number;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    role: string;
  } | null;
  country: {
    id: string;
    name: string;
    code: string;
  };
}

interface Totals {
  _sum: {
    postsPlan: number | null;
    postsTotal: number | null;
    storiesPlan: number | null;
    storiesTotal: number | null;
    miniReviewsPlan: number | null;
    miniReviewsTotal: number | null;
    bigReviewsPlan: number | null;
    bigReviewsTotal: number | null;
  };
}

interface FormData {
  date: string;
  countryId: string;
  postsPlan: string;
  postsTotal: string;
  storiesPlan: string;
  storiesTotal: string;
  miniReviewsPlan: string;
  miniReviewsTotal: string;
  bigReviewsPlan: string;
  bigReviewsTotal: string;
  notes: string;
}

const emptyForm: FormData = {
  date: new Date().toISOString().split("T")[0],
  countryId: "",
  postsPlan: "",
  postsTotal: "",
  storiesPlan: "",
  storiesTotal: "",
  miniReviewsPlan: "",
  miniReviewsTotal: "",
  bigReviewsPlan: "",
  bigReviewsTotal: "",
  notes: "",
};

const countryNames: Record<string, string> = {
  Peru: "Перу",
  "Italy (Women)": "Италия (Ж)",
  "Italy (Men)": "Италия (М)",
  Argentina: "Аргентина",
  Chile: "Чили",
};

const getCountryNameRu = (name: string): string => {
  return countryNames[name] || name;
};

export default function SmmPage() {
  const router = useRouter();
  const { user, loading: authLoading, canEdit } = useAuth();

  const [metrics, setMetrics] = useState<SmmMetric[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dateRange, setDateRange] = useState<string>("30");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedProjectTab, setSelectedProjectTab] = useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<SmmMetric | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const getDateRangeParams = () => {
    if (dateRange === "all") {
      return {};
    }
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    const days = parseInt(dateRange);
    if (!isNaN(days)) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    }
    return {};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateParams = getDateRangeParams();
      const params = new URLSearchParams();
      if (dateParams.startDate) params.set("startDate", dateParams.startDate);
      if (dateParams.endDate) params.set("endDate", dateParams.endDate);
      
      const effectiveCountryId = selectedProjectTab !== "all" 
        ? countries.find(c => c.code === selectedProjectTab)?.id 
        : (selectedCountry !== "all" ? selectedCountry : undefined);
      
      if (effectiveCountryId) params.set("countryId", effectiveCountryId);

      const response = await fetch(`/api/smm?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
        setTotals(data.totals || null);
      }
    } catch (error) {
      console.error("Error fetching SMM metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await fetch("/api/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCountries();
    }
  }, [user]);

  useEffect(() => {
    if (user && countries.length > 0) {
      fetchData();
    }
  }, [user, dateRange, customStartDate, customEndDate, selectedCountry, selectedProjectTab, countries]);

  const handleOpenDialog = (metric?: SmmMetric) => {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        date: metric.date.split("T")[0],
        countryId: metric.country.id,
        postsPlan: metric.postsPlan.toString(),
        postsTotal: metric.postsTotal.toString(),
        storiesPlan: metric.storiesPlan.toString(),
        storiesTotal: metric.storiesTotal.toString(),
        miniReviewsPlan: metric.miniReviewsPlan.toString(),
        miniReviewsTotal: metric.miniReviewsTotal.toString(),
        bigReviewsPlan: metric.bigReviewsPlan.toString(),
        bigReviewsTotal: metric.bigReviewsTotal.toString(),
        notes: metric.notes || "",
      });
    } else {
      setEditingMetric(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMetric(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async () => {
    if (!formData.countryId || !formData.date) {
      alert("Заполните обязательные поля: дата, страна");
      return;
    }

    setSaving(true);
    try {
      const postsPlan = parseInt(formData.postsPlan) || 0;
      const postsTotal = parseInt(formData.postsTotal) || 0;
      const storiesPlan = parseInt(formData.storiesPlan) || 0;
      const storiesTotal = parseInt(formData.storiesTotal) || 0;
      const miniReviewsPlan = parseInt(formData.miniReviewsPlan) || 0;
      const miniReviewsTotal = parseInt(formData.miniReviewsTotal) || 0;
      const bigReviewsPlan = parseInt(formData.bigReviewsPlan) || 0;
      const bigReviewsTotal = parseInt(formData.bigReviewsTotal) || 0;

      const payload = {
        ...(editingMetric && { id: editingMetric.id }),
        date: formData.date,
        countryId: formData.countryId,
        postsPlan,
        postsTotal,
        postsRemaining: Math.max(0, postsPlan - postsTotal),
        storiesPlan,
        storiesTotal,
        storiesRemaining: Math.max(0, storiesPlan - storiesTotal),
        miniReviewsPlan,
        miniReviewsTotal,
        miniReviewsRemaining: Math.max(0, miniReviewsPlan - miniReviewsTotal),
        bigReviewsPlan,
        bigReviewsTotal,
        bigReviewsRemaining: Math.max(0, bigReviewsPlan - bigReviewsTotal),
        notes: formData.notes || null,
      };

      const response = await fetch("/api/smm", {
        method: editingMetric ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        handleCloseDialog();
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка сохранения");
      }
    } catch (error) {
      console.error("Error saving metric:", error);
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту запись?")) return;

    try {
      const response = await fetch(`/api/smm?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting metric:", error);
    }
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

  const totalPostsPlan = totals?._sum?.postsPlan || 0;
  const totalPostsFact = totals?._sum?.postsTotal || 0;
  const totalStoriesPlan = totals?._sum?.storiesPlan || 0;
  const totalStoriesFact = totals?._sum?.storiesTotal || 0;
  const totalMiniReviewsPlan = totals?._sum?.miniReviewsPlan || 0;
  const totalMiniReviewsFact = totals?._sum?.miniReviewsTotal || 0;
  const totalBigReviewsPlan = totals?._sum?.bigReviewsPlan || 0;
  const totalBigReviewsFact = totals?._sum?.bigReviewsTotal || 0;

  const totalPlan = totalPostsPlan + totalStoriesPlan + totalMiniReviewsPlan + totalBigReviewsPlan;
  const totalDone = totalPostsFact + totalStoriesFact + totalMiniReviewsFact + totalBigReviewsFact;
  const totalRemaining = Math.max(0, totalPlan - totalDone);
  const completionPercent = totalPlan > 0 ? (totalDone / totalPlan) * 100 : 0;

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "bg-emerald-500";
    if (percent >= 75) return "bg-blue-500";
    if (percent >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SMM</h1>
          <p className="text-slate-500 mt-1">
            Метрики SMM: посты, сторис, отзывы
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dateRange === "custom" && (
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-slate-500">—</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[140px]"
              />
            </div>
          )}
          <Button
            onClick={() => fetchData()}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          {canEdit && (
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-lg">
        {PROJECT_TABS.map((tab) => (
          <Button
            key={tab.code}
            variant={selectedProjectTab === tab.code ? "default" : "ghost"}
            className={
              selectedProjectTab === tab.code
                ? "bg-[#1e40af] hover:bg-[#3b82f6] text-white"
                : "hover:bg-slate-200 text-slate-700"
            }
            onClick={() => {
              setSelectedProjectTab(tab.code);
              if (tab.code !== "all") {
                setSelectedCountry("all");
              }
            }}
          >
            {tab.name}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Target className="h-4 w-4 text-[#3b82f6]" />
              Общий план
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">{totalPlan}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Выполнено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{totalDone}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#3b82f6]" />
              Выполнение %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">
              {completionPercent.toFixed(1)}%
            </p>
            <Progress 
              value={Math.min(completionPercent, 100)} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Осталось
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{totalRemaining}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#3b82f6]" />
              Посты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">План: {totalPostsPlan}</span>
              <span className="text-slate-500">Факт: {totalPostsFact}</span>
            </div>
            <Progress 
              value={totalPostsPlan > 0 ? Math.min((totalPostsFact / totalPostsPlan) * 100, 100) : 0} 
              className="h-2"
            />
            <div className="text-xs text-slate-400 mt-1 text-right">
              Осталось: {Math.max(0, totalPostsPlan - totalPostsFact)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Image className="h-4 w-4 text-[#3b82f6]" />
              Сторис
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">План: {totalStoriesPlan}</span>
              <span className="text-slate-500">Факт: {totalStoriesFact}</span>
            </div>
            <Progress 
              value={totalStoriesPlan > 0 ? Math.min((totalStoriesFact / totalStoriesPlan) * 100, 100) : 0} 
              className="h-2"
            />
            <div className="text-xs text-slate-400 mt-1 text-right">
              Осталось: {Math.max(0, totalStoriesPlan - totalStoriesFact)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#3b82f6]" />
              Мини-отзывы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">План: {totalMiniReviewsPlan}</span>
              <span className="text-slate-500">Факт: {totalMiniReviewsFact}</span>
            </div>
            <Progress 
              value={totalMiniReviewsPlan > 0 ? Math.min((totalMiniReviewsFact / totalMiniReviewsPlan) * 100, 100) : 0} 
              className="h-2"
            />
            <div className="text-xs text-slate-400 mt-1 text-right">
              Осталось: {Math.max(0, totalMiniReviewsPlan - totalMiniReviewsFact)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Star className="h-4 w-4 text-[#3b82f6]" />
              Большие отзывы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">План: {totalBigReviewsPlan}</span>
              <span className="text-slate-500">Факт: {totalBigReviewsFact}</span>
            </div>
            <Progress 
              value={totalBigReviewsPlan > 0 ? Math.min((totalBigReviewsFact / totalBigReviewsPlan) * 100, 100) : 0} 
              className="h-2"
            />
            <div className="text-xs text-slate-400 mt-1 text-right">
              Осталось: {Math.max(0, totalBigReviewsPlan - totalBigReviewsFact)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Метрики SMM по странам</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Все страны" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все страны</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getCountryNameRu(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Нет данных за выбранный период
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Дата</TableHead>
                    <TableHead>Страна</TableHead>
                    <TableHead className="text-center" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3" /> Посты
                      </div>
                    </TableHead>
                    <TableHead className="text-center" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <Image className="h-3 w-3" /> Сторис
                      </div>
                    </TableHead>
                    <TableHead className="text-center" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Мини-отзывы
                      </div>
                    </TableHead>
                    <TableHead className="text-center" colSpan={3}>
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3 w-3" /> Большие отзывы
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Выполнение</TableHead>
                    {canEdit && <TableHead className="text-right">Действия</TableHead>}
                  </TableRow>
                  <TableRow className="bg-slate-50/50">
                    <TableHead></TableHead>
                    <TableHead></TableHead>
                    <TableHead className="text-center text-xs">План/День</TableHead>
                    <TableHead className="text-center text-xs">Факт/День</TableHead>
                    <TableHead className="text-center text-xs">Остаток</TableHead>
                    <TableHead className="text-center text-xs">План/День</TableHead>
                    <TableHead className="text-center text-xs">Факт/День</TableHead>
                    <TableHead className="text-center text-xs">Остаток</TableHead>
                    <TableHead className="text-center text-xs">План/День</TableHead>
                    <TableHead className="text-center text-xs">Факт/День</TableHead>
                    <TableHead className="text-center text-xs">Остаток</TableHead>
                    <TableHead className="text-center text-xs">План/День</TableHead>
                    <TableHead className="text-center text-xs">Факт/День</TableHead>
                    <TableHead className="text-center text-xs">Остаток</TableHead>
                    <TableHead></TableHead>
                    {canEdit && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50">
                      <TableCell>
                        {new Date(m.date).toLocaleDateString("ru-RU")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getCountryNameRu(m.country.name)}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">{m.postsPlanDaily || m.postsPlan}</TableCell>
                      <TableCell className="text-center font-medium">{m.postsFactDaily || m.postsTotal}</TableCell>
                      <TableCell className="text-center text-amber-600">{m.postsRemaining}</TableCell>
                      <TableCell className="text-center text-slate-600">{m.storiesPlanDaily || m.storiesPlan}</TableCell>
                      <TableCell className="text-center font-medium">{m.storiesFactDaily || m.storiesTotal}</TableCell>
                      <TableCell className="text-center text-amber-600">{m.storiesRemaining}</TableCell>
                      <TableCell className="text-center text-slate-600">{m.miniReviewsPlanDaily || m.miniReviewsPlan}</TableCell>
                      <TableCell className="text-center font-medium">{m.miniReviewsFactDaily || m.miniReviewsTotal}</TableCell>
                      <TableCell className="text-center text-amber-600">{m.miniReviewsRemaining}</TableCell>
                      <TableCell className="text-center text-slate-600">{m.bigReviewsPlanDaily || m.bigReviewsPlan}</TableCell>
                      <TableCell className="text-center font-medium">{m.bigReviewsFactDaily || m.bigReviewsTotal}</TableCell>
                      <TableCell className="text-center text-amber-600">{m.bigReviewsRemaining}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-medium ${
                            m.completionRate >= 100 ? "text-emerald-600" :
                            m.completionRate >= 75 ? "text-blue-600" :
                            m.completionRate >= 50 ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {m.completionRate.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(m.completionRate)}`}
                              style={{ width: `${Math.min(m.completionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleOpenDialog(m)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(m.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMetric ? "Редактировать запись" : "Добавить SMM метрики"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Дата *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Страна *</Label>
                <Select
                  value={formData.countryId}
                  onValueChange={(v) => setFormData({ ...formData, countryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите страну" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {getCountryNameRu(c.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="col-span-2 flex items-center gap-2 text-[#1e40af] font-medium">
                <FileText className="h-4 w-4" />
                Посты
              </div>
              <div>
                <Label htmlFor="postsPlan">План</Label>
                <Input
                  id="postsPlan"
                  type="number"
                  value={formData.postsPlan}
                  onChange={(e) => setFormData({ ...formData, postsPlan: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="postsTotal">Факт</Label>
                <Input
                  id="postsTotal"
                  type="number"
                  value={formData.postsTotal}
                  onChange={(e) => setFormData({ ...formData, postsTotal: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg">
              <div className="col-span-2 flex items-center gap-2 text-purple-700 font-medium">
                <Image className="h-4 w-4" />
                Сторис
              </div>
              <div>
                <Label htmlFor="storiesPlan">План</Label>
                <Input
                  id="storiesPlan"
                  type="number"
                  value={formData.storiesPlan}
                  onChange={(e) => setFormData({ ...formData, storiesPlan: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="storiesTotal">Факт</Label>
                <Input
                  id="storiesTotal"
                  type="number"
                  value={formData.storiesTotal}
                  onChange={(e) => setFormData({ ...formData, storiesTotal: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg">
              <div className="col-span-2 flex items-center gap-2 text-amber-700 font-medium">
                <MessageSquare className="h-4 w-4" />
                Мини-отзывы
              </div>
              <div>
                <Label htmlFor="miniReviewsPlan">План</Label>
                <Input
                  id="miniReviewsPlan"
                  type="number"
                  value={formData.miniReviewsPlan}
                  onChange={(e) => setFormData({ ...formData, miniReviewsPlan: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="miniReviewsTotal">Факт</Label>
                <Input
                  id="miniReviewsTotal"
                  type="number"
                  value={formData.miniReviewsTotal}
                  onChange={(e) => setFormData({ ...formData, miniReviewsTotal: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50 rounded-lg">
              <div className="col-span-2 flex items-center gap-2 text-emerald-700 font-medium">
                <Star className="h-4 w-4" />
                Большие отзывы
              </div>
              <div>
                <Label htmlFor="bigReviewsPlan">План</Label>
                <Input
                  id="bigReviewsPlan"
                  type="number"
                  value={formData.bigReviewsPlan}
                  onChange={(e) => setFormData({ ...formData, bigReviewsPlan: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="bigReviewsTotal">Факт</Label>
                <Input
                  id="bigReviewsTotal"
                  type="number"
                  value={formData.bigReviewsTotal}
                  onChange={(e) => setFormData({ ...formData, bigReviewsTotal: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Заметки</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : editingMetric ? (
                "Сохранить"
              ) : (
                "Добавить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
