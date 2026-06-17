"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Solicitud = {
  id: string;
  product_id: string | null;
  producto: string;
  sku: string;
  cliente_telefono: string;
  vendedor_nombre: string;
  estado: string;
  created_at: string;
};

type Producto = {
  id: string;
  tenemos_en_stock: boolean;
  stock_local: number;
  genera_comision: boolean;
};

export default function AdminHusqvarnaPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [productosCount, setProductosCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    setLoading(true);

    const { data: solicitudesData, error: solicitudesError } = await supabase
      .from("husqvarna_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (solicitudesError) {
      console.error(solicitudesError);
      alert("Error cargando solicitudes");
    } else {
      setSolicitudes(solicitudesData || []);
    }

    const { count } = await supabase
      .from("husqvarna_products")
      .select("*", { count: "exact", head: true });

    setProductosCount(count || 0);
    const inicioMes = new Date();
inicioMes.setDate(1);
inicioMes.setHours(0, 0, 0, 0);

const { data: ventasData } = await supabase
  .from("husqvarna_sales")
  .select("*")
  .gte("created_at", inicioMes.toISOString());

const ventas = ventasData || [];

setVentasMes(
  ventas.reduce(
    (sum, v) => sum + Number(v.precio_venta || 0),
    0
  )
);

setGananciaMes(
  ventas.reduce(
    (sum, v) => sum + Number(v.ganancia_real || 0),
    0
  )
);

setComisionesPendientes(
  ventas
    .filter((v) => v.comision_estado !== "pagada")
    .reduce(
      (sum, v) => sum + Number(v.comision_real || 0),
      0
    )
);
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cambiarEstado = async (id: string, estado: string) => {
    const { error } = await supabase
      .from("husqvarna_requests")
      .update({ estado })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Error actualizando estado");
      return;
    }

    cargarDatos();
  };

  const registrarVenta = async (solicitud: Solicitud) => {
    const precioVentaTexto = prompt("Precio de venta SIN IVA:");
    if (!precioVentaTexto) return;

    const costoRealTexto = prompt("Costo real SIN IVA:");
    if (!costoRealTexto) return;

    const comisionTexto = prompt(
      "% comisión sobre ganancia (solo si no es producto local):",
      "10"
    );

    const precioVenta = Number(precioVentaTexto);
    const costoReal = Number(costoRealTexto);
    const comisionPorcentaje = Number(comisionTexto || 0);

    if (isNaN(precioVenta) || isNaN(costoReal)) {
      alert("Precio o costo inválido");
      return;
    }

    let productoInfo: Producto | null = null;

    if (solicitud.product_id) {
      const { data, error } = await supabase
        .from("husqvarna_products")
        .select("id, tenemos_en_stock, stock_local, genera_comision")
        .eq("id", solicitud.product_id)
        .single();

      if (error) {
        console.error(error);
      } else {
        productoInfo = data;
      }
    }

    const esProductoLocal = productoInfo?.tenemos_en_stock || false;
    const generaComision = productoInfo?.genera_comision ?? true;

    const ganancia = precioVenta - costoReal;
    const comision =
      esProductoLocal || !generaComision
        ? 0
        : ganancia * (comisionPorcentaje / 100);

    const { error: ventaError } = await supabase.from("husqvarna_sales").insert([
      {
        request_id: solicitud.id,
        product_id: solicitud.product_id,
        sku: solicitud.sku,
        producto: solicitud.producto,
        cliente_telefono: solicitud.cliente_telefono,
        vendedor_nombre: solicitud.vendedor_nombre,
        precio_venta: precioVenta,
        costo_real: costoReal,
        ganancia_real: ganancia,
        comision_porcentaje: esProductoLocal ? 0 : comisionPorcentaje,
        comision_real: comision,
        es_producto_local: esProductoLocal,
        estado: "vendido",
      },
    ]);

    if (ventaError) {
      console.error(ventaError);
      alert("Error guardando la venta");
      return;
    }

    const { error: estadoError } = await supabase
      .from("husqvarna_requests")
      .update({ estado: "vendido" })
      .eq("id", solicitud.id);

    if (estadoError) {
      console.error(estadoError);
      alert("Venta guardada, pero no se pudo actualizar la solicitud");
    }

    if (esProductoLocal && productoInfo && productoInfo.stock_local > 0) {
      const { error: stockError } = await supabase
        .from("husqvarna_products")
        .update({
          stock_local: productoInfo.stock_local - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productoInfo.id);

      if (stockError) {
        console.error(stockError);
        alert("Venta guardada, pero no se pudo descontar stock");
      }
    }

    alert(
      `Venta registrada\nGanancia: $${ganancia.toFixed(
        2
      )}\nComisión: $${comision.toFixed(2)}`
    );

    cargarDatos();
  };

const [ventasMes, setVentasMes] = useState(0);
const [gananciaMes, setGananciaMes] = useState(0);
const [comisionesPendientes, setComisionesPendientes] = useState(0);

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;

  return (
    <main className="min-h-screen bg-slate-100 p-5">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/admin"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-xl font-bold mb-4"
        >
          ← Volver al admin
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">Admin Husqvarna</h1>
        <p className="text-gray-600 mb-6">
          Solicitudes, catálogo, precios y productos locales.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow border">
            <p className="text-gray-500 text-sm">Solicitudes pendientes</p>
            <div className="bg-white rounded-2xl p-5 shadow border">
  <p className="text-gray-500 text-sm">Ventas del mes</p>
  <h2 className="text-3xl font-bold text-blue-700">
    ${ventasMes.toFixed(2)}
  </h2>
</div>

<div className="bg-white rounded-2xl p-5 shadow border">
  <p className="text-gray-500 text-sm">Ganancia del mes</p>
  <h2 className="text-3xl font-bold text-green-700">
    ${gananciaMes.toFixed(2)}
  </h2>
</div>

<div className="bg-white rounded-2xl p-5 shadow border">
  <p className="text-gray-500 text-sm">Comisiones pendientes</p>
  <h2 className="text-3xl font-bold text-orange-700">
    ${comisionesPendientes.toFixed(2)}
  </h2>
</div>
            <h2 className="text-3xl font-bold text-orange-700">{pendientes}</h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow border">
            <p className="text-gray-500 text-sm">Productos cargados</p>
            <h2 className="text-3xl font-bold text-slate-900">
              {productosCount}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow border">
            <p className="text-gray-500 text-sm">Solicitudes recientes</p>
            <h2 className="text-3xl font-bold text-blue-700">
              {solicitudes.length}
            </h2>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow mb-6 border">
          <h2 className="text-xl font-bold mb-4">Acciones</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/husqvarna/importar"
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-4 font-bold text-center"
            >
              📊 Subir Excel Husqvarna
            </Link>

            <Link
              href="/admin/husqvarna/productos"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold text-center"
            >
              📦 Administrar productos
            </Link>

            <Link
              href="/admin/husqvarna/precios"
              className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-4 font-bold text-center"
            >
              💲 Reglas de precios
            </Link>

<Link
  href="/admin/husqvarna/ventas"
  className="bg-green-700 hover:bg-green-800 text-white rounded-xl py-4 font-bold text-center"
>
  💰 Ventas y comisiones
</Link>

          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border">
          <h2 className="text-xl font-bold mb-4">Solicitudes recientes</h2>

          {loading ? (
            <p>Cargando solicitudes...</p>
          ) : solicitudes.length === 0 ? (
            <p className="text-gray-600">Todavía no hay solicitudes reales.</p>
          ) : (
            <div className="space-y-3">
              {solicitudes.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 flex flex-col gap-1 bg-slate-50"
                >
                  <div className="flex justify-between gap-3">
                    <h3 className="font-bold text-slate-900">
                      {item.producto}
                    </h3>
                    <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold">
                      {item.estado}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    Cliente: {item.cliente_telefono || "Sin teléfono"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Vendedor: {item.vendedor_nombre || "Sin vendedor"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => cambiarEstado(item.id, "cotizado")}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      Marcar cotizado
                    </button>

                    <button
                      onClick={() => registrarVenta(item)}
                      className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      Vendido
                    </button>

                    <button
                      onClick={() => cambiarEstado(item.id, "descartado")}
                      className="bg-slate-400 text-slate-950 px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}