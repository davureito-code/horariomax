"use client";

import Link from "next/link";
import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../../../lib/supabase";

type ProductoExcel = {
  marca: string;
  sku: string;
  descripcion: string;
  estilo_pnc: string;
  categoria: string;
  status: string;
  pvp_referencia: number;
  stock_quito: string;
  stock_guayaquil: string;
};

export default function ImportarHusqvarnaPage() {
  const [productos, setProductos] = useState<ProductoExcel[]>([]);
  const [loading, setLoading] = useState(false);

  const leerExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const productosMapeados = rows
      .map((row) => ({
        marca: row["Marca"] || "",
        sku: String(row["SKU"] || "").trim(),
        descripcion: row["Descripción"] || "",
        estilo_pnc: row["Estilo (PNC)"] || "",
        categoria: row["Categoría"] || "",
        status: row["Status"] || "",
        pvp_referencia: Number(row["Precio Ref. (PVP)"] || 0),
        stock_quito: String(row["1060-Quito"] || ""),
        stock_guayaquil: String(row["1200-Guayaquil"] || ""),
      }))
      .filter((p) => p.sku && p.descripcion);

    setProductos(productosMapeados);
  };

  const importarProductos = async () => {
    if (productos.length === 0) {
      alert("Primero selecciona un Excel");
      return;
    }

    setLoading(true);

    const productosParaGuardar = productos.map((p) => ({
      ...p,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("husqvarna_products")
      .upsert(productosParaGuardar, {
        onConflict: "sku",
      });

    setLoading(false);

    if (error) {
  console.error(error);
  alert(JSON.stringify(error));
  return;
}

    alert("Productos importados correctamente");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-5">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/husqvarna" className="text-sm text-blue-600">
          ← Volver a Admin Husqvarna
        </Link>

        <h1 className="text-2xl font-bold mt-4">Importar Excel Husqvarna</h1>
        <p className="text-gray-600 mb-5">
          Sube el Excel de precios e inventario.
        </p>

      <div className="bg-white rounded-2xl p-5 shadow mb-5">
  <input
    type="file"
    accept=".xlsx,.xls"
    onChange={leerExcel}
    className="block w-full border-2 border-black rounded-xl p-4 bg-white text-black"
  />

  <p className="mt-4 text-black">
    Productos encontrados: <b>{productos.length}</b>
  </p>

  <button
    onClick={importarProductos}
    disabled={loading || productos.length === 0}
    className="mt-4 w-full bg-orange-600 text-white px-5 py-4 rounded-xl font-bold disabled:opacity-50"
  >
    {loading ? "Importando..." : "Confirmar importación"}
  </button>
</div>

        <div className="space-y-3">
          {productos.slice(0, 10).map((p) => (
            <div key={p.sku} className="bg-white rounded-xl p-4 shadow">
              <h2 className="font-bold">{p.descripcion}</h2>
              <p className="text-sm text-gray-500">SKU: {p.sku}</p>
              <p className="text-sm text-gray-500">
                Categoría: {p.categoria}
              </p>
              <p className="text-sm text-gray-500">
                PVP Ref: ${p.pvp_referencia}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}