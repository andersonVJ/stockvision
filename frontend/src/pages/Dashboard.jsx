import Sidebar from "../components/Sidebar";
import { Box, AlertTriangle, TrendingUp, Activity, Bell } from "lucide-react";

export default function Dashboard() {

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-sm font-medium text-slate-400 mt-1">Resumen general del inventario</p>
          </div>

          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            {/* Card 1 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Box className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex items-center text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12%
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Total Productos</p>
                <h3 className="text-2xl font-bold text-slate-800">1,247</h3>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-orange-50 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex items-center text-red-500 bg-red-50 px-2 py-1 rounded-md text-xs font-semibold">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  3 críticos
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Alertas Activas</p>
                <h3 className="text-2xl font-bold text-slate-800">18</h3>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-center text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8.5%
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Rotación</p>
                <h3 className="text-2xl font-bold text-slate-800">24.5 días</h3>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-purple-50 rounded-xl">
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex items-center text-blue-500 bg-blue-50 px-2 py-1 rounded-md text-xs font-semibold">
                  <Activity className="w-3 h-3 mr-1" />
                  95.2%
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Precisión IA</p>
                <h3 className="text-2xl font-bold text-slate-800">Alta</h3>
              </div>
            </div>

          </div>

          {/* Bottom Section (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

            {/* Left: Alertas Recientes */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col">
              <div className="flex items-center mb-6">
                <Bell className="w-[18px] h-[18px] text-blue-600 mr-2" />
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Alertas Recientes</h3>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <div className="bg-red-50/70 border border-red-100 rounded-xl p-4">
                  <p className="text-sm font-bold text-red-900 mb-1">Stock crítico: Laptop Dell XPS</p>
                  <p className="text-xs font-medium text-red-600/70">Hace 5 min - Solo 5 unidades</p>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
                  <p className="text-sm font-bold text-amber-900 mb-1">Predicción: Alta demanda Mayo</p>
                  <p className="text-xs font-medium text-amber-700/70">Hace 1 hora - +15% esperado</p>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm font-bold text-blue-900 mb-1">Reabastecimiento exitoso</p>
                  <p className="text-xs font-medium text-blue-600/70">Hace 2 horas - 45 productos</p>
                </div>
              </div>
            </div>

            {/* Right: Movimientos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col">
              <div className="flex items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Movimientos (30 días)</h3>
              </div>

              <div className="flex-1 flex items-end justify-between space-x-2 pt-4 px-2 h-full">
                {/* Simulated Bar Chart */}
                {[45, 60, 30, 80, 95, 65, 85, 70, 90, 60, 80, 50].map((height, i) => (
                  <div
                    key={i}
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 hover:opacity-80 transition-opacity rounded-t-sm relative group cursor-pointer"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-medium">
                      Actividad
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}