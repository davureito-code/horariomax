"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("Escribe email y contraseña");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.error(error);
      alert("Usuario o contraseña incorrectos");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, active")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile || !profile.active) {
      alert("Usuario sin perfil o inactivo");
      return;
    }

    router.push("/menu");
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900 text-center">
          Iniciar sesión
        </h1>

        <p className="text-slate-500 text-center mt-2 mb-6">
          Accede con tu usuario de la empresa
        </p>

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-slate-300 rounded-xl p-4 mb-3 text-black"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-2 border-slate-300 rounded-xl p-4 mb-4 text-black"
        />

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          onClick={() => router.push("/")}
          className="w-full mt-3 border rounded-xl py-3 font-bold text-slate-700"
        >
          Volver
        </button>
      </div>
    </main>
  );
}