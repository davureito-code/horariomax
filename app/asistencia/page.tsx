"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ALLOWED_RADIUS_METERS,
  WORK_POINT,
  formatDateKey,
  formatTime,
  haversineDistanceMeters,
  loadRecords,
  saveRecords,
  MarkRecord,
  MarkType,
} from "../../lib/supabase";

type LoggedUser = {
  username: string;
  password: string;
  role: string;
  name: string;
};

export default function AsistenciaPage() {
  const router = useRouter();
  const [workerName, setWorkerName] = useState("");
  const [records, setRecords] = useState<MarkRecord[]>([]);
  const [status, setStatus] = useState("Listo para marcar.");
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingType, setPendingType] = useState<MarkType | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem("attendance_user");
    if (!rawUser) {
      router.push("/");
      return;
    }

    const user: LoggedUser = JSON.parse(rawUser);

    if (user.role !== "worker") {
      router.push("/");
      return;
    }

    setWorkerName(user.name);
    setRecords(loadRecords());
  }, [router]);

  <button
  onClick={() => {
    localStorage.removeItem("attendance_user");
    router.push("/");
  }}
  className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 font-semibold"
>
  Cerrar sesión
</button>}