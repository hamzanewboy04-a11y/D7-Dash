"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2, Play, Pause, Ban, Loader2, Check, RefreshCw, Target, Users, Shield, Edit, Key } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  isActive: boolean;
  status: string;
  _count?: {
    dailyMetrics: number;
    employees: number;
  };
}

interface User {
  id: string;
  username: string;
  role: string;
  email: string | null;
  mustChangePassword: boolean;
  allowedSections: string[];
  createdAt: string;
}

interface Priemka {
  id: string;
  name: string;
  code: string;
  commissionRate: number;
  description: string | null;
  countryId: string | null;
  country?: { id: string; name: string; code: string } | null;
  isActive: boolean;
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

interface SmmPlanPeriod {
  id: string;
  projectId: string;
  startDate: string;
  endDate: string;
  postsPlan: number;
  storiesPlan: number;
  miniReviewsPlan: number;
  bigReviewsPlan: number;
  createdAt: string;
  updatedAt: string;
}

const ALL_SECTIONS = [
  { id: "dashboard", name: "Дашборд" },
  { id: "countries", name: "Страны" },
  { id: "buying", name: "Баинг" },
  { id: "cabinets", name: "Кабинеты" },
  { id: "smm", name: "SMM" },
  { id: "finance", name: "Финансы" },
  { id: "payroll", name: "ФОТ" },
  { id: "import", name: "Импорт" },
  { id: "data-entry", name: "Ввод данных" },
  { id: "analytics", name: "Аналитика" },
  { id: "settings", name: "Настройки" },
  { id: "help", name: "Справка" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Agency fees
    trustAgencyFee: "9",
    crossgifAgencyFee: "8",
    fbmAgencyFee: "8",
    priemkaCommission: "15",

    // Payroll rates
    buyerRate: "12",
    rdHandlerRate: "4",
    headDesignerFixed: "10",
    contentFixedRate: "15",
    designerFixedRate: "20",
    reviewerFixedRate: "10",
    fdTier1Rate: "3",
    fdTier2Rate: "4",
    fdTier3Rate: "5",
    fdBonusThreshold: "5",
    fdBonus: "15",
    fdMultiplier: "1.2",

    // Currency exchange rates (USDT to local)
    exchangeRateSOL: "3.65",
    exchangeRateEUR: "0.92",
    exchangeRateARS: "1050",
    exchangeRateCLP: "950",
    autoUpdateRates: "false",

    // Payment settings
    defaultBufferDays: "7",
    paymentDay1: "5",
    paymentDay2: "20",
    minPaymentAmount: "50",

    // Limits and thresholds
    lowBalanceThreshold: "100",
    highSpendThreshold: "5000",
    negativeROIThreshold: "-20",
    fdCountMax: "100",

    // Additional commissions
    contentCreationFee: "0",
    designServiceFee: "0",
    reviewServiceFee: "0",

    // Notifications
    enableEmailNotifications: "false",
    enableTelegramNotifications: "false",
    notifyLowBalance: "true",
    notifyHighSpend: "true",
    notifyNegativeROI: "true",
    telegramBotToken: "",
    telegramChatId: "",
    notificationEmail: "",

    // System
    filterZeroSpend: "true",
    defaultCurrency: "USDT",
    dateFormat: "DD.MM.YYYY",
  });

  const [goalSettings, setGoalSettings] = useState({
    dailyProfitGoal: "500",
    monthlyProfitGoal: "10000",
    targetROI: "50",
    milestone1Amount: "1000",
    milestone2Amount: "5000",
    milestone3Amount: "10000",
    weekInProfitDays: "7",
    monthOfStabilityDays: "30",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [priemkas, setPriemkas] = useState<Priemka[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [savedGoals, setSavedGoals] = useState(false);
  const [newCountry, setNewCountry] = useState({ name: "", code: "", currency: "USDT" });
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "viewer", email: "", allowedSections: [] as string[] });
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editAllowedSections, setEditAllowedSections] = useState<string[]>([]);
  const [newPriemka, setNewPriemka] = useState({ name: "", code: "", commissionRate: "15", description: "", countryId: "" });
  const [showAddPriemka, setShowAddPriemka] = useState(false);
  const [editingPriemka, setEditingPriemka] = useState<Priemka | null>(null);
  const [smmProjects, setSmmProjects] = useState<SmmProject[]>([]);
  const [newSmmProject, setNewSmmProject] = useState({
    name: "", code: "", description: "",
    postsPlanMonthly: "0", storiesPlanMonthly: "0", miniReviewsPlanMonthly: "0", bigReviewsPlanMonthly: "0",
    postsPlanDaily: "0", storiesPlanDaily: "0", miniReviewsPlanDaily: "0", bigReviewsPlanDaily: "0"
  });
  const [showAddSmmProject, setShowAddSmmProject] = useState(false);
  const [editingSmmProject, setEditingSmmProject] = useState<SmmProject | null>(null);
  const [planPeriods, setPlanPeriods] = useState<Record<string, SmmPlanPeriod[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showAddPeriodFor, setShowAddPeriodFor] = useState<string | null>(null);
  const [newPeriod, setNewPeriod] = useState({ startDate: "", endDate: "", postsPlan: "0", storiesPlan: "0", miniReviewsPlan: "0", bigReviewsPlan: "0" });
  const [editingPeriod, setEditingPeriod] = useState<SmmPlanPeriod | null>(null);
  const { isAdmin } = useAuth();

