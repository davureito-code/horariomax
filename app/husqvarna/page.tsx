"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Producto = {
  id: string;
  sku: string;
  descripcion: string;
  categoria: string;
  status: string;
  pvp_referencia: number;
  stock_quito: string;
  stock_guayaquil: string;
  tenemos_en_stock: boolean;
  stock_local: number;
  precio_local: number;
  grava_iva: boolean;
  caracteristicas: string | null;
  usos: string | null;
};

type Regla = {
  categoria: string;
  descuento_empresa_porcentaje: number;
  margen_porcentaje: number;
  iva_porcentaje: number;
  grava_iva: boolean;
};

type PreciosCalculados = {
  origen: string;
  precioReferencia: number;
  precioSinIva: number;
  precioConIva: number;
  precioVenta: number;
  gravaIva: boolean;
  tieneRegla: boolean;
};

export default function HusqvarnaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendedorNombre, setVendedorNombre] = useState("");
const [cotizarAbierto, setCotizarAbierto] = useState<string | null>(null);
const [telefonos, setTelefonos] = useState<Record<string, string>>({});


  const cargarCategorias = async () => {
    const { data } = await supabase
      .from("husqvarna_products")
      .select("categoria")
      .eq("activo", true);

    const unicas = Array.from(
      new Set((data || []).map((p) => p.categoria).filter(Boolean))
    );

    setCategorias(["Todos", ...unicas]);
  };

  const cargarReglas = async () => {
    const { data } = await supabase
      .from("husqvarna_pricing_rules")
      .select("*")
      .eq("activo", true);

    setReglas(data || []);
  };

  const cargarProductos = async () => {
    setLoading(true);

    let query = supabase
      .from("husqvarna_products")
      .select("*")
      .eq("activo", true)
      .order("descripcion", { ascending: true })
      .limit(100);

    if (categoria !== "Todos") {
      query = query.eq("categoria", categoria);
    }

    if (busqueda.trim() !== "") {
      query = query.or(
        `descripcion.ilike.%${busqueda}%,sku.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%,status.ilike.%${busqueda}%,caracteristicas.ilike.%${busqueda}%,usos.ilike.%${busqueda}%`
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

  const calcularPrecios = (producto: Producto): PreciosCalculados => {
    const gravaIvaProducto = producto.grava_iva ?? true;

    if (producto.tenemos_en_stock && producto.precio_local > 0) {
  const precioLocal = producto.precio_local || 0;

  return {
    origen: "local",
    precioReferencia: producto.pvp_referencia || 0,
    precioSinIva: precioLocal,
    precioConIva: gravaIvaProducto ? precioLocal * 1.15 : precioLocal,
    precioVenta: gravaIvaProducto ? precioLocal * 1.15 : precioLocal,
    gravaIva: gravaIvaProducto,
    tieneRegla: true,
  };
}

    const regla = reglas.find((r) => r.categoria === producto.categoria);

    if (!regla) {
      const pvp = producto.pvp_referencia || 0;
      const precioConIva = gravaIvaProducto ? pvp * 1.15 : pvp;

      return {
        origen: "referencia",
        precioReferencia: pvp,
        precioSinIva: pvp,
        precioConIva,
        precioVenta: precioConIva,
        gravaIva: gravaIvaProducto,
        tieneRegla: false,
      };
    }

    const pvpSinIva = producto.pvp_referencia || 0;

    const costoEstimado =
      pvpSinIva - (pvpSinIva * regla.descuento_empresa_porcentaje) / 100;

    const precioSinIva =
      costoEstimado + (costoEstimado * regla.margen_porcentaje) / 100;

    const precioConIva = gravaIvaProducto
      ? precioSinIva + (precioSinIva * regla.iva_porcentaje) / 100
      : precioSinIva;

    return {
      origen: "regla",
      precioReferencia: pvpSinIva,
      precioSinIva,
      precioConIva,
      precioVenta: precioConIva,
      gravaIva: gravaIvaProducto,
      tieneRegla: true,
    };
  };

  const enviarWhatsApp = async (
  producto: Producto,
  precios: PreciosCalculados,
  disponibilidad: string,
  modo: "numero" | "libre"
) => {
  const telefono = telefonos[producto.id] || "";

  if (modo === "numero" && !telefono) {
    alert("Escribe el número del cliente");
    return;
  }

  const mensaje = `Hola, le comparto información del producto:

${producto.descripcion}

Precio de venta: $${precios.precioVenta.toFixed(2)}

Para más información estamos a las órdenes.`;

  const { error } = await supabase.from("husqvarna_requests").insert([
    {
      product_id: producto.id,
      sku: producto.sku,
      producto: producto.descripcion,
      cliente_telefono: modo === "numero" ? telefono : "Sin número directo",
      vendedor_nombre: vendedorNombre || "Sin vendedor",
      mensaje,
      estado: "pendiente",
      origen: "whatsapp",
    },
  ]);

  if (error) {
    console.error(error);
    alert("No se pudo guardar la solicitud");
    return;
  }

  let whatsappUrl = "";

  if (modo === "numero") {
    const numeroLimpio = telefono.replace(/\D/g, "");
    const numeroEcuador = numeroLimpio.startsWith("593")
      ? numeroLimpio
      : `593${numeroLimpio.slice(-9)}`;

    whatsappUrl = `https://wa.me/${numeroEcuador}?text=${encodeURIComponent(
      mensaje
    )}`;
  } else {
    whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }

  window.open(whatsappUrl, "_blank");
};

const cargarVendedor = async () => {
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    window.location.href = "/login?next=/husqvarna";
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", authData.user.id)
    .single();

  if (profile) {
    setVendedorNombre(profile.full_name || "");
  }
};

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarProductos();
    }, 400);



    return () => clearTimeout(timer);
  }, [busqueda, categoria]);

  return (
    <main className="min-h-screen bg-slate-100 p-5">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-blue-700 font-semibold">
          ← Volver
        </Link>

        <h1 className="text-2xl font-bold mt-4">Catálogo Husqvarna</h1>
        <p className="text-gray-600 mb-5">
          Busca productos, repuestos, precios y disponibilidad.
        </p>

        <input
          type="text"
          placeholder="Buscar por nombre, SKU, categoría, uso o característica..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full p-4 rounded-xl border-2 border-slate-300 mb-4 text-black"
        />

        <div className="flex gap-2 overflow-x-auto mb-5 pb-2">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold ${
                categoria === cat
                  ? "bg-orange-600 text-white"
                  : "bg-slate-200 text-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-5 shadow">
            Cargando productos...
          </div>
        ) : productos.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow">
            No se encontraron productos.
          </div>
        ) : (
          <div className="space-y-4">
            {productos.map((producto) => {
              const precios = calcularPrecios(producto);

              const disponibilidad = producto.tenemos_en_stock
  ? `Disponible en local: ${producto.stock_local || 0}`
  : `Proveedor Quito: ${producto.stock_quito || "N/D"} | Proveedor Guayaquil: ${
      producto.stock_guayaquil || "N/D"
    }`;
              const nombreComercial = producto.descripcion.split("(")[0].trim();

              return (
                <div
                  key={producto.id}
                  className="bg-white rounded-2xl p-5 shadow border border-slate-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
  <h2 className="text-lg font-bold text-slate-900">
    {producto.descripcion}
  </h2>

  <button
    onClick={() => {
      navigator.clipboard.writeText(nombreComercial);
      alert("Nombre copiado");
    }}
    className="bg-slate-200 hover:bg-slate-300 text-slate-900 px-3 py-2 rounded-lg text-sm font-bold"
  >
    Copiar nombre
  </button>
</div>

                  <p className="text-sm text-gray-600 mt-1">
                    SKU: {producto.sku}
                  </p>
                  <p className="text-sm text-gray-600">
                    Categoría: {producto.categoria || "Sin categoría"}
                  </p>

                  <div className="mt-3 rounded-xl bg-orange-50 p-3">
                    <p className="text-sm text-slate-700">
                      PVP referencia sin IVA: $
                      {precios.precioReferencia.toFixed(2)}
                    </p>

                    <p className="text-sm text-slate-700">
                      Precio sin IVA: ${precios.precioSinIva.toFixed(2)}
                    </p>

                    <p className="text-sm text-slate-700">
                      Precio con IVA: ${precios.precioConIva.toFixed(2)}
                    </p>

                    <p className="text-xl font-bold text-orange-700 mt-1">
                      Precio venta: ${precios.precioVenta.toFixed(2)}
                    </p>

                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {precios.gravaIva ? "Grava IVA" : "No grava IVA"}
                    </p>

                    {!precios.tieneRegla && (
                      <p className="text-sm text-red-600 font-semibold mt-1">
                        Sin regla de precio configurada
                      </p>
                    )}

                    <p className="text-sm text-slate-700 mt-2">
                      {disponibilidad}
                    </p>
                  </div>

                  <button
  onClick={() =>
    setCotizarAbierto(
      cotizarAbierto === producto.id ? null : producto.id
    )
  }
  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 mt-4 font-bold"
>
  💬 Cotizar
</button>

{cotizarAbierto === producto.id && (
  <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 space-y-3">
    <input
      type="tel"
      placeholder="Número del cliente"
      value={telefonos[producto.id] || ""}
      onChange={(e) =>
        setTelefonos({
          ...telefonos,
          [producto.id]: e.target.value,
        })
      }
      className="w-full border-2 border-green-300 bg-white text-black rounded-xl p-3"
    />

    <button
      onClick={() =>
        enviarWhatsApp(producto, precios, disponibilidad, "numero")
      }
      className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-bold"
    >
      📱 Enviar a número
    </button>

    <button
      onClick={() =>
        enviarWhatsApp(producto, precios, disponibilidad, "libre")
      }
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold"
    >
      🟢 Abrir WhatsApp
    </button>
  </div>
)}

<a
  href="https://www.husqvarna.com/ec/"
  target="_blank"
  className="fixed bottom-5 right-5 bg-orange-600 hover:bg-orange-700 text-white px-5 py-4 rounded-full shadow-xl font-bold z-50"
>
  Catálogo Husqvarna
</a>


                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}