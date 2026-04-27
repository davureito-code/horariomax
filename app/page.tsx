"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setError(error?.message || "No se pudo iniciar sesión.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, active")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("No se encontró el perfil del usuario.");
        return;
      }

      if (!profile.active) {
        setError("Usuario inactivo.");
        return;
      }

      localStorage.setItem(
        "attendance_user",
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: profile.full_name,
          role: profile.role,
        })
      );

      if (profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/trabajador");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold">Control de asistencia</h1>
        <p className="mt-2 text-sm text-slate-500">Inicia sesión</p>

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-5 w-full rounded-2xl border px-4 py-3"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-3 w-full rounded-2xl border px-4 py-3"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="mt-4 w-full rounded-2xl bg-black py-3 text-white disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}