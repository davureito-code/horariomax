"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Venta = {
  id: string;
  producto: string;
  sku: string;
  cliente_telefono: string;
  vendedor_nombre: string;
  precio_venta: number;
  costo_real: number;
  ganancia_real: number;
  comision_porcentaje: number;
  comision_real: number;
  es_producto_local: boolean;
  estado: string;
  created_at: string;
  comision_estado: string;
fecha_pago_comision: string | null;
};

export default function VentasHusqvarnaPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarVentas = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("husqvarna_sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error cargando ventas");
    } else {
      setVentas(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  const marcarComisionPagada = async (id: string) => {
  const { error } = await supabase
    .from("husqvarna_sales")
    .update({
      comision_estado: "pagada",
      fecha_pago_comision: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Error actualizando comisión");
    return;
  }

  cargarVentas();
};

  const totalVentas = ventas.reduce((sum, v) => sum + Number(v.precio_venta || 0), 0);
  const totalGanancia = ventas.reduce((sum, v) => sum + Number(v.ganancia_real || 0), 0);
  const totalComision = ventas.reduce((sum, v) => sum + Number(v.comision_real || 0), 0);

  const vendedores = ventas.reduce((acc: Record<string, { ventas: number; ganancia: number; comision: number }>, v) => {
    const nombre = v.vendedor_nombre || "Sin vendedor";

    if (!acc[nombre]) {
      acc[nombre] = {
        ventas: 0,
        ganancia: 0,
        comision: 0,
      };
    }

    acc[nombre].ventas += Number(v.precio_venta || 0);
    acc[nombre].ganancia += Number(v.ganancia_real || 0);
    acc[nombre].comision += Number(v.comision_real || 0);

    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-slate-100 p-5">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin/husqvarna"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-xl font-bold mb-4"
        >
          ← Volver a Admin Husqvarna
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">
          Ventas Husqvarna
        </h1>

        <p className="text-gray-600 mb-5">
          Ganancias, costos y comisiones por vendedor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow border">
            <p className="text-gray-500 text-sm">Total ventas sin IVA</p>
            <h2 className="text-3xl font-bold text-slate-900">
              ${totalVentas.toFixed(2)}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow border">
            <p className="text-gray-500 text-sm">Ganancia total</p>
            <h2 className="text-3xl font-bold text-green-700">
              ${totalGanancia.toFixed(2)}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow border">
            <p className="text-gray-500 text-sm">Comisiones pendientes</p>
            <h2 className="text-3xl font-bold text-orange-700">
              ${totalComision.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border mb-6">
          <h2 className="text-xl font-bold mb-4">Resumen por vendedor</h2>

          {Object.keys(vendedores).length === 0 ? (
            <p className="text-gray-600">Todavía no hay ventas.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(vendedores).map(([nombre, datos]) => (
                <div
                  key={nombre}
                  className="bg-slate-50 border rounded-xl p-4"
                >
                  <h3 className="font-bold text-slate-900">{nombre}</h3>
                  <p className="text-sm text-gray-600">
                    Ventas: ${datos.ventas.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Ganancia: ${datos.ganancia.toFixed(2)}
                  </p>
                  <p className="text-sm text-orange-700 font-bold">
                    Comisión: ${datos.comision.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border">
          <h2 className="text-xl font-bold mb-4">Historial de ventas</h2>

          {loading ? (
            <p>Cargando ventas...</p>
          ) : ventas.length === 0 ? (
            <p className="text-gray-600">Todavía no hay ventas registradas.</p>
          ) : (
            <div className="space-y-3">
              {ventas.map((venta) => (
                <div
                  key={venta.id}
                  className="border rounded-xl p-4 bg-slate-50"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {venta.producto}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Vendedor: {venta.vendedor_nombre || "Sin vendedor"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Cliente: {venta.cliente_telefono || "Sin cliente"}
                      </p>
                    </div>

                    <span
                      className={`h-fit text-sm px-3 py-1 rounded-full font-bold ${
                        venta.es_producto_local
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {venta.es_producto_local ? "Stock local" : "Pedido"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 text-sm">
                    <div className="bg-white rounded-xl p-3 border">
                      <p className="text-gray-500">Venta</p>
                      <b>${Number(venta.precio_venta || 0).toFixed(2)}</b>
                    </div>

                    <div className="bg-white rounded-xl p-3 border">
                      <p className="text-gray-500">Costo</p>
                      <b>${Number(venta.costo_real || 0).toFixed(2)}</b>
                    </div>

                    <div className="bg-white rounded-xl p-3 border">
                      <p className="text-gray-500">Ganancia</p>
                      <b className="text-green-700">
                        ${Number(venta.ganancia_real || 0).toFixed(2)}
                      </b>
                    </div>

                    <div className="bg-white rounded-xl p-3 border">
                      <p className="text-gray-500">Comisión</p>
                      <b className="text-orange-700">
                        ${Number(venta.comision_real || 0).toFixed(2)}
                      </b>
                    </div>
                  </div>

<div className="mt-4 flex flex-wrap gap-2 items-center">
  <span
    className={`px-3 py-1 rounded-full text-sm font-bold ${
      venta.comision_estado === "pagada"
        ? "bg-green-100 text-green-700"
        : "bg-orange-100 text-orange-700"
    }`}
  >
    {venta.comision_estado === "pagada"
      ? "Comisión pagada"
      : "Comisión pendiente"}
  </span>

  {venta.comision_estado !== "pagada" &&
    Number(venta.comision_real || 0) > 0 && (
      <button
        onClick={() => marcarComisionPagada(venta.id)}
        className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
      >
        💵 Marcar pagada
      </button>
    )}

  {venta.fecha_pago_comision && (
    <span className="text-xs text-gray-500">
      Pagada:{" "}
      {new Date(venta.fecha_pago_comision).toLocaleDateString()}
    </span>
  )}
</div>

                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(venta.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}