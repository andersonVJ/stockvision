import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getBranches, createBranch } from "../services/inventoryService";

export default function GestionSedes() {
  const [user, setUser] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", address: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        setUser(JSON.parse(stored) || {});
      }
    } catch (e) {
      console.error(e);
    }
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      await createBranch(formData);
      setShowModal(false);
      setFormData({ name: "", address: "" });
      loadBranches();
      alert("Sede creada con éxito. Recuerda que al crear una sede, se generaron inventarios en 0 para todos los productos existentes en esta sede.");
    } catch (err) {
      alert("Error al crear la sede");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">
              Gestión de Sedes (Bodegas)
            </h1>

            {user.role === "ADMIN" && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                + Nueva Sede
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Cargando sedes...</div>
            ) : branches.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No hay sedes registradas.</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Nombre de la Sede</th>
                    <th className="px-6 py-4">Dirección</th>
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{b.name}</td>
                      <td className="px-6 py-4">{b.address || "-"}</td>
                      <td className="px-6 py-4">{b.company_name}</td>
                      <td className="px-6 py-4 text-slate-400">#{b.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Registrar Sede</h2>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Sede Norte" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección (Opcional)</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Calle Principal 123" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Registrar Sede</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
