"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const WORK_POINT = {
  latitude: -0.379175,
  longitude: -80.18658,
};

const ALLOWED_RADIUS_METERS = 20;

type MarkType = "entry" | "exit";
type WorkValue = 0.5 | 1;

type DayRecord = {
  date: string;
  workerName: string;
  entry?: {
    time: string;
    latitude: number;
    longitude: number;
    distanceMeters: number;
    photoDataUrl: string;
  };
  exit?: {
    time: string;
    latitude: number;
    longitude: number;
    distanceMeters: number;
    photoDataUrl: string;
  };
  workValue?: WorkValue;
};

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

function formatTime(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays() {
  const start = getStartOfWeek();
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      date: formatDate(d),
      label: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i],
    };
  });
}

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mapSupabaseRowsToDayRecords(rows: AttendanceRow[]): DayRecord[] {
  return rows.map((row) => ({
    date: row.work_date,
    workerName: row.worker_name,
    entry: row.entry_time
      ? {
          time: row.entry_time,
          latitude: row.entry_latitude ?? 0,
          longitude: row.entry_longitude ?? 0,
          distanceMeters: row.entry_distance_meters ?? 0,
          photoDataUrl: row.entry_photo_url ?? "",
        }
      : undefined,
    exit: row.exit_time
      ? {
          time: row.exit_time,
          latitude: row.exit_latitude ?? 0,
          longitude: row.exit_longitude ?? 0,
          distanceMeters: row.exit_distance_meters ?? 0,
          photoDataUrl: row.exit_photo_url ?? "",
        }
      : undefined,
    workValue: row.work_value === 0.5 ? 0.5 : row.work_value === 1 ? 1 : undefined,
  }));
}

