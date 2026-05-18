import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Logo from "../components/Logo";
import { getSales } from "../services/inventoryService";
import { FileText, Calendar, MapPin, Search } from "lucide-react";

export default function HistorialVentas() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState({});
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    fetchSales();
  }, [month, year]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await getSales({ month, year });
      setSales(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(s => 
    s.id.toString().includes(searchTerm) || 
    (s.branch_name && s.branch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.user_name && s.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Logo />
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Historial de Ventas</h1>
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                Facturas Emitidas
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="pl-3 pr-2 py-1.5 bg-transparent text-sm focus:outline-none font-medium cursor-pointer"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <div className="w-px h-4 bg-slate-200" />
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="pl-2 pr-3 py-1.5 bg-transparent text-sm focus:outline-none font-medium cursor-pointer"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar en este periodo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 pl-12 text-center text-slate-400 font-medium">Cargando ventas...</div>
              ) : filteredSales.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium">No hay ventas registradas en el periodo.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Nº Factura</th>
                      <th className="p-4">Fecha</th>
                      <th className="p-4">Sede (Bodega)</th>
                      <th className="p-4">Cajero</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-6 font-semibold text-slate-700">ORD-{sale.id.toString().padStart(6, '0')}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <MapPin className="w-4 h-4 text-indigo-400" />
                            {sale.branch_name}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-600 truncate max-w-[120px]">
                          {sale.user_name}
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits:0 }).format(parseFloat(sale.total))}
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-500 max-w-[200px] truncate pr-6">
                            {sale.items?.length || 0} productos
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