  // Load settings from API
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, []);

  // Load countries from API
  const loadCountries = useCallback(async () => {
    try {
      const res = await fetch("/api/countries?includeInactive=true");
      if (res.ok) {
        const data = await res.json();
        setCountries(data);
      }
    } catch (error) {
      console.error("Error loading countries:", error);
    }
  }, []);

  // Load goal settings from API
  const loadGoalSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/goals");
      if (res.ok) {
        const data = await res.json();
        setGoalSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Error loading goal settings:", error);
    }
  }, []);

  // Load users from API
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, [isAdmin]);

  // Load priemkas from API
  const loadPriemkas = useCallback(async () => {
    try {
      const res = await fetch("/api/priemka");
      if (res.ok) {
        const data = await res.json();
        setPriemkas(data);
      }
    } catch (error) {
      console.error("Error loading priemkas:", error);
    }
  }, []);

  // Load SMM projects from API
  const loadSmmProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/smm/projects?includeInactive=true");
      if (res.ok) {
        const data = await res.json();
        setSmmProjects(data);
      }
    } catch (error) {
      console.error("Error loading SMM projects:", error);
    }
  }, []);

  const loadPlanPeriods = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/smm/plan-periods?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setPlanPeriods(prev => ({ ...prev, [projectId]: data }));
      }
    } catch (error) {
      console.error("Error loading plan periods:", error);
    }
  }, []);

  const handleAddPlanPeriod = async (projectId: string) => {
    if (!newPeriod.startDate || !newPeriod.endDate) {
      alert("Даты начала и окончания обязательны");
      return;
    }

    if (new Date(newPeriod.endDate) < new Date(newPeriod.startDate)) {
      alert("Дата окончания должна быть >= дата начала");
      return;
    }

    try {
      const res = await fetch("/api/smm/plan-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...newPeriod }),
      });

      if (res.ok) {
        await loadPlanPeriods(projectId);
        setNewPeriod({ startDate: "", endDate: "", postsPlan: "0", storiesPlan: "0", miniReviewsPlan: "0", bigReviewsPlan: "0" });
        setShowAddPeriodFor(null);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка добавления периода");
      }
    } catch (error) {
      console.error("Error adding plan period:", error);
    }
  };

  const handleUpdatePlanPeriod = async (period: SmmPlanPeriod) => {
    if (new Date(period.endDate) < new Date(period.startDate)) {
      alert("Дата окончания должна быть >= дата начала");
      return;
    }

    try {
      const res = await fetch("/api/smm/plan-periods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(period),
      });

      if (res.ok) {
        await loadPlanPeriods(period.projectId);
        setEditingPeriod(null);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка обновления периода");
      }
    } catch (error) {
      console.error("Error updating plan period:", error);
    }
  };

  const handleDeletePlanPeriod = async (period: SmmPlanPeriod) => {
    if (!confirm("Вы уверены, что хотите удалить этот период?")) {
      return;
    }

    try {
      const res = await fetch(`/api/smm/plan-periods?id=${period.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadPlanPeriods(period.projectId);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка удаления периода");
      }
    } catch (error) {
      console.error("Error deleting plan period:", error);
    }
  };

  const toggleProjectExpanded = async (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
        if (!planPeriods[projectId]) {
          loadPlanPeriods(projectId);
        }
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU");
  };

  useEffect(() => {
    Promise.all([loadSettings(), loadCountries(), loadGoalSettings(), loadUsers(), loadPriemkas(), loadSmmProjects()]).finally(() => setLoading(false));
  }, [loadSettings, loadCountries, loadGoalSettings, loadUsers, loadPriemkas, loadSmmProjects]);

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleGoalSettingChange = (key: string, value: string) => {
    setGoalSettings((prev) => ({ ...prev, [key]: value }));
    setSavedGoals(false);
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    try {
      const res = await fetch("/api/settings/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goalSettings),
      });

      if (res.ok) {
        setSavedGoals(true);
        setTimeout(() => setSavedGoals(false), 3000);
      } else {
        alert("Ошибка сохранения настроек целей");
      }
    } catch (error) {
      console.error("Error saving goal settings:", error);
      alert("Ошибка сохранения настроек целей");
    } finally {
      setSavingGoals(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Ошибка сохранения настроек");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  const handleCountryStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/countries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        await loadCountries();
      }
    } catch (error) {
      console.error("Error updating country:", error);
    }
  };

  const handleAddCountry = async () => {
    if (!newCountry.name || !newCountry.code) {
      alert("Название и код обязательны");
      return;
    }

    try {
      const res = await fetch("/api/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCountry),
      });

      if (res.ok) {
        await loadCountries();
        setNewCountry({ name: "", code: "", currency: "USDT" });
        setShowAddCountry(false);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка добавления страны");
      }
    } catch (error) {
      console.error("Error adding country:", error);
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту страну?")) {
      return;
    }

    try {
      const res = await fetch(`/api/countries?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadCountries();
      }
    } catch (error) {
      console.error("Error deleting country:", error);
    }
  };

  // Priemka CRUD functions
  const handleAddPriemka = async () => {
    if (!newPriemka.name || !newPriemka.code) {
      alert("Название и код обязательны");
      return;
    }

    try {
      const res = await fetch("/api/priemka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPriemka),
      });

      if (res.ok) {
        await loadPriemkas();
        setNewPriemka({ name: "", code: "", commissionRate: "15", description: "", countryId: "" });
        setShowAddPriemka(false);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка добавления приёмки");
      }
    } catch (error) {
      console.error("Error adding priemka:", error);
    }
  };

  const handleUpdatePriemka = async (priemka: Priemka) => {
    try {
      const res = await fetch("/api/priemka", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(priemka),
      });

      if (res.ok) {
        await loadPriemkas();
        setEditingPriemka(null);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка обновления приёмки");
      }
    } catch (error) {
      console.error("Error updating priemka:", error);
    }
  };

  const handleDeletePriemka = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту приёмку? Все связанные записи также будут удалены.")) {
      return;
    }

    try {
      const res = await fetch(`/api/priemka?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadPriemkas();
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка удаления приёмки");
      }
    } catch (error) {
      console.error("Error deleting priemka:", error);
    }
  };

  const handleTogglePriemkaActive = async (priemka: Priemka) => {
    await handleUpdatePriemka({ ...priemka, isActive: !priemka.isActive });
  };

  // SMM Projects CRUD functions
  const handleAddSmmProject = async () => {
    if (!newSmmProject.name || !newSmmProject.code) {
      alert("Название и код обязательны");
      return;
    }

    try {
      const res = await fetch("/api/smm/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSmmProject),
      });

      if (res.ok) {
        await loadSmmProjects();
        setNewSmmProject({
          name: "", code: "", description: "",
          postsPlanMonthly: "0", storiesPlanMonthly: "0", miniReviewsPlanMonthly: "0", bigReviewsPlanMonthly: "0",
          postsPlanDaily: "0", storiesPlanDaily: "0", miniReviewsPlanDaily: "0", bigReviewsPlanDaily: "0"
        });
        setShowAddSmmProject(false);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка добавления SMM проекта");
      }
    } catch (error) {
      console.error("Error adding SMM project:", error);
    }
  };

  const handleUpdateSmmProject = async (project: SmmProject) => {
    try {
      const res = await fetch("/api/smm/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });

      if (res.ok) {
        await loadSmmProjects();
        setEditingSmmProject(null);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка обновления SMM проекта");
      }
    } catch (error) {
      console.error("Error updating SMM project:", error);
    }
  };

  const handleDeleteSmmProject = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот SMM проект? Все связанные метрики также будут удалены.")) {
      return;
    }

    try {
      const res = await fetch(`/api/smm/projects?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadSmmProjects();
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка удаления SMM проекта");
      }
    } catch (error) {
      console.error("Error deleting SMM project:", error);
    }
  };

  const handleToggleSmmProjectActive = async (project: SmmProject) => {
    await handleUpdateSmmProject({ ...project, isActive: !project.isActive });
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert("Имя пользователя и пароль обязательны");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        await loadUsers();
        setNewUser({ username: "", password: "", role: "viewer", email: "", allowedSections: [] });
        setShowAddUser(false);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка добавления пользователя");
      }
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const toggleNewUserSection = (sectionId: string) => {
    setNewUser(prev => ({
      ...prev,
      allowedSections: prev.allowedSections.includes(sectionId)
        ? prev.allowedSections.filter(s => s !== sectionId)
        : [...prev.allowedSections, sectionId]
    }));
  };

  const toggleEditSection = (sectionId: string) => {
    setEditAllowedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (editRole) updateData.role = editRole;
      if (editPassword) updateData.password = editPassword;
      updateData.allowedSections = editAllowedSections;

      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, ...updateData }),
      });

      if (res.ok) {
        await loadUsers();
        setEditingUser(null);
        setEditPassword("");
        setEditRole("");
        setEditAllowedSections([]);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка обновления пользователя");
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка удаления пользователя");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "editor":
        return "bg-blue-100 text-blue-700";
      case "viewer":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Администратор";
      case "editor":
        return "Редактор";
      case "viewer":
        return "Просмотр";
      default:
        return role;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="h-4 w-4 text-green-500" />;
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case "disabled":
        return <Ban className="h-4 w-4 text-red-500" />;
      default:
        return <Play className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Активен";
      case "paused":
        return "На паузе";
      case "disabled":
        return "Отключен";
      default:
        return "Активен";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "disabled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
          <p className="text-slate-500 mt-1">
            Настройка ставок расчётов и системных параметров
          </p>
        </div>
        <Button variant="outline" onClick={() => Promise.all([loadSettings(), loadCountries(), loadGoalSettings()])}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <Tabs defaultValue="rates">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
          <TabsTrigger value="rates" className="px-3 py-1.5">Комиссии</TabsTrigger>
          <TabsTrigger value="currency" className="px-3 py-1.5">Валюты</TabsTrigger>
          <TabsTrigger value="payments" className="px-3 py-1.5">Выплаты</TabsTrigger>
          <TabsTrigger value="limits" className="px-3 py-1.5">Лимиты</TabsTrigger>
          <TabsTrigger value="notifications" className="px-3 py-1.5">Уведомления</TabsTrigger>
          <TabsTrigger value="countries" className="px-3 py-1.5">Проекты</TabsTrigger>
          <TabsTrigger value="goals" className="px-3 py-1.5">Цели</TabsTrigger>
          {isAdmin && <TabsTrigger value="users" className="px-3 py-1.5">Пользователи</TabsTrigger>}
          <TabsTrigger value="system" className="px-3 py-1.5">Система</TabsTrigger>
          <TabsTrigger value="priemkas" className="px-3 py-1.5">Приёмки</TabsTrigger>
          <TabsTrigger value="smm-projects" className="px-3 py-1.5">SMM Проекты</TabsTrigger>
        </TabsList>

        {/* Commission Rates */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Комиссии рекламных агентств</CardTitle>
              <CardDescription>
                Проценты комиссий агентств для каждого типа кабинета
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trustAgencyFee">TRUST комиссия (%)</Label>
                  <Input
                    id="trustAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.trustAgencyFee}
                    onChange={(e) => handleSettingChange("trustAgencyFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crossgifAgencyFee">CROSSGIF комиссия (%)</Label>
                  <Input
                    id="crossgifAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.crossgifAgencyFee}
                    onChange={(e) => handleSettingChange("crossgifAgencyFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fbmAgencyFee">FBM комиссия (%)</Label>
                  <Input
                    id="fbmAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.fbmAgencyFee}
                    onChange={(e) => handleSettingChange("fbmAgencyFee", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Currency Exchange Rates */}
        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Валютные курсы</CardTitle>
              <CardDescription>
                Курсы обмена локальных валют к USDT для автоматического пересчета
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateSOL">SOL → USDT</Label>
                  <Input
                    id="exchangeRateSOL"
                    type="number"
                    step="0.01"
                    value={settings.exchangeRateSOL}
                    onChange={(e) => handleSettingChange("exchangeRateSOL", e.target.value)}
                    placeholder="3.65"
                  />
                  <p className="text-xs text-slate-500">1 SOL = X USDT</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateEUR">EUR → USDT</Label>
                  <Input
                    id="exchangeRateEUR"
                    type="number"
                    step="0.01"
                    value={settings.exchangeRateEUR}
                    onChange={(e) => handleSettingChange("exchangeRateEUR", e.target.value)}
                    placeholder="0.92"
                  />
                  <p className="text-xs text-slate-500">1 EUR = X USDT</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateARS">ARS → USDT</Label>
                  <Input
                    id="exchangeRateARS"
                    type="number"
                    step="1"
                    value={settings.exchangeRateARS}
                    onChange={(e) => handleSettingChange("exchangeRateARS", e.target.value)}
                    placeholder="1050"
                  />
                  <p className="text-xs text-slate-500">1 ARS = X USDT (пример: 1050 ARS = 1 USDT)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateCLP">CLP → USDT</Label>
                  <Input
                    id="exchangeRateCLP"
                    type="number"
                    step="1"
                    value={settings.exchangeRateCLP}
                    onChange={(e) => handleSettingChange("exchangeRateCLP", e.target.value)}
                    placeholder="950"
                  />
                  <p className="text-xs text-slate-500">1 CLP = X USDT (пример: 950 CLP = 1 USDT)</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Автообновление курсов</p>
                  <p className="text-sm text-slate-500">
                    Автоматически обновлять курсы валют из внешних API (пока не реализовано)
                  </p>
                </div>
                <Button
                  variant={settings.autoUpdateRates === "true" ? "default" : "outline"}
                  onClick={() => handleSettingChange("autoUpdateRates", settings.autoUpdateRates === "true" ? "false" : "true")}
                >
                  {settings.autoUpdateRates === "true" ? "Включено" : "Выключено"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки выплат сотрудникам</CardTitle>
              <CardDescription>
                Сроки, периоды и условия выплат
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultBufferDays">Буфер по умолчанию (дней)</Label>
                  <Input
                    id="defaultBufferDays"
                    type="number"
                    value={settings.defaultBufferDays}
                    onChange={(e) => handleSettingChange("defaultBufferDays", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Количество дней до выплаты</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDay1">День выплаты 1</Label>
                  <Input
                    id="paymentDay1"
                    type="number"
                    min="1"
                    max="28"
                    value={settings.paymentDay1}
                    onChange={(e) => handleSettingChange("paymentDay1", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Первый день месяца для выплат</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDay2">День выплаты 2</Label>
                  <Input
                    id="paymentDay2"
                    type="number"
                    min="1"
                    max="28"
                    value={settings.paymentDay2}
                    onChange={(e) => handleSettingChange("paymentDay2", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Второй день месяца для выплат</p>
                </div>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="minPaymentAmount">Минимальная сумма выплаты ($)</Label>
                <Input
                  id="minPaymentAmount"
                  type="number"
                  step="10"
                  value={settings.minPaymentAmount}
                  onChange={(e) => handleSettingChange("minPaymentAmount", e.target.value)}
                />
                <p className="text-xs text-slate-500">Минимальная сумма для инициации выплаты</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Дополнительные комиссии</CardTitle>
              <CardDescription>
                Комиссии за дополнительные услуги
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentCreationFee">Комиссия за контент (%)</Label>
                  <Input
                    id="contentCreationFee"
                    type="number"
                    step="0.1"
                    value={settings.contentCreationFee}
                    onChange={(e) => handleSettingChange("contentCreationFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designServiceFee">Комиссия за дизайн (%)</Label>
                  <Input
                    id="designServiceFee"
                    type="number"
                    step="0.1"
                    value={settings.designServiceFee}
                    onChange={(e) => handleSettingChange("designServiceFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewServiceFee">Комиссия за отзывы (%)</Label>
                  <Input
                    id="reviewServiceFee"
                    type="number"
                    step="0.1"
                    value={settings.reviewServiceFee}
                    onChange={(e) => handleSettingChange("reviewServiceFee", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits and Alerts */}
        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Лимиты и пороги</CardTitle>
              <CardDescription>
                Настройка пороговых значений для алертов и автоматических действий
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowBalanceThreshold">Порог низкого баланса ($)</Label>
                  <Input
                    id="lowBalanceThreshold"
                    type="number"
                    step="10"
                    value={settings.lowBalanceThreshold}
                    onChange={(e) => handleSettingChange("lowBalanceThreshold", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Уведомление при балансе ниже этой суммы</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highSpendThreshold">Порог высокого спенда ($)</Label>
                  <Input
                    id="highSpendThreshold"
                    type="number"
                    step="100"
                    value={settings.highSpendThreshold}
                    onChange={(e) => handleSettingChange("highSpendThreshold", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Уведомление при спенде выше этой суммы</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="negativeROIThreshold">Порог отрицательного ROI (%)</Label>
                  <Input
                    id="negativeROIThreshold"
                    type="number"
                    step="5"
                    value={settings.negativeROIThreshold}
                    onChange={(e) => handleSettingChange("negativeROIThreshold", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Уведомление при ROI ниже этого значения</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdCountMax">Максимум ФД в день</Label>
                  <Input
                    id="fdCountMax"
                    type="number"
                    value={settings.fdCountMax}
                    onChange={(e) => handleSettingChange("fdCountMax", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Предупреждение при превышении количества ФД</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>
                Настройка email и Telegram уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Email уведомления</p>
                    <p className="text-sm text-slate-500">Отправлять уведомления на email</p>
                  </div>
                  <Button
                    variant={settings.enableEmailNotifications === "true" ? "default" : "outline"}
                    onClick={() => handleSettingChange("enableEmailNotifications", settings.enableEmailNotifications === "true" ? "false" : "true")}
                  >
                    {settings.enableEmailNotifications === "true" ? "Включено" : "Выключено"}
                  </Button>
                </div>

                {settings.enableEmailNotifications === "true" && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="notificationEmail">Email для уведомлений</Label>
                    <Input
                      id="notificationEmail"
                      type="email"
                      value={settings.notificationEmail}
                      onChange={(e) => handleSettingChange("notificationEmail", e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Telegram уведомления</p>
                    <p className="text-sm text-slate-500">Отправлять уведомления в Telegram</p>
                  </div>
                  <Button
                    variant={settings.enableTelegramNotifications === "true" ? "default" : "outline"}
                    onClick={() => handleSettingChange("enableTelegramNotifications", settings.enableTelegramNotifications === "true" ? "false" : "true")}
                  >
                    {settings.enableTelegramNotifications === "true" ? "Включено" : "Выключено"}
                  </Button>
                </div>

                {settings.enableTelegramNotifications === "true" && (
                  <div className="space-y-4 ml-4">
                    <div className="space-y-2">
                      <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                      <Input
                        id="telegramBotToken"
                        type="password"
                        value={settings.telegramBotToken}
                        onChange={(e) => handleSettingChange("telegramBotToken", e.target.value)}
                        placeholder="123456:ABC-DEF..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                      <Input
                        id="telegramChatId"
                        value={settings.telegramChatId}
                        onChange={(e) => handleSettingChange("telegramChatId", e.target.value)}
                        placeholder="-1001234567890"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="font-medium">Типы уведомлений</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">Низкий баланс</p>
                      <p className="text-xs text-slate-500">Уведомлять при низком балансе</p>
                    </div>
                    <Button
                      size="sm"
                      variant={settings.notifyLowBalance === "true" ? "default" : "outline"}
                      onClick={() => handleSettingChange("notifyLowBalance", settings.notifyLowBalance === "true" ? "false" : "true")}
                    >
                      {settings.notifyLowBalance === "true" ? "Вкл" : "Выкл"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">Высокий спенд</p>
                      <p className="text-xs text-slate-500">Уведомлять при превышении порога спенда</p>
                    </div>
                    <Button
                      size="sm"
                      variant={settings.notifyHighSpend === "true" ? "default" : "outline"}
                      onClick={() => handleSettingChange("notifyHighSpend", settings.notifyHighSpend === "true" ? "false" : "true")}
                    >
                      {settings.notifyHighSpend === "true" ? "Вкл" : "Выкл"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">Отрицательный ROI</p>
                      <p className="text-xs text-slate-500">Уведомлять при отрицательном ROI</p>
                    </div>
                    <Button
                      size="sm"
                      variant={settings.notifyNegativeROI === "true" ? "default" : "outline"}
                      onClick={() => handleSettingChange("notifyNegativeROI", settings.notifyNegativeROI === "true" ? "false" : "true")}
                    >
                      {settings.notifyNegativeROI === "true" ? "Вкл" : "Выкл"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Countries / Projects */}
        <TabsContent value="countries" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Проекты (Страны)</CardTitle>
                <CardDescription>
                  Управление проектами, их статусами и валютами
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddCountry(!showAddCountry)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить проект
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add country form */}
              {showAddCountry && (
                <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                  <h3 className="font-medium">Новый проект</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input
                        placeholder="Перу"
                        value={newCountry.name}
                        onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Код</Label>
                      <Input
                        placeholder="PE"
                        value={newCountry.code}
                        onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Валюта</Label>
                      <Input
                        placeholder="SOL"
                        value={newCountry.currency}
                        onChange={(e) => setNewCountry({ ...newCountry, currency: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCountry}>Добавить</Button>
                    <Button variant="outline" onClick={() => setShowAddCountry(false)}>Отмена</Button>
                  </div>
                </div>
              )}

              {/* Countries list */}
              <div className="space-y-3">
                {countries.map((country) => (
                  <div
                    key={country.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      country.status === "disabled" ? "bg-slate-100 opacity-60" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(country.status)}`}>
                        {getStatusIcon(country.status)}
                      </div>
                      <div>
                        <p className="font-medium">{country.name}</p>
                        <p className="text-sm text-slate-500">
                          Код: {country.code} | Валюта: {country.currency}
                          {country._count && ` | ${country._count.dailyMetrics} записей`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(country.status)}`}>
                        {getStatusLabel(country.status)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={country.status === "active" ? "text-green-500" : "text-slate-400"}
                          onClick={() => handleCountryStatusChange(country.id, "active")}
                          title="Активировать"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={country.status === "paused" ? "text-yellow-500" : "text-slate-400"}
                          onClick={() => handleCountryStatusChange(country.id, "paused")}
                          title="Поставить на паузу"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={country.status === "disabled" ? "text-red-500" : "text-slate-400"}
                          onClick={() => handleCountryStatusChange(country.id, "disabled")}
                          title="Отключить"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteCountry(country.id)}
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {countries.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  Нет проектов. Добавьте первый проект.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals & Achievements */}
        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Цели прибыли
              </CardTitle>
              <CardDescription>
                Настройка дневных и месячных целей прибыли
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyProfitGoal">Дневная цель ($)</Label>
                  <Input
                    id="dailyProfitGoal"
                    type="number"
                    step="50"
                    value={goalSettings.dailyProfitGoal}
                    onChange={(e) => handleGoalSettingChange("dailyProfitGoal", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Цель по прибыли за день</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyProfitGoal">Месячная цель ($)</Label>
                  <Input
                    id="monthlyProfitGoal"
                    type="number"
                    step="500"
                    value={goalSettings.monthlyProfitGoal}
                    onChange={(e) => handleGoalSettingChange("monthlyProfitGoal", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Цель по прибыли за месяц</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetROI">Целевой ROI (%)</Label>
                  <Input
                    id="targetROI"
                    type="number"
                    step="5"
                    value={goalSettings.targetROI}
                    onChange={(e) => handleGoalSettingChange("targetROI", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Целевой показатель ROI</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestones прибыли</CardTitle>
              <CardDescription>
                Пороговые значения для достижений по прибыли
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="milestone1Amount">Первый milestone ($)</Label>
                  <Input
                    id="milestone1Amount"
                    type="number"
                    step="100"
                    value={goalSettings.milestone1Amount}
                    onChange={(e) => handleGoalSettingChange("milestone1Amount", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">&quot;Первые $X&quot;</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="milestone2Amount">Второй milestone ($)</Label>
                  <Input
                    id="milestone2Amount"
                    type="number"
                    step="500"
                    value={goalSettings.milestone2Amount}
                    onChange={(e) => handleGoalSettingChange("milestone2Amount", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">&quot;Серьёзный игрок&quot;</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="milestone3Amount">Мастер milestone ($)</Label>
                  <Input
                    id="milestone3Amount"
                    type="number"
                    step="1000"
                    value={goalSettings.milestone3Amount}
                    onChange={(e) => handleGoalSettingChange("milestone3Amount", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">&quot;Мастер прибыли&quot;</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Серии дней</CardTitle>
              <CardDescription>
                Количество дней для достижений по стабильности
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekInProfitDays">Неделя в плюсе (дней)</Label>
                  <Input
                    id="weekInProfitDays"
                    type="number"
                    min="1"
                    max="14"
                    value={goalSettings.weekInProfitDays}
                    onChange={(e) => handleGoalSettingChange("weekInProfitDays", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Дней подряд для достижения &quot;Неделя в плюсе&quot;</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthOfStabilityDays">Месяц стабильности (дней)</Label>
                  <Input
                    id="monthOfStabilityDays"
                    type="number"
                    min="1"
                    max="60"
                    value={goalSettings.monthOfStabilityDays}
                    onChange={(e) => handleGoalSettingChange("monthOfStabilityDays", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Дней подряд для достижения &quot;Стабильность&quot;</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSaveGoals}
            className="w-full"
            size="lg"
            disabled={savingGoals}
          >
            {savingGoals ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : savedGoals ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {savingGoals ? "Сохранение..." : savedGoals ? "Сохранено!" : "Сохранить настройки целей"}
          </Button>
        </TabsContent>

        {/* Users Management */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Управление пользователями
                  </CardTitle>
                  <CardDescription>
                    Добавление, редактирование и удаление пользователей системы
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddUser(!showAddUser)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить пользователя
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showAddUser && (
                  <div className="p-4 bg-slate-50 rounded-lg border space-y-4">
                    <h4 className="font-medium">Новый пользователь</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newUsername">Имя пользователя *</Label>
                        <Input
                          id="newUsername"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          placeholder="имя_пользователя"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Пароль *</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newRole">Роль</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Администратор</SelectItem>
                            <SelectItem value="editor">Редактор</SelectItem>
                            <SelectItem value="viewer">Просмотр</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">Email (необязательно)</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Доступные разделы</Label>
                      <p className="text-xs text-slate-500 mb-2">
                        Если не выбрано ничего — доступны все разделы. Для ограничения доступа выберите нужные разделы.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {ALL_SECTIONS.map((section) => (
                          <label
                            key={section.id}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              newUser.allowedSections.includes(section.id)
                                ? "bg-blue-50 border-blue-300"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={newUser.allowedSections.includes(section.id)}
                              onChange={() => toggleNewUserSection(section.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{section.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddUser}>
                        <Plus className="h-4 w-4 mr-2" />
                        Создать
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddUser(false)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${getRoleBadgeColor(user.role)}`}>
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {user.username}
                            {user.mustChangePassword && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                Сменить пароль
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500">
                            {user.email || "Нет email"} • Создан: {new Date(user.createdAt).toLocaleDateString("ru")}
                          </p>
                          {user.allowedSections && user.allowedSections.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Доступ: {user.allowedSections.map(s => ALL_SECTIONS.find(sec => sec.id === s)?.name || s).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingUser(user);
                              setEditRole(user.role);
                              setEditAllowedSections(user.allowedSections || []);
                            }}
                            title="Редактировать"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {editingUser?.id === user.id && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Роль</Label>
                              <Select
                                value={editRole || user.role}
                                onValueChange={setEditRole}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Администратор</SelectItem>
                                  <SelectItem value="editor">Редактор</SelectItem>
                                  <SelectItem value="viewer">Просмотр</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Новый пароль</Label>
                              <Input
                                type="password"
                                placeholder="Оставьте пустым, чтобы не менять"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Доступные разделы</Label>
                            <p className="text-xs text-slate-500 mb-2">
                              Если не выбрано ничего — доступны все разделы. Для ограничения доступа выберите нужные.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {ALL_SECTIONS.map((section) => (
                                <label
                                  key={section.id}
                                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                    editAllowedSections.includes(section.id)
                                      ? "bg-blue-50 border-blue-300"
                                      : "bg-white border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editAllowedSections.includes(section.id)}
                                    onChange={() => toggleEditSection(section.id)}
                                    className="rounded"
                                  />
                                  <span className="text-sm">{section.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateUser(user.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Сохранить
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingUser(null);
                              setEditPassword("");
                              setEditRole("");
                              setEditAllowedSections([]);
                            }}>
                              Отмена
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {users.length === 0 && (
                  <p className="text-center text-slate-500 py-8">
                    Нет пользователей. Добавьте первого пользователя.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Системные настройки</CardTitle>
              <CardDescription>
                Настройки фильтрации и отображения данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Исключать дни с нулевым спендом</p>
                  <p className="text-sm text-slate-500">
                    Дни без расходов на рекламу не учитываются в статистике (проект не работал)
                  </p>
                </div>
                <Button
                  variant={settings.filterZeroSpend === "true" ? "default" : "outline"}
                  onClick={() => handleSettingChange("filterZeroSpend", settings.filterZeroSpend === "true" ? "false" : "true")}
                >
                  {settings.filterZeroSpend === "true" ? "Включено" : "Выключено"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Priemkas Management */}
        <TabsContent value="priemkas" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Управление приёмками</CardTitle>
                  <CardDescription>
                    Настройка приёмок (платёжных процессоров) с комиссиями
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddPriemka(!showAddPriemka)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить приёмку
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddPriemka && (
                <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
                  <h4 className="font-medium">Новая приёмка</h4>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priemkaName">Название</Label>
                      <Input
                        id="priemkaName"
                        value={newPriemka.name}
                        onChange={(e) => setNewPriemka(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Например: Trust"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priemkaCode">Код</Label>
                      <Input
                        id="priemkaCode"
                        value={newPriemka.code}
                        onChange={(e) => setNewPriemka(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="TRUST"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Страна (Гео)</Label>
                      <Select
                        value={newPriemka.countryId || "none"}
                        onValueChange={(value) => setNewPriemka(prev => ({ ...prev, countryId: value === "none" ? "" : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите страну" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Все страны</SelectItem>
                          {countries.filter(c => c.isActive).map((country) => (
                            <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priemkaCommission">Комиссия (%)</Label>
                      <Input
                        id="priemkaCommission"
                        type="number"
                        step="0.1"
                        value={newPriemka.commissionRate}
                        onChange={(e) => setNewPriemka(prev => ({ ...prev, commissionRate: e.target.value }))}
                        placeholder="15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priemkaDescription">Описание</Label>
                      <Input
                        id="priemkaDescription"
                        value={newPriemka.description}
                        onChange={(e) => setNewPriemka(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание (опционально)"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddPriemka}>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPriemka(false)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              )}

              {priemkas.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Приёмки не найдены. Добавьте первую приёмку.</p>
              ) : (
                <div className="space-y-2">
                  {priemkas.map((priemka) => (
                    <div
                      key={priemka.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        priemka.isActive ? "bg-white" : "bg-slate-100 opacity-75"
                      }`}
                    >
                      {editingPriemka?.id === priemka.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <Input
                            value={editingPriemka.name}
                            onChange={(e) => setEditingPriemka({ ...editingPriemka, name: e.target.value })}
                            placeholder="Название"
                          />
                          <Input
                            value={editingPriemka.code}
                            onChange={(e) => setEditingPriemka({ ...editingPriemka, code: e.target.value.toUpperCase() })}
                            placeholder="Код"
                          />
                          <Select
                            value={editingPriemka.countryId || "none"}
                            onValueChange={(value) => setEditingPriemka({ ...editingPriemka, countryId: value === "none" ? null : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Страна" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Все страны</SelectItem>
                              {countries.filter(c => c.isActive).map((country) => (
                                <SelectItem key={country.id} value={country.id}>{country.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.1"
                            value={editingPriemka.commissionRate}
                            onChange={(e) => setEditingPriemka({ ...editingPriemka, commissionRate: parseFloat(e.target.value) || 0 })}
                            placeholder="Комиссия %"
                          />
                          <Input
                            value={editingPriemka.description || ""}
                            onChange={(e) => setEditingPriemka({ ...editingPriemka, description: e.target.value })}
                            placeholder="Описание"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdatePriemka(editingPriemka)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingPriemka(null)}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{priemka.name}</p>
                              <p className="text-sm text-slate-500">
                                Код: {priemka.code} | Гео: {priemka.country?.name || "Все страны"} | Комиссия: {priemka.commissionRate}%
                                {priemka.description && ` | ${priemka.description}`}
                              </p>
                            </div>
                            {!priemka.isActive && (
                              <span className="text-xs bg-slate-200 px-2 py-1 rounded">Неактивна</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTogglePriemkaActive(priemka)}
                            >
                              {priemka.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPriemka(priemka)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeletePriemka(priemka.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMM Projects Management */}
        <TabsContent value="smm-projects" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Управление SMM проектами</CardTitle>
                  <CardDescription>
                    Настройка SMM проектов с планами контента (посты, сторис, отзывы)
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddSmmProject(!showAddSmmProject)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить проект
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddSmmProject && (
                <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
                  <h4 className="font-medium">Новый SMM проект</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smmProjectName">Название</Label>
                      <Input
                        id="smmProjectName"
                        value={newSmmProject.name}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Например: Instagram D7"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smmProjectCode">Код</Label>
                      <Input
                        id="smmProjectCode"
                        value={newSmmProject.code}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="IG_D7"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smmProjectDescription">Описание</Label>
                      <Input
                        id="smmProjectDescription"
                        value={newSmmProject.description}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание (опционально)"
                      />
                    </div>
                  </div>
                  <Separator />
                  <h5 className="font-medium text-sm text-slate-600">Месячные планы</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postsPlanMonthly">Посты/мес</Label>
                      <Input
                        id="postsPlanMonthly"
                        type="number"
                        value={newSmmProject.postsPlanMonthly}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, postsPlanMonthly: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storiesPlanMonthly">Сторис/мес</Label>
                      <Input
                        id="storiesPlanMonthly"
                        type="number"
                        value={newSmmProject.storiesPlanMonthly}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, storiesPlanMonthly: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="miniReviewsPlanMonthly">Мини отзывы/мес</Label>
                      <Input
                        id="miniReviewsPlanMonthly"
                        type="number"
                        value={newSmmProject.miniReviewsPlanMonthly}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, miniReviewsPlanMonthly: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bigReviewsPlanMonthly">Большие отзывы/мес</Label>
                      <Input
                        id="bigReviewsPlanMonthly"
                        type="number"
                        value={newSmmProject.bigReviewsPlanMonthly}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, bigReviewsPlanMonthly: e.target.value }))}
                      />
                    </div>
                  </div>
                  <h5 className="font-medium text-sm text-slate-600">Дневные планы</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postsPlanDaily">Посты/день</Label>
                      <Input
                        id="postsPlanDaily"
                        type="number"
                        value={newSmmProject.postsPlanDaily}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, postsPlanDaily: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storiesPlanDaily">Сторис/день</Label>
                      <Input
                        id="storiesPlanDaily"
                        type="number"
                        value={newSmmProject.storiesPlanDaily}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, storiesPlanDaily: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="miniReviewsPlanDaily">Мини отзывы/день</Label>
                      <Input
                        id="miniReviewsPlanDaily"
                        type="number"
                        value={newSmmProject.miniReviewsPlanDaily}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, miniReviewsPlanDaily: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bigReviewsPlanDaily">Большие отзывы/день</Label>
                      <Input
                        id="bigReviewsPlanDaily"
                        type="number"
                        value={newSmmProject.bigReviewsPlanDaily}
                        onChange={(e) => setNewSmmProject(prev => ({ ...prev, bigReviewsPlanDaily: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSmmProject}>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddSmmProject(false)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              )}

              {smmProjects.length === 0 ? (
                <p className="text-slate-500 text-center py-8">SMM проекты не найдены. Добавьте первый проект.</p>
              ) : (
                <div className="space-y-4">
                  {smmProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`border rounded-lg p-4 ${
                        project.isActive ? "bg-white" : "bg-slate-100 opacity-75"
                      }`}
                    >
                      {editingSmmProject?.id === project.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                              value={editingSmmProject.name}
                              onChange={(e) => setEditingSmmProject({ ...editingSmmProject, name: e.target.value })}
                              placeholder="Название"
                            />
                            <Input
                              value={editingSmmProject.code}
                              onChange={(e) => setEditingSmmProject({ ...editingSmmProject, code: e.target.value.toUpperCase() })}
                              placeholder="Код"
                            />
                            <Input
                              value={editingSmmProject.description || ""}
                              onChange={(e) => setEditingSmmProject({ ...editingSmmProject, description: e.target.value })}
                              placeholder="Описание"
                            />
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Посты/мес</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.postsPlanMonthly}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, postsPlanMonthly: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Сторис/мес</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.storiesPlanMonthly}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, storiesPlanMonthly: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Мини отзывы/мес</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.miniReviewsPlanMonthly}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, miniReviewsPlanMonthly: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Большие отзывы/мес</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.bigReviewsPlanMonthly}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, bigReviewsPlanMonthly: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Посты/день</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.postsPlanDaily}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, postsPlanDaily: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Сторис/день</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.storiesPlanDaily}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, storiesPlanDaily: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Мини отзывы/день</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.miniReviewsPlanDaily}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, miniReviewsPlanDaily: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Большие отзывы/день</Label>
                              <Input
                                type="number"
                                value={editingSmmProject.bigReviewsPlanDaily}
                                onChange={(e) => setEditingSmmProject({ ...editingSmmProject, bigReviewsPlanDaily: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateSmmProject(editingSmmProject)}>
                              <Check className="h-4 w-4 mr-1" />
                              Сохранить
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSmmProject(null)}>
                              <Ban className="h-4 w-4 mr-1" />
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-lg">{project.name}</p>
                              <p className="text-sm text-slate-500">
                                Код: {project.code}
                                {project.description && ` | ${project.description}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {!project.isActive && (
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded">Неактивен</span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleSmmProjectActive(project)}
                              >
                                {project.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSmmProject(project)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteSmmProject(project.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="p-2 bg-blue-50 rounded">
                              <p className="text-slate-600 font-medium">Посты</p>
                              <p className="text-blue-700">{project.postsPlanMonthly}/мес • {project.postsPlanDaily}/день</p>
                            </div>
                            <div className="p-2 bg-purple-50 rounded">
                              <p className="text-slate-600 font-medium">Сторис</p>
                              <p className="text-purple-700">{project.storiesPlanMonthly}/мес • {project.storiesPlanDaily}/день</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded">
                              <p className="text-slate-600 font-medium">Мини отзывы</p>
                              <p className="text-green-700">{project.miniReviewsPlanMonthly}/мес • {project.miniReviewsPlanDaily}/день</p>
                            </div>
                            <div className="p-2 bg-orange-50 rounded">
                              <p className="text-slate-600 font-medium">Большие отзывы</p>
                              <p className="text-orange-700">{project.bigReviewsPlanMonthly}/мес • {project.bigReviewsPlanDaily}/день</p>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleProjectExpanded(project.id)}
                                className="text-slate-600 p-0 h-auto hover:bg-transparent"
                              >
                                <span className="font-medium">Периоды планов</span>
                                <span className="ml-2 text-xs">
                                  {expandedProjects.has(project.id) ? "▼" : "▶"}
                                </span>
                              </Button>
                              {expandedProjects.has(project.id) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setShowAddPeriodFor(project.id);
                                    setNewPeriod({ startDate: "", endDate: "", postsPlan: "0", storiesPlan: "0", miniReviewsPlan: "0", bigReviewsPlan: "0" });
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Добавить период
                                </Button>
                              )}
                            </div>

                            {expandedProjects.has(project.id) && (
                              <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                                {showAddPeriodFor === project.id && (
                                  <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                                    <h5 className="font-medium text-sm">Новый период</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs">Дата начала</Label>
                                        <Input
                                          type="date"
                                          value={newPeriod.startDate}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Дата конца</Label>
                                        <Input
                                          type="date"
                                          value={newPeriod.endDate}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Посты</Label>
                                        <Input
                                          type="number"
                                          value={newPeriod.postsPlan}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, postsPlan: e.target.value }))}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Сторис</Label>
                                        <Input
                                          type="number"
                                          value={newPeriod.storiesPlan}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, storiesPlan: e.target.value }))}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Мини-обзоры</Label>
                                        <Input
                                          type="number"
                                          value={newPeriod.miniReviewsPlan}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, miniReviewsPlan: e.target.value }))}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Большие обзоры</Label>
                                        <Input
                                          type="number"
                                          value={newPeriod.bigReviewsPlan}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, bigReviewsPlan: e.target.value }))}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleAddPlanPeriod(project.id)}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Добавить
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setShowAddPeriodFor(null)}>
                                        Отмена
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {planPeriods[project.id]?.length === 0 && (
                                  <p className="text-sm text-slate-500 italic py-2">Нет периодов планов</p>
                                )}

                                {planPeriods[project.id]?.map((period) => (
                                  <div key={period.id} className="p-3 bg-white border rounded-lg">
                                    {editingPeriod?.id === period.id ? (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          <div className="space-y-1">
                                            <Label className="text-xs">Дата начала</Label>
                                            <Input
                                              type="date"
                                              value={editingPeriod.startDate.split('T')[0]}
                                              onChange={(e) => setEditingPeriod({ ...editingPeriod, startDate: e.target.value })}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">Дата конца</Label>
                                            <Input
                                              type="date"
                                              value={editingPeriod.endDate.split('T')[0]}
                                              onChange={(e) => setEditingPeriod({ ...editingPeriod, endDate: e.target.value })}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">Посты</Label>
                                            <Input
                                              type="number"
                                              value={editingPeriod.postsPlan}
                                              onChange={(e) => setEditingPeriod({ ...editingPeriod, postsPlan: parseInt(e.target.value) || 0 })}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">Сторис</Label>
                                            <Input
                                              type="number"
                                              value={editingPeriod.storiesPlan}
                                              onChange={(e) => setEditingPeriod({ ...editingPeriod, storiesPlan: parseInt(e.target.value) || 0 })}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">Мини-обзоры</Label>
                                            <Input
                                              type="number"
                                              value={editingPeriod.miniReviewsPlan}
                                              onChange={(e) => setEditingPeriod({ ...editingPeriod, miniReviewsPlan: parseInt(e.target.value) || 0 })}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">Большие обзоры</Label>
                                            <Input
                                              type="number"
                                              value={editingPeriod.bigReviewsPlan}
                                              onChange={(e) => setEditingPeriod({ ...editingPeriod, bigReviewsPlan: parseInt(e.target.value) || 0 })}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button size="sm" onClick={() => handleUpdatePlanPeriod(editingPeriod)}>
                                            <Check className="h-4 w-4 mr-1" />
                                            Сохранить
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => setEditingPeriod(null)}>
                                            Отмена
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-4 text-sm">
                                            <span className="font-medium text-slate-700">
                                              {formatDate(period.startDate)} — {formatDate(period.endDate)}
                                            </span>
                                          </div>
                                          <div className="flex gap-4 mt-1 text-xs text-slate-600">
                                            <span>Посты: <strong>{period.postsPlan}</strong></span>
                                            <span>Сторис: <strong>{period.storiesPlan}</strong></span>
                                            <span>Мини-обзоры: <strong>{period.miniReviewsPlan}</strong></span>
                                            <span>Большие обзоры: <strong>{period.bigReviewsPlan}</strong></span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingPeriod(period)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          {isAdmin && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-red-500 hover:text-red-700"
                                              onClick={() => handleDeletePlanPeriod(period)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        className="w-full"
        size="lg"
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить настройки"}
      </Button>
    </div>
  );
}