async function uploadPhotoToSupabase(
  file: File,
  workerName: string,
  markType: "entry" | "exit"
) {
  const safeName = workerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${safeName}-${markType}-${Date.now()}.${ext}`;
  const filePath = `attendance/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("attendance-photos")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("attendance-photos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export default function TrabajadorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState("Listo.");
  const [loading, setLoading] = useState(false);

  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoReady, setPhotoReady] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [distance, setDistance] = useState<number | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [records, setRecords] = useState<DayRecord[]>([]);
  const [pendingMarkType, setPendingMarkType] = useState<MarkType | null>(null);
  const [workValue, setWorkValue] = useState<WorkValue>(1);

  async function loadWorkerRecords(workerName: string) {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("worker_name", workerName)
      .order("work_date", { ascending: false });

    if (error) {
      console.error(error);
      setStatus("Error cargando historial desde Supabase.");
      return;
    }

    const mapped = mapSupabaseRowsToDayRecords((data as AttendanceRow[]) || []);
    setRecords(mapped);
  }

  useEffect(() => {
  async function checkAccess() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      router.push("/");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, active")
      .eq("id", data.user.id)
      .single();

    if (!profile || !profile.active || profile.role !== "worker") {
      router.push("/");
      return;
    }

    setName(profile.full_name);
    loadWorkerRecords(profile.full_name);
  }

  checkAccess();
}, [router]);

  const today = formatDate();
  const todayRecord = records.find(
    (r) => r.workerName === name && r.date === today
  );

  const hasEntry = !!todayRecord?.entry;
  const hasExit = !!todayRecord?.exit;

  function resetProcess() {
    setPhotoDataUrl("");
    setPhotoReady(false);
    setDistance(null);
    setLocationReady(false);
    setLatitude(null);
    setLongitude(null);
    setPendingMarkType(null);
    setPhotoFile(null);
  }

  function startFlow(type: MarkType) {
    if (type === "entry" && hasEntry) {
      setStatus("Hoy ya registraste la entrada.");
      return;
    }

    if (type === "exit" && !hasEntry) {
      setStatus("Primero debes registrar la entrada.");
      return;
    }

    if (type === "exit" && hasExit) {
      setStatus("Hoy ya registraste la salida.");
      return;
    }

    setPendingMarkType(type);
    setStatus(
      type === "entry"
        ? "Ahora toma o carga la foto para la entrada."
        : "Ahora toma o carga la foto para la salida."
    );
    fileInputRef.current?.click();
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    try {
      setLoading(true);
      setStatus("Procesando foto...");
      const dataUrl = await toDataUrl(file);
      setPhotoDataUrl(dataUrl);
      setPhotoReady(true);
      setStatus("Foto lista. Ahora confirma la ubicación.");
    } catch (error) {
      console.error(error);
      setStatus("No se pudo procesar la foto.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmLocation() {
    try {
      setLoading(true);
      setStatus("Validando ubicación...");

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;

      const meters = haversineDistanceMeters(
        currentLat,
        currentLng,
        WORK_POINT.latitude,
        WORK_POINT.longitude
      );

      setLatitude(currentLat);
      setLongitude(currentLng);
      setDistance(meters);

      if (meters > ALLOWED_RADIUS_METERS) {
        setLocationReady(false);
        setStatus(`Fuera de rango. Distancia actual: ${meters.toFixed(1)} m.`);
        return;
      }

      setLocationReady(true);
      setStatus("Ubicación correcta. Ya puedes confirmar.");
    } catch (error) {
      console.error(error);
      setLocationReady(false);
      setStatus("No se pudo obtener la ubicación.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmMark() {
    if (!pendingMarkType) {
      setStatus("Primero elige entrada o salida.");
      return;
    }

    if (!photoReady) {
      setStatus("Primero debes cargar la foto.");
      return;
    }

    if (!locationReady) {
      setStatus("Primero debes confirmar la ubicación.");
      return;
    }

    if (!photoFile) {
      setStatus("No se encontró el archivo de la foto.");
      return;
    }

    let photoUrl = "";

    try {
      photoUrl = await uploadPhotoToSupabase(photoFile, name, pendingMarkType);
    } catch (error) {
      console.error(error);
      setStatus("Error subiendo foto a Supabase.");
      return;
    }

    const now = new Date();
    const currentDate = formatDate(now);
    const currentTime = formatTime(now);

    const payload = {
      time: currentTime,
      latitude: latitude || 0,
      longitude: longitude || 0,
      distanceMeters: Number((distance || 0).toFixed(2)),
      photoDataUrl: photoUrl,
    };

    const existingRecord = records.find(
      (r) => r.workerName === name && r.date === currentDate
    );

    if (!existingRecord) {
      if (pendingMarkType !== "entry") {
        setStatus("Primero debes registrar la entrada.");
        return;
      }

      const { error } = await supabase
        .from("attendance_records")
        .insert({
          worker_name: name,
          work_date: currentDate,
          entry_time: currentTime,
          entry_latitude: payload.latitude,
          entry_longitude: payload.longitude,
          entry_distance_meters: payload.distanceMeters,
          entry_photo_url: payload.photoDataUrl,
        });

      if (error) {
        console.error(error);
        setStatus("Error guardando entrada en Supabase.");
        return;
      }
    } else {
      if (pendingMarkType === "entry") {
        if (existingRecord.entry) {
          setStatus("Hoy ya registraste la entrada.");
          return;
        }

        const { error } = await supabase
          .from("attendance_records")
          .update({
            entry_time: currentTime,
            entry_latitude: payload.latitude,
            entry_longitude: payload.longitude,
            entry_distance_meters: payload.distanceMeters,
            entry_photo_url: payload.photoDataUrl,
          })
          .eq("worker_name", name)
          .eq("work_date", currentDate);

        if (error) {
          console.error(error);
          setStatus("Error actualizando entrada en Supabase.");
          return;
        }
      }

      if (pendingMarkType === "exit") {
        if (!existingRecord.entry) {
          setStatus("Primero debes registrar la entrada.");
          return;
        }

        if (existingRecord.exit) {
          setStatus("Hoy ya registraste la salida.");
          return;
        }

        const { error } = await supabase
          .from("attendance_records")
          .update({
            exit_time: currentTime,
            exit_latitude: payload.latitude,
            exit_longitude: payload.longitude,
            exit_distance_meters: payload.distanceMeters,
            exit_photo_url: payload.photoDataUrl,
            work_value: workValue,
          })
          .eq("worker_name", name)
          .eq("work_date", currentDate);

        if (error) {
          console.error(error);
          setStatus("Error guardando salida en Supabase.");
          return;
        }
      }
    }

    await loadWorkerRecords(name);

    setStatus(
      pendingMarkType === "entry"
        ? "Entrada registrada correctamente."
        : "Salida registrada correctamente."
    );

    resetProcess();
  }

  const weekDays = getWeekDays();

  const weekSummary = weekDays.map((day) => {
    const record = records.find(
      (r) => r.workerName === name && r.date === day.date
    );

    let state = "Ausente";
    let amount = 0;

    if (record?.entry && record?.exit) {
      state = record.workValue === 0.5 ? "Medio día" : "Día completo";
      amount = record.workValue || 1;
    } else if (record?.entry && !record?.exit) {
      state = "Incompleto";
      amount = 0;
    }

    return {
      ...day,
      state,
      amount,
    };
  });

  const totalWorked = weekSummary.reduce((sum, day) => sum + day.amount, 0);

  return (
    <main className="min-h-screen bg-white p-8 text-black">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">Panel Trabajador</h1>
        <p className="mt-2">Bienvenido: {name}</p>

        <div className="mt-6 rounded-2xl border p-4">
          <p className="font-semibold">Estado</p>
          <p className="mt-2 text-sm">{status}</p>
          <p className="mt-2 text-sm">Rango permitido: {ALLOWED_RADIUS_METERS} m</p>
          <p className="mt-1 text-sm">
            Distancia actual: {distance !== null ? `${distance.toFixed(1)} m` : "Sin validar"}
          </p>
          <p className="mt-1 text-sm">
            Entrada de hoy: {todayRecord?.entry?.time || "Pendiente"}
          </p>
          <p className="mt-1 text-sm">
            Salida de hoy: {todayRecord?.exit?.time || "Pendiente"}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => startFlow("entry")}
            disabled={loading || hasEntry}
            className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            Marcar entrada
          </button>

          <button
            onClick={() => startFlow("exit")}
            disabled={loading || !hasEntry || hasExit}
            className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            Marcar salida
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelected}
          />

          <button
            onClick={handleConfirmLocation}
            disabled={loading || !photoReady}
            className="w-full rounded-2xl border px-4 py-3 disabled:opacity-50"
          >
            Confirmar ubicación
          </button>

          {pendingMarkType === "exit" && (
            <div className="rounded-2xl border p-4">
              <p className="font-semibold">Tipo de jornada</p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => setWorkValue(1)}
                  className={`rounded-2xl px-4 py-2 border ${
                    workValue === 1 ? "bg-black text-white" : ""
                  }`}
                >
                  Día completo
                </button>
                <button
                  onClick={() => setWorkValue(0.5)}
                  className={`rounded-2xl px-4 py-2 border ${
                    workValue === 0.5 ? "bg-black text-white" : ""
                  }`}
                >
                  Medio día
                </button>
              </div>
            </div>
          )}

          <button
            onClick={confirmMark}
            disabled={loading || !photoReady || !locationReady || !pendingMarkType}
            className="w-full rounded-2xl border px-4 py-3 disabled:opacity-50"
          >
            Confirmar {pendingMarkType === "exit" ? "salida" : "entrada"}
          </button>
        </div>

        {photoDataUrl ? (
          <div className="mt-6 rounded-2xl border p-4">
            <p className="font-semibold">Foto cargada</p>
            <img
              src={photoDataUrl}
              alt="Foto del trabajador"
              className="mt-3 h-56 w-full rounded-2xl object-cover"
            />
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border p-4">
          <p className="font-semibold">Reporte semanal</p>

          <div className="mt-4 space-y-2">
            {weekSummary.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-xl border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{day.label}</p>
                  <p className="text-xs text-gray-500">{day.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">{day.state}</p>
                  <p className="text-xs text-gray-500">{day.amount}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-slate-100 p-3">
            <p className="font-semibold">Total trabajado esta semana: {totalWorked}</p>
          </div>
        </div>

        <button
          onClick={async () => {
  await supabase.auth.signOut(); // 👈 esto es lo nuevo
  localStorage.removeItem("attendance_user");
  router.push("/");
}}
          className="mt-6 rounded-2xl border px-4 py-2"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}