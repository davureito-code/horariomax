"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Regla = {
  id?: string;
  categoria: string;
  descuento_empresa_porcentaje: number;
  margen_porcentaje: number;
  iva_porcentaje: number;
  grava_iva: boolean;
  activo: boolean;
};

export default function PreciosHusqvarnaPage() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");

  const cargarDatos = async () => {
    const { data: productos } = await supabase
      .from("husqvarna_products")
      .select("categoria")
      .eq("activo", true);

    const cats = Array.from(
      new Set((productos || []).map((p) => p.categoria).filter(Boolean))
    );

    setCategorias(cats);

    const { data: reglasData } = await supabase
      .from("husqvarna_pricing_rules")
      .select("*")
      .order("categoria", { ascending: true });

    setReglas(reglasData || []);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const agregarRegla = () => {
    if (!nuevaCategoria) return;

    const existe = reglas.some((r) => r.categoria === nuevaCategoria);
    if (existe) {
      alert("Esta categoría ya tiene regla");
      return;
    }

    setReglas([
      ...reglas,
      {
        categoria: nuevaCategoria,
        descuento_empresa_porcentaje: 0,
        margen_porcentaje: 0,
        iva_porcentaje: 15,
        grava_iva: true,
        activo: true,
      },
    ]);

    setNuevaCategoria("");
  };

  const guardarRegla = async (regla: Regla) => {
    const { error } = await supabase
      .from("husqvarna_pricing_rules")
      .upsert(
        {
          ...regla,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "categoria" }
      );

    if (error) {
      console.error(error);
      alert("Error al guardar");
      return;
    }

    alert("Regla guardada");
    cargarDatos();
  };

  return (
    <main className="min-h-screen bg-slate-100 p-5">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin/husqvarna"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-xl font-bold mb-4"
        >
          ← Volver
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">
          Reglas de precios Husqvarna
        </h1>

        <p className="text-slate-600 mb-5">
          Configura descuento de empresa, margen e IVA por categoría.
        </p>

        <div className="bg-white rounded-2xl p-5 shadow border border-slate-200 mb-5">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            Agregar categoría
          </h2>

          <select
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            className="w-full border-2 border-slate-400 bg-white text-black rounded-xl p-4 font-semibold mb-3"
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={agregarRegla}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold py-4"
          >
            Agregar regla
          </button>
        </div>

        <div className="space-y-5">
          {reglas.map((regla, index) => {
            const ejemploPvp = 100;
            const costoEstimado =
              ejemploPvp -
              (ejemploPvp * regla.descuento_empresa_porcentaje) / 100;
            const precioSinIva =
              costoEstimado + (costoEstimado * regla.margen_porcentaje) / 100;
            const precioConIva = regla.grava_iva
              ? precioSinIva + (precioSinIva * regla.iva_porcentaje) / 100
              : precioSinIva;

            return (
              <div
                key={regla.id || regla.categoria}
                className="bg-white rounded-2xl p-5 shadow border border-slate-200"
              >
                <div className="bg-slate-900 text-white rounded-xl p-4 mb-4">
                  <h2 className="text-xl font-bold">{regla.categoria}</h2>
                  <p className="text-sm text-slate-300">
                    Regla de precio por categoría
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="font-bold text-slate-800">
                      Descuento empresa Husqvarna %
                    </span>
                    <input
                      type="number"
                      value={regla.descuento_empresa_porcentaje}
                      onChange={(e) => {
                        const copia = [...reglas];
                        copia[index].descuento_empresa_porcentaje = Number(
                          e.target.value
                        );
                        setReglas(copia);
                      }}
                      className="w-full mt-2 border-2 border-slate-400 bg-white text-black rounded-xl p-4 font-bold text-lg"
                    />
                  </label>

                  <label className="block">
                    <span className="font-bold text-slate-800">
                      Margen nuestro %
                    </span>
                    <input
                      type="number"
                      value={regla.margen_porcentaje}
                      onChange={(e) => {
                        const copia = [...reglas];
                        copia[index].margen_porcentaje = Number(e.target.value);
                        setReglas(copia);
                      }}
                      className="w-full mt-2 border-2 border-slate-400 bg-white text-black rounded-xl p-4 font-bold text-lg"
                    />
                  </label>

                  <label className="block">
                    <span className="font-bold text-slate-800">IVA %</span>
                    <input
                      type="number"
                      value={regla.iva_porcentaje}
                      onChange={(e) => {
                        const copia = [...reglas];
                        copia[index].iva_porcentaje = Number(e.target.value);
                        setReglas(copia);
                      }}
                      className="w-full mt-2 border-2 border-slate-400 bg-white text-black rounded-xl p-4 font-bold text-lg"
                    />
                  </label>

                  <label className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-4 font-bold text-slate-900">
                    <span>Producto grava IVA</span>
                    <input
                      type="checkbox"
                      checked={regla.grava_iva}
                      onChange={(e) => {
                        const copia = [...reglas];
                        copia[index].grava_iva = e.target.checked;
                        setReglas(copia);
                      }}
                      className="w-5 h-5"
                    />
                  </label>

<button
  onClick={() => guardarRegla(regla)}
  className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl font-black py-5 text-xl border-2 border-green-900 shadow-lg mb-4"
>
  💾 Guardar regla
</button>

                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="font-bold text-orange-800 mb-2">
                      Ejemplo con PVP $100
                    </p>
                    <p className="text-sm text-slate-700">
                      Costo estimado: ${costoEstimado.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-700">
                      Precio sin IVA: ${precioSinIva.toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-700">
                      Precio con IVA: ${precioConIva.toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => guardarRegla(regla)}
                   className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl font-black py-5 text-xl border-2 border-green-900 shadow-lg"
                  >
                    Guardar regla
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}