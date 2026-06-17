import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-white text-3xl font-bold text-center mb-2">
          Panel de Empresa
        </h1>

        <p className="text-slate-400 text-center mb-8">
          Selecciona una opción
        </p>

        <div className="grid gap-4">
          <Link
            href="/trabajador"
            className="bg-blue-600 text-white text-center py-5 rounded-2xl text-xl font-semibold shadow-lg"
          >
            Horario
          </Link>

          <Link
            href="/husqvarna"
            className="bg-orange-500 text-white text-center py-5 rounded-2xl text-xl font-semibold shadow-lg"
          >
            Husqvarna
          </Link>
        </div>
      </div>
    </main>
  );
}