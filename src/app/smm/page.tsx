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
  Settings,
  X,
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
  postsTotal: string;
  storiesTotal: string;
  miniReviewsTotal: string;
  bigReviewsTotal: string;
  notes: string;
}

interface SmmSettings {
  id?: string;
  countryId: string;
  postsPlanMonthly: number;
  storiesPlanMonthly: number;
  miniReviewsPlanMonthly: number;
  bigReviewsPlanMonthly: number;
  postsPlanDaily: number;
  storiesPlanDaily: number;
  miniReviewsPlanDaily: number;
  bigReviewsPlanDaily: number;
  country?: Country;
}

interface SmmProject {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  postsPlanMonthly: number;
  storiesPlanMonthly: number;
  miniReviewsPlanMonthly: number;
  bigReviewsPlanMonthly: number;
  postsPlanDaily: number;
  storiesPlanDaily: number;
  miniReviewsPlanDaily: number;
  bigReviewsPlanDaily: number;
}

const emptyForm: FormData = {
  date: new Date().toISOString().split("T")[0],
  countryId: "",
  postsTotal: "",
  storiesTotal: "",
  miniReviewsTotal: "",
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

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [smmSettings, setSmmSettings] = useState<SmmSettings[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const [customProjects, setCustomProjects] = useState<SmmProject[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [savingProject, setSavingProject] = useState(false);

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
    // Загружаем настройки при открытии диалога для корректного получения планов
    fetchSettings();
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        date: metric.date.split("T")[0],
        countryId: metric.country.id,
        postsTotal: metric.postsTotal.toString(),
        storiesTotal: metric.storiesTotal.toString(),
        miniReviewsTotal: metric.miniReviewsTotal.toString(),
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
      // Получаем план из настроек для выбранной страны
      const countrySettings = getSettingsForCountry(formData.countryId);
      
      const postsPlanDaily = countrySettings?.postsPlanDaily || 0;
      const storiesPlanDaily = countrySettings?.storiesPlanDaily || 0;
      const miniReviewsPlanDaily = countrySettings?.miniReviewsPlanDaily || 0;
      const bigReviewsPlanDaily = countrySettings?.bigReviewsPlanDaily || 0;
      
      const postsTotal = parseInt(formData.postsTotal) || 0;
      const storiesTotal = parseInt(formData.storiesTotal) || 0;
      const miniReviewsTotal = parseInt(formData.miniReviewsTotal) || 0;
      const bigReviewsTotal = parseInt(formData.bigReviewsTotal) || 0;

      const payload = {
        ...(editingMetric && { id: editingMetric.id }),
        date: formData.date,
        countryId: formData.countryId,
        // План берётся из настроек (дневной план)
        postsPlan: postsPlanDaily,
        postsPlanDaily,
        postsFactDaily: postsTotal,
        postsTotal,
        storiesPlan: storiesPlanDaily,
        storiesPlanDaily,
        storiesFactDaily: storiesTotal,
        storiesTotal,
        miniReviewsPlan: miniReviewsPlanDaily,
        miniReviewsPlanDaily,
        miniReviewsFactDaily: miniReviewsTotal,
        miniReviewsTotal,
        bigReviewsPlan: bigReviewsPlanDaily,
        bigReviewsPlanDaily,
        bigReviewsFactDaily: bigReviewsTotal,
        bigReviewsTotal,
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

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/smm/settings");
      if (response.ok) {
        const data = await response.json();
        setSmmSettings(data || []);
      }
    } catch (error) {
      console.error("Error fetching SMM settings:", error);
    }
  };

  const fetchCustomProjects = async () => {
    try {
      const response = await fetch("/api/smm/projects");
      if (response.ok) {
        const data = await response.json();
        setCustomProjects(data || []);
      }
    } catch (error) {
      console.error("Error fetching SMM projects:", error);
    }
  };

  const handleOpenSettingsDialog = () => {
    fetchSettings();
    fetchCustomProjects();
    setIsSettingsDialogOpen(true);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectCode.trim()) {
      alert("Введите название и код проекта");
      return;
    }
    setSavingProject(true);
    try {
      const response = await fetch("/api/smm/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          code: newProjectCode.trim().toUpperCase().replace(/\s+/g, "_"),
        }),
      });
      if (response.ok) {
        setNewProjectName("");
        setNewProjectCode("");
        await fetchCustomProjects();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка создания проекта");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Ошибка создания проекта");
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Удалить этот проект?")) return;
    try {
      const response = await fetch(`/api/smm/projects?id=${projectId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchCustomProjects();
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleSaveSettings = async (countryId: string, settings: Partial<SmmSettings>) => {
    setSavingSettings(true);
    try {
      const response = await fetch("/api/smm/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryId, ...settings }),
      });
      if (response.ok) {
        await fetchSettings();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка сохранения настроек");
      }
    } catch (error) {
      console.error("Error saving SMM settings:", error);
      alert("Ошибка сохранения настроек");
    } finally {
      setSavingSettings(false);
    }
  };

  const getSettingsForCountry = (countryId: string): SmmSettings | undefined => {
    return smmSettings.find(s => s.countryId === countryId);
  };

  const updateSettingsField = (countryId: string, field: keyof SmmSettings, value: number) => {
    setSmmSettings(prev => {
      const existing = prev.find(s => s.countryId === countryId);
      if (existing) {
        return prev.map(s => s.countryId === countryId ? { ...s, [field]: value } : s);
      } else {
        return [...prev, {
          countryId,
          postsPlanMonthly: 0,
          storiesPlanMonthly: 0,
          miniReviewsPlanMonthly: 0,
          bigReviewsPlanMonthly: 0,
          postsPlanDaily: 0,
          storiesPlanDaily: 0,
          miniReviewsPlanDaily: 0,
          bigReviewsPlanDaily: 0,
          [field]: value,
        }];
      }
    });
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
            <>
              <Button
                onClick={handleOpenSettingsDialog}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </Button>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-[#1e40af] hover:bg-[#3b82f6]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </>
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
                    <TableHead className="text-center" colSpan={2}>
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3" /> Посты
                      </div>
                    </TableHead>
                    <TableHead className="text-center" colSpan={2}>
                      <div className="flex items-center justify-center gap-1">
                        <Image className="h-3 w-3" /> Сторис
                      </div>
                    </TableHead>
                    <TableHead className="text-center" colSpan={2}>
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Мини-отзывы
                      </div>
                    </TableHead>
                    <TableHead className="text-center" colSpan={2}>
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
                    <TableHead className="text-center text-xs">План</TableHead>
                    <TableHead className="text-center text-xs">Факт</TableHead>
                    <TableHead className="text-center text-xs">План</TableHead>
                    <TableHead className="text-center text-xs">Факт</TableHead>
                    <TableHead className="text-center text-xs">План</TableHead>
                    <TableHead className="text-center text-xs">Факт</TableHead>
                    <TableHead className="text-center text-xs">План</TableHead>
                    <TableHead className="text-center text-xs">Факт</TableHead>
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
                      <TableCell className="text-center text-slate-600">{m.storiesPlanDaily || m.storiesPlan}</TableCell>
                      <TableCell className="text-center font-medium">{m.storiesFactDaily || m.storiesTotal}</TableCell>
                      <TableCell className="text-center text-slate-600">{m.miniReviewsPlanDaily || m.miniReviewsPlan}</TableCell>
                      <TableCell className="text-center font-medium">{m.miniReviewsFactDaily || m.miniReviewsTotal}</TableCell>
                      <TableCell className="text-center text-slate-600">{m.bigReviewsPlanDaily || m.bigReviewsPlan}</TableCell>
                      <TableCell className="text-center font-medium">{m.bigReviewsFactDaily || m.bigReviewsTotal}</TableCell>
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

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-[#1e40af] font-medium mb-3">
                <FileText className="h-4 w-4" />
                Посты
              </div>
              <div>
                <Label htmlFor="postsTotal">Факт (за день)</Label>
                <Input
                  id="postsTotal"
                  type="number"
                  value={formData.postsTotal}
                  onChange={(e) => setFormData({ ...formData, postsTotal: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 font-medium mb-3">
                <Image className="h-4 w-4" />
                Сторис
              </div>
              <div>
                <Label htmlFor="storiesTotal">Факт (за день)</Label>
                <Input
                  id="storiesTotal"
                  type="number"
                  value={formData.storiesTotal}
                  onChange={(e) => setFormData({ ...formData, storiesTotal: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-3">
                <MessageSquare className="h-4 w-4" />
                Мини-отзывы
              </div>
              <div>
                <Label htmlFor="miniReviewsTotal">Факт (за день)</Label>
                <Input
                  id="miniReviewsTotal"
                  type="number"
                  value={formData.miniReviewsTotal}
                  onChange={(e) => setFormData({ ...formData, miniReviewsTotal: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-3">
                <Star className="h-4 w-4" />
                Большие отзывы
              </div>
              <div>
                <Label htmlFor="bigReviewsTotal">Факт (за день)</Label>
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

      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Настройки SMM планов по проектам
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Секция добавления сторонних проектов */}
            <div className="border-2 border-dashed border-[#3b82f6] rounded-lg p-4 bg-blue-50">
              <h3 className="text-lg font-semibold text-[#1e40af] mb-4">
                Добавить сторонний проект
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Добавьте проекты, которые не связаны со странами (каналы, партнёры и т.д.)
              </p>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Название проекта</Label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Например: Telegram канал"
                  />
                </div>
                <div className="w-32">
                  <Label className="text-xs text-slate-500">Код</Label>
                  <Input
                    value={newProjectCode}
                    onChange={(e) => setNewProjectCode(e.target.value.toUpperCase())}
                    placeholder="TG_CH"
                  />
                </div>
                <Button
                  onClick={handleCreateProject}
                  disabled={savingProject}
                  className="bg-[#1e40af] hover:bg-[#3b82f6]"
                >
                  {savingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              {customProjects.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-xs text-slate-500">Созданные проекты:</Label>
                  <div className="flex flex-wrap gap-2">
                    {customProjects.map((project) => (
                      <div key={project.id} className="flex items-center gap-2 bg-white border rounded-full px-3 py-1">
                        <span className="text-sm font-medium">{project.name}</span>
                        <span className="text-xs text-slate-400">({project.code})</span>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-400 hover:text-red-600 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Настройки стран */}
            {countries.map((country) => {
              const settings = getSettingsForCountry(country.id);
              return (
                <div key={country.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#1e40af] mb-4">
                    {getCountryNameRu(country.name)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-600">Месячный план</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const currentSettings = getSettingsForCountry(country.id);
                            const daily = {
                              posts: currentSettings?.postsPlanDaily || 0,
                              stories: currentSettings?.storiesPlanDaily || 0,
                              miniReviews: currentSettings?.miniReviewsPlanDaily || 0,
                              bigReviews: currentSettings?.bigReviewsPlanDaily || 0,
                            };
                            updateSettingsField(country.id, "postsPlanMonthly", daily.posts * 30);
                            updateSettingsField(country.id, "storiesPlanMonthly", daily.stories * 30);
                            updateSettingsField(country.id, "miniReviewsPlanMonthly", daily.miniReviews * 30);
                            updateSettingsField(country.id, "bigReviewsPlanMonthly", daily.bigReviews * 30);
                          }}
                          className="text-xs"
                        >
                          Рассчитать x30
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-500">Посты</Label>
                          <Input
                            type="number"
                            value={settings?.postsPlanMonthly || ""}
                            onChange={(e) => updateSettingsField(country.id, "postsPlanMonthly", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Сторис</Label>
                          <Input
                            type="number"
                            value={settings?.storiesPlanMonthly || ""}
                            onChange={(e) => updateSettingsField(country.id, "storiesPlanMonthly", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Мини-отзывы</Label>
                          <Input
                            type="number"
                            value={settings?.miniReviewsPlanMonthly || ""}
                            onChange={(e) => updateSettingsField(country.id, "miniReviewsPlanMonthly", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Большие отзывы</Label>
                          <Input
                            type="number"
                            value={settings?.bigReviewsPlanMonthly || ""}
                            onChange={(e) => updateSettingsField(country.id, "bigReviewsPlanMonthly", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-600">Дневной план</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-500">Посты</Label>
                          <Input
                            type="number"
                            value={settings?.postsPlanDaily || ""}
                            onChange={(e) => updateSettingsField(country.id, "postsPlanDaily", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Сторис</Label>
                          <Input
                            type="number"
                            value={settings?.storiesPlanDaily || ""}
                            onChange={(e) => updateSettingsField(country.id, "storiesPlanDaily", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Мини-отзывы</Label>
                          <Input
                            type="number"
                            value={settings?.miniReviewsPlanDaily || ""}
                            onChange={(e) => updateSettingsField(country.id, "miniReviewsPlanDaily", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Большие отзывы</Label>
                          <Input
                            type="number"
                            value={settings?.bigReviewsPlanDaily || ""}
                            onChange={(e) => updateSettingsField(country.id, "bigReviewsPlanDaily", parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        const currentSettings = getSettingsForCountry(country.id);
                        handleSaveSettings(country.id, {
                          postsPlanMonthly: currentSettings?.postsPlanMonthly || 0,
                          storiesPlanMonthly: currentSettings?.storiesPlanMonthly || 0,
                          miniReviewsPlanMonthly: currentSettings?.miniReviewsPlanMonthly || 0,
                          bigReviewsPlanMonthly: currentSettings?.bigReviewsPlanMonthly || 0,
                          postsPlanDaily: currentSettings?.postsPlanDaily || 0,
                          storiesPlanDaily: currentSettings?.storiesPlanDaily || 0,
                          miniReviewsPlanDaily: currentSettings?.miniReviewsPlanDaily || 0,
                          bigReviewsPlanDaily: currentSettings?.bigReviewsPlanDaily || 0,
                        });
                      }}
                      disabled={savingSettings}
                      className="bg-[#1e40af] hover:bg-[#3b82f6]"
                    >
                      {savingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Сохранение...
                        </>
                      ) : (
                        "Сохранить"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
