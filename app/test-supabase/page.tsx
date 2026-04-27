"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TestSupabasePage() {
  const [message, setMessage] = useState("Probando conexión...");

  useEffect(() => {
    async function test() {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .limit(1);

      if (error) {
        setMessage(`Error: ${error.message}`);
        return;
      }

      setMessage("Conexión correcta con Supabase.");
      console.log(data);
    }

    test();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Prueba Supabase</h1>
      <p className="mt-4">{message}</p>
    </main>
  );
}