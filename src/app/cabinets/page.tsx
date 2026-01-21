"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Trash2,
  Loader2,
  Monitor,
  User,
  Building2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Country {
  id: string;
  name: string;
  code: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  country: Country | null;
}

interface Desk {
  id: string;
  name: string;
  cabinetId: string;
  employeeId: string | null;
  description: string | null;
  isActive: boolean;
  employee: Employee | null;
  _count?: { buyerMetrics: number };
}

interface Cabinet {
  id: string;
  name: string;
  platform: string | null;
  platformId: string | null;
  countryId: string | null;
  description: string | null;
  isActive: boolean;
  desks: Desk[];
  country: Country | null;
  _count?: { buyerMetrics: number };
}

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

export default function CabinetsPage() {
  const router = useRouter();
  const { user, loading: authLoading, canEdit } = useAuth();

  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  const [isCabinetDialogOpen, setIsCabinetDialogOpen] = useState(false);
  const [cabinetForm, setCabinetForm] = useState({
    name: "",
    platform: "",
    platformId: "",
    countryId: "",
    description: "",
  });

  const [isDeskDialogOpen, setIsDeskDialogOpen] = useState(false);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>("");
  const [deskForm, setDeskForm] = useState({
    name: "",
    employeeId: "",
    description: "",
  });

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const fetchCabinets = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cabinets");
      if (response.ok) {
        const data = await response.json();
        setCabinets(data);
        const countryIds = new Set(data.map((c: Cabinet) => c.countryId || "none"));
        setExpandedCountries(countryIds as Set<string>);
      }
    } catch (error) {
      console.error("Error fetching cabinets:", error);
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

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCabinets();
      fetchCountries();
      fetchEmployees();
    }
  }, [user]);

  const toggleCountry = (countryId: string) => {
    const newExpanded = new Set(expandedCountries);
    if (newExpanded.has(countryId)) {
      newExpanded.delete(countryId);
    } else {
      newExpanded.add(countryId);
    }
    setExpandedCountries(newExpanded);
  };

  const handleCreateCabinet = async () => {
    if (!cabinetForm.name) {
      alert("Название кабинета обязательно");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/cabinets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cabinetForm.name,
          platform: cabinetForm.platform || null,
          platformId: cabinetForm.platformId || null,
          countryId: cabinetForm.countryId || null,
          description: cabinetForm.description || null,
        }),
      });

      if (response.ok) {
        setIsCabinetDialogOpen(false);
        setCabinetForm({ name: "", platform: "", platformId: "", countryId: "", description: "" });
        fetchCabinets();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка создания кабинета");
      }
    } catch (error) {
      console.error("Error creating cabinet:", error);
      alert("Ошибка создания кабинета");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCabinet = async (id: string) => {
    if (!confirm("Удалить этот кабинет и все его дески?")) return;

    try {
      const response = await fetch(`/api/cabinets/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCabinets();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка удаления кабинета");
      }
    } catch (error) {
      console.error("Error deleting cabinet:", error);
    }
  };

  const handleOpenDeskDialog = (cabinetId: string) => {
    setSelectedCabinetId(cabinetId);
    setDeskForm({ name: "", employeeId: "", description: "" });
    setIsDeskDialogOpen(true);
  };

  const handleCreateDesk = async () => {
    if (!deskForm.name || !selectedCabinetId) {
      alert("Название деска обязательно");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/desks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deskForm.name,
          cabinetId: selectedCabinetId,
          employeeId: deskForm.employeeId || null,
          description: deskForm.description || null,
        }),
      });

      if (response.ok) {
        setIsDeskDialogOpen(false);
        setDeskForm({ name: "", employeeId: "", description: "" });
        setSelectedCabinetId("");
        fetchCabinets();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка создания деска");
      }
    } catch (error) {
      console.error("Error creating desk:", error);
      alert("Ошибка создания деска");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDesk = async (id: string) => {
    if (!confirm("Удалить этот деск?")) return;

    try {
      const response = await fetch(`/api/desks/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCabinets();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка удаления деска");
      }
    } catch (error) {
      console.error("Error deleting desk:", error);
    }
  };

  const handleOpenAssignDialog = (desk: Desk) => {
    setSelectedDesk(desk);
    setAssignEmployeeId(desk.employeeId || "");
    setIsAssignDialogOpen(true);
  };

  const handleAssignEmployee = async () => {
    if (!selectedDesk) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/desks/${selectedDesk.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: assignEmployeeId || null,
        }),
      });

      if (response.ok) {
        setIsAssignDialogOpen(false);
        setSelectedDesk(null);
        setAssignEmployeeId("");
        fetchCabinets();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка назначения сотрудника");
      }
    } catch (error) {
      console.error("Error assigning employee:", error);
      alert("Ошибка назначения сотрудника");
    } finally {
      setSaving(false);
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

  const cabinetsByCountry = cabinets.reduce((acc, cabinet) => {
    const countryId = cabinet.countryId || "none";
    if (!acc[countryId]) {
      acc[countryId] = {
        country: cabinet.country,
        cabinets: [],
      };
    }
    acc[countryId].cabinets.push(cabinet);
    return acc;
  }, {} as Record<string, { country: Country | null; cabinets: Cabinet[] }>);

  const totalCabinets = cabinets.length;
  const totalDesks = cabinets.reduce((sum, c) => sum + c.desks.length, 0);
  const assignedDesks = cabinets.reduce(
    (sum, c) => sum + c.desks.filter((d) => d.employeeId).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Кабинеты и Дески</h1>
          <p className="text-slate-500 mt-1">
            Управление рекламными кабинетами и рабочими местами
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            onClick={fetchCabinets}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          {canEdit && (
            <Button
              onClick={() => setIsCabinetDialogOpen(true)}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Новый кабинет
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#3b82f6]" />
              Всего кабинетов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">{totalCabinets}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-[#3b82f6]" />
              Всего десков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">{totalDesks}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <User className="h-4 w-4 text-[#3b82f6]" />
              Назначено сотрудников
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">
              {assignedDesks} / {totalDesks}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
        </div>
      ) : cabinets.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>Нет кабинетов</p>
              {canEdit && (
                <Button
                  onClick={() => setIsCabinetDialogOpen(true)}
                  className="mt-4 bg-[#1e40af] hover:bg-[#3b82f6]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Создать первый кабинет
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(cabinetsByCountry).map(([countryId, { country, cabinets: countryCabinets }]) => (
            <Card key={countryId}>
              <CardHeader
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleCountry(countryId)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {expandedCountries.has(countryId) ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                    {country ? getCountryNameRu(country.name) : "Без страны"}
                    <span className="text-sm font-normal text-slate-500">
                      ({countryCabinets.length} кабинетов)
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              {expandedCountries.has(countryId) && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {countryCabinets.map((cabinet) => (
                      <div
                        key={cabinet.id}
                        className="border rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900">
                              {cabinet.name}
                            </h3>
                            <div className="flex gap-4 text-sm text-slate-500">
                              {cabinet.platform && (
                                <span>Платформа: {cabinet.platform}</span>
                              )}
                              {cabinet.platformId && (
                                <span>ID: {cabinet.platformId}</span>
                              )}
                              <span>{cabinet.desks.length} десков</span>
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDeskDialog(cabinet.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Деск
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteCabinet(cabinet.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {cabinet.desks.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {cabinet.desks.map((desk) => (
                              <div
                                key={desk.id}
                                className="flex items-center justify-between bg-white rounded-md p-3 border"
                              >
                                <div className="flex items-center gap-2">
                                  <Monitor className="h-4 w-4 text-[#3b82f6]" />
                                  <div>
                                    <p className="font-medium text-sm">{desk.name}</p>
                                    {desk.employee ? (
                                      <p className="text-xs text-slate-500">
                                        {desk.employee.name}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-amber-600">
                                        Не назначен
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => handleOpenAssignDialog(desk)}
                                      title="Назначить сотрудника"
                                    >
                                      <User className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => handleDeleteDesk(desk.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {cabinet.desks.length === 0 && (
                          <p className="text-sm text-slate-400 italic">
                            Нет десков
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCabinetDialogOpen} onOpenChange={setIsCabinetDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый кабинет</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="cabinet-name">Название *</Label>
              <Input
                id="cabinet-name"
                value={cabinetForm.name}
                onChange={(e) => setCabinetForm({ ...cabinetForm, name: e.target.value })}
                placeholder="Camila 3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cabinet-platform">Платформа</Label>
                <Input
                  id="cabinet-platform"
                  value={cabinetForm.platform}
                  onChange={(e) => setCabinetForm({ ...cabinetForm, platform: e.target.value })}
                  placeholder="Crossgif"
                />
              </div>
              <div>
                <Label htmlFor="cabinet-platformId">ID платформы</Label>
                <Input
                  id="cabinet-platformId"
                  value={cabinetForm.platformId}
                  onChange={(e) => setCabinetForm({ ...cabinetForm, platformId: e.target.value })}
                  placeholder="759443220489882"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cabinet-country">Страна</Label>
              <Select
                value={cabinetForm.countryId}
                onValueChange={(v) => setCabinetForm({ ...cabinetForm, countryId: v })}
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
            <div>
              <Label htmlFor="cabinet-description">Описание</Label>
              <Input
                id="cabinet-description"
                value={cabinetForm.description}
                onChange={(e) => setCabinetForm({ ...cabinetForm, description: e.target.value })}
                placeholder="Дополнительная информация"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCabinetDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateCabinet}
              disabled={saving}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeskDialogOpen} onOpenChange={setIsDeskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый деск</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="desk-name">Название *</Label>
              <Input
                id="desk-name"
                value={deskForm.name}
                onChange={(e) => setDeskForm({ ...deskForm, name: e.target.value })}
                placeholder="Desk1"
              />
            </div>
            <div>
              <Label htmlFor="desk-employee">Сотрудник</Label>
              <Select
                value={deskForm.employeeId}
                onValueChange={(v) => setDeskForm({ ...deskForm, employeeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="desk-description">Описание</Label>
              <Input
                id="desk-description"
                value={deskForm.description}
                onChange={(e) => setDeskForm({ ...deskForm, description: e.target.value })}
                placeholder="Дополнительная информация"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeskDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateDesk}
              disabled={saving}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Назначить сотрудника</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedDesk && (
              <p className="text-sm text-slate-500 mb-4">
                Деск: <span className="font-medium">{selectedDesk.name}</span>
              </p>
            )}
            <Label htmlFor="assign-employee">Сотрудник</Label>
            <Select
              value={assignEmployeeId}
              onValueChange={setAssignEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Не назначен</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleAssignEmployee}
              disabled={saving}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
