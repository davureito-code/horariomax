"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AttendanceRow = {
  id: string;
  worker_name: string;
  work_date: string;
  entry_time: string | null;
  exit_time: string | null;
  entry_latitude: number | null;
  entry_longitude: number | null;
  entry_distance_meters: number | null;
  entry_photo_url: string | null;
  exit_latitude: number | null;
  exit_longitude: number | null;
  exit_distance_meters: number | null;
  exit_photo_url: string | null;
  work_value: number | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(baseDate = new Date()) {
  const start = getStartOfWeek(baseDate);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      date: formatDate(d),
      label: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i],
    };
  });
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getWeekLabel(baseDate: Date) {
  const days = getWeekDays(baseDate);
  return `${days[0].date} al ${days[6].date}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openWorker, setOpenWorker] = useState<string | null>(null);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [selectedWorker, setSelectedWorker] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedBaseDate = useMemo(() => {
    return addDays(new Date(), weekOffset * 7);
  }, [weekOffset]);

  useEffect(() => {
  async function checkAccessAndLoad() {
    setLoading(true);

    // 1. Verificar sesión
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      router.push("/");
      return;
    }

    // 2. Verificar perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, active")
      .eq("id", data.user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !profile.active ||
      profile.role !== "admin"
    ) {
      router.push("/");
      return;
    }

    // 3. Cargar datos
    const { data: recordsData, error: recordsError } = await supabase
      .from("attendance_records")
      .select("*")
      .order("work_date", { ascending: false });

    if (recordsError) {
      console.error(recordsError);
      setLoading(false);
      return;
    }

    setRecords((recordsData as AttendanceRow[]) || []);
    setLoading(false);
  }

  checkAccessAndLoad();
}, [router]);

  const weekDays = useMemo(() => getWeekDays(selectedBaseDate), [selectedBaseDate]);
  const weekDates = weekDays.map((d) => d.date);
  const today = formatDate();

  const allWorkerNames = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.worker_name))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [records]);

  const filteredWorkerNames = useMemo(() => {
    if (selectedWorker === "all") return allWorkerNames;
    return allWorkerNames.filter((name) => name === selectedWorker);
  }, [allWorkerNames, selectedWorker]);

  const groupedWorkers = useMemo(() => {
    return filteredWorkerNames.map((workerName) => {
      const days = weekDays.map((day) => {
        const record =
          records.find(
            (r) => r.worker_name === workerName && r.work_date === day.date
          ) || null;

        let state = "Ausente";
        let value = 0;

        if (record?.entry_time && record?.exit_time) {
          value = record.work_value ?? 1;
          state = value === 0.5 ? "Medio día" : "Día completo";
        } else if (record?.entry_time && !record?.exit_time) {
          state = "Incompleto";
        }

        return {
          ...day,
          state,
          value,
          record,
          isToday: day.date === today,
        };
      });

      const totalWeek = days.reduce((sum, day) => sum + day.value, 0);
      const workedDays = days.filter((d) => d.value === 1).length;
      const halfDays = days.filter((d) => d.value === 0.5).length;
      const incompleteDays = days.filter((d) => d.state === "Incompleto").length;
      const absentDays = days.filter((d) => d.state === "Ausente").length;
      const todayRecord = days.find((d) => d.date === today);

      return {
        workerName,
        totalWeek,
        workedDays,
        halfDays,
        incompleteDays,
        absentDays,
        todayEntry: todayRecord?.record?.entry_time || "Pendiente",
        todayExit: todayRecord?.record?.exit_time || "Pendiente",
        todayState: todayRecord?.state || "Ausente",
        days,
      };
    });
  }, [filteredWorkerNames, records, today, weekDays]);

  const summaryCards = useMemo(() => {
    let totalWorkers = groupedWorkers.length;
    let totalWorked = 0;
    let totalHalf = 0;
    let totalIncomplete = 0;
    let totalAbsent = 0;
    let totalValue = 0;

    groupedWorkers.forEach((worker) => {
      totalWorked += worker.workedDays;
      totalHalf += worker.halfDays;
      totalIncomplete += worker.incompleteDays;
      totalAbsent += worker.absentDays;
      totalValue += worker.totalWeek;
    });

    return {
      totalWorkers,
      totalWorked,
      totalHalf,
      totalIncomplete,
      totalAbsent,
      totalValue,
    };
  }, [groupedWorkers]);

  function toggleWorker(workerName: string) {
    setOpenWorker((prev) => (prev === workerName ? null : workerName));
  }

  function toggleDay(workerName: string, date: string) {
    const key = `${workerName}-${date}`;
    setOpenDays((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Panel Admin</h1>
            <p className="mt-1 text-sm text-slate-500">
              Resumen semanal por trabajador
            </p>
          </div>

          <button
            onClick={async () => {
  await supabase.auth.signOut(); // 👈 esto es lo nuevo
  localStorage.removeItem("attendance_user");
  router.push("/");
}}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 font-semibold"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Trabajadores</p>
            <p className="mt-1 text-2xl font-bold">{summaryCards.totalWorkers}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Días completos</p>
            <p className="mt-1 text-2xl font-bold">{summaryCards.totalWorked}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Medios días</p>
            <p className="mt-1 text-2xl font-bold">{summaryCards.totalHalf}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Incompletos</p>
            <p className="mt-1 text-2xl font-bold">{summaryCards.totalIncomplete}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Ausencias</p>
            <p className="mt-1 text-2xl font-bold">{summaryCards.totalAbsent}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Total semanal</p>
            <p className="mt-1 text-2xl font-bold">{summaryCards.totalValue}</p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Filtrar trabajador</label>
              <select
                value={selectedWorker}
                onChange={(e) => {
                  setSelectedWorker(e.target.value);
                  setOpenWorker(null);
                }}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none"
              >
                <option value="all">Todos</option>
                {allWorkerNames.map((worker) => (
                  <option key={worker} value={worker}>
                    {worker}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Semana</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setWeekOffset((prev) => prev - 1);
                    setOpenWorker(null);
                    setOpenDays({});
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                >
                  Semana anterior
                </button>

                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold">
                  {getWeekLabel(selectedBaseDate)}
                </div>

                <button
                  onClick={() => {
                    setWeekOffset((prev) => prev + 1);
                    setOpenWorker(null);
                    setOpenDays({});
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                >
                  Semana siguiente
                </button>

                <button
                  onClick={() => {
                    setWeekOffset(0);
                    setOpenWorker(null);
                    setOpenDays({});
                  }}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                >
                  Semana actual
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            Cargando...
          </div>
        ) : groupedWorkers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            No hay registros para esta semana.
          </div>
        ) : (
          <div className="space-y-5">
            {groupedWorkers.map((worker) => (
              <div
                key={worker.workerName}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{worker.workerName}</h2>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        Entrada de hoy: {worker.todayEntry}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        Salida de hoy: {worker.todayExit}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        Estado de hoy: {worker.todayState}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold">
                        Total semanal: {worker.totalWeek}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleWorker(worker.workerName)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                  >
                    {openWorker === worker.workerName ? "Ocultar semana" : "Ver semana"}
                  </button>
                </div>

                {openWorker === worker.workerName && (
                  <div className="mt-5 space-y-3">
                    {worker.days.map((day) => {
                      const key = `${worker.workerName}-${day.date}`;
                      return (
                        <div
                          key={key}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold">
                                {day.label} - {day.date}
                              </p>
                              <p className="text-sm text-slate-600">
                                Estado: {day.state}
                              </p>
                              <p className="text-sm text-slate-600">
                                Valor del día: {day.value}
                              </p>
                            </div>

                            <button
                              onClick={() => toggleDay(worker.workerName, day.date)}
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm"
                            >
                              {openDays[key] ? "Ocultar detalle" : "Ver detalle"}
                            </button>
                          </div>

                          {openDays[key] && (
                            <div className="mt-4 space-y-4">
                              {!day.record ? (
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                                  No hay registro este día.
                                </div>
                              ) : (
                                <>
                                  <div className="rounded-2xl border border-slate-200 p-4">
                                    <p className="font-semibold">Entrada</p>
                                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                                      <p>Hora: {day.record.entry_time || "Pendiente"}</p>
                                      <p>
                                        Distancia:{" "}
                                        {day.record.entry_distance_meters ?? "Sin dato"} m
                                      </p>
                                      <p>
                                        Ubicación:{" "}
                                        {day.record.entry_latitude ?? "—"},{" "}
                                        {day.record.entry_longitude ?? "—"}
                                      </p>
                                    </div>

                                    {day.record.entry_photo_url && (
                                      <img
                                        src={day.record.entry_photo_url}
                                        alt="Foto entrada"
                                        className="mt-3 h-56 w-full rounded-2xl object-cover"
                                      />
                                    )}
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 p-4">
                                    <p className="font-semibold">Salida</p>
                                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                                      <p>Hora: {day.record.exit_time || "Pendiente"}</p>
                                      <p>
                                        Distancia:{" "}
                                        {day.record.exit_distance_meters ?? "Sin dato"} m
                                      </p>
                                      <p>
                                        Ubicación:{" "}
                                        {day.record.exit_latitude ?? "—"},{" "}
                                        {day.record.exit_longitude ?? "—"}
                                      </p>
                                      <p>
                                        Jornada:{" "}
                                        {day.record.work_value === 0.5
                                          ? "Medio día"
                                          : day.record.work_value === 1
                                          ? "Día completo"
                                          : "Pendiente"}
                                      </p>
                                    </div>

                                    {day.record.exit_photo_url && (
                                      <img
                                        src={day.record.exit_photo_url}
                                        alt="Foto salida"
                                        className="mt-3 h-56 w-full rounded-2xl object-cover"
                                      />
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}