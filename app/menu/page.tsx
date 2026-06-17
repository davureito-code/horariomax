"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function MenuPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");

  useEffect(() => {
    async function cargarUsuario() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, active")
        .eq("id", data.user.id)
        .single();

      if (!profile || !profile.active) {
        router.push("/login");
        return;
      }

      setNombre(profile.full_name);
      setRol(profile.role);
    }

    cargarUsuario();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-white text-3xl font-bold text-center mb-2">
          Bienvenido
        </h1>

        <p className="text-slate-400 text-center mb-2">
          {nombre}
        </p>

        <p className="text-slate-500 text-center mb-8">
          Rol: {rol}
        </p>

       <div className="grid gap-4">
  {rol === "worker" && (
    <Link
      href="/trabajador"
      className="bg-blue-600 text-white text-center py-5 rounded-2xl text-xl font-semibold shadow-lg"
    >
      Horario
    </Link>
  )}

  {(rol === "worker" || rol === "admin") && (
    <Link
      href="/husqvarna"
      className="bg-orange-500 text-white text-center py-5 rounded-2xl text-xl font-semibold shadow-lg"
    >
      Husqvarna
    </Link>
  )}

  {rol === "admin" && (
    <Link
      href="/admin/husqvarna"
      className="bg-green-600 text-white text-center py-5 rounded-2xl text-xl font-semibold shadow-lg"
    >
      Admin Husqvarna
    </Link>
  )}

  {rol === "admin" && (
    <Link
      href="/admin"
      className="bg-slate-700 text-white text-center py-5 rounded-2xl text-xl font-semibold shadow-lg"
    >
      Administración horarios
    </Link>
  )}

  <button
    onClick={async () => {
      await supabase.auth.signOut();
      router.push("/login");
    }}
    className="bg-red-600 text-white py-4 rounded-2xl font-bold"
  >
    Cerrar sesión
  </button>
</div>
      </div>
    </main>
  );
}