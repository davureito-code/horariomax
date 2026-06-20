"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Producto = {
  id: string;
  sku: string;
  descripcion: string;
  categoria: string;
  pvp_referencia: number;
  status: string;
  tenemos_en_stock: boolean;
  stock_local: number;
  precio_local: number;
  costo_local: number;
  genera_comision: boolean;
  grava_iva: boolean;
};

export default function ProductosHusqvarnaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  const cargarProductos = async () => {
    setLoading(true);

    let query = supabase
      .from("husqvarna_products")
      .select("*")
      .eq("activo", true)
      .order("descripcion", { ascending: true })
      .limit(100);

    if (busqueda.trim() !== "") {
      query = query.or(
        `descripcion.ilike.%${busqueda}%,sku.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%,status.ilike.%${busqueda}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      alert("Error cargando productos");
    } else {
      setProductos(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarProductos();
    }, 400);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const actualizarProducto = async (producto: Producto) => {
    const { error } = await supabase
      .from("husqvarna_products")
      .update({
        tenemos_en_stock: producto.tenemos_en_stock,
        stock_local: Number(producto.stock_local || 0),
        precio_local: Number(producto.precio_local || 0),
        costo_local: Number(producto.costo_local || 0),
        genera_comision: producto.genera_comision,
        grava_iva: producto.grava_iva ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", producto.id);

    if (error) {
      console.error(error);
      alert("Error al guardar");
      return;
    }

    alert("Producto actualizado");
  };

  const actualizarEnLista = (
    index: number,
    campo: keyof Producto,
    valor: string | number | boolean
  ) => {
    const copia = [...productos];
    copia[index] = {
      ...copia[index],
      [campo]: valor,
    };
    setProductos(copia);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-5">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin/husqvarna"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-xl font-bold mb-4"
        >
          ← Volver
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">
          Productos Husqvarna
        </h1>

        <p className="text-gray-600 mb-5">
          Busca productos reales y configura stock local, IVA, costos y precios.
        </p>

        <input
          type="text"
          placeholder="Buscar por producto, SKU, categoría o estado..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full p-4 rounded-xl border-2 border-slate-400 bg-white text-black mb-5"
        />

        {loading ? (
          <div className="bg-white rounded-2xl p-5 shadow">
            Cargando productos...
          </div>
        ) : productos.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow">
            <p className="text-gray-600">No se encontraron productos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {productos.map((producto, index) => (
              <div
                key={producto.id}
                className="bg-white rounded-2xl p-5 shadow border border-slate-200"
              >
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    {producto.descripcion}
                  </h2>
                  <p className="text-sm text-gray-600">SKU: {producto.sku}</p>
                  <p className="text-sm text-gray-600">
                    Categoría: {producto.categoria || "Sin categoría"}
                  </p>
                  <p className="text-sm text-gray-600">
                    PVP referencia sin IVA: ${producto.pvp_referencia || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Estado proveedor: {producto.status || "Sin estado"}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <label className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-xl p-3 font-semibold text-black">
                    <input
                      type="checkbox"
                      checked={producto.tenemos_en_stock || false}
                      onChange={(e) => {
  const checked = e.target.checked;

  setProductos((prev) =>
    prev.map((p) =>
      p.id === producto.id
        ? {
            ...p,
            tenemos_en_stock: checked,
            genera_comision: !checked,
          }
        : p
    )
  );
}}
                    />
                    Tenemos en local
                  </label>

                  <label className="flex items-center gap-2 text-sm bg-orange-50 border border-orange-200 rounded-xl p-3 font-semibold text-black">
                    <input
                      type="checkbox"
                      checked={producto.grava_iva ?? true}
                      onChange={(e) =>
                        actualizarEnLista(index, "grava_iva", e.target.checked)
                      }
                    />
                    Grava IVA
                  </label>

                  <input
                    type="number"
                    placeholder="Stock local"
                    value={producto.stock_local || ""}
                    onChange={(e) =>
                      actualizarEnLista(index, "stock_local", Number(e.target.value))
                    }
                    className="border-2 border-slate-300 bg-white text-black rounded-xl p-3"
                  />

                  <input
                    type="number"
                    placeholder="Costo local"
                    value={producto.costo_local || ""}
                    onChange={(e) =>
                      actualizarEnLista(index, "costo_local", Number(e.target.value))
                    }
                    className="border-2 border-slate-300 bg-white text-black rounded-xl p-3"
                  />

                  <input
                    type="number"
                    placeholder="Precio local"
                    value={producto.precio_local || ""}
                    onChange={(e) =>
                      actualizarEnLista(index, "precio_local", Number(e.target.value))
                    }
                    className="border-2 border-slate-300 bg-white text-black rounded-xl p-3"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                  <div className="bg-slate-100 rounded-xl p-3 text-sm text-slate-800">
                    Comisión:{" "}
                    <b>{producto.genera_comision ? "Sí genera" : "No genera"}</b>
                    <br />
                    IVA:{" "}
                    <b>{producto.grava_iva ? "Grava IVA" : "No grava IVA"}</b>
                  </div>

                  <button
                    onClick={() => actualizarProducto(producto)}
                    className="bg-green-700 hover:bg-green-800 text-white px-5 py-4 rounded-xl font-black shadow-lg"
                  >
                    💾 Guardar producto
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}