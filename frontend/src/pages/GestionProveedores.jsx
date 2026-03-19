import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getProviders, createProvider, updateProvider, deleteProvider, getCompanies, getInventories } from "../services/inventoryService";
import { Plus, Edit2, Trash2, Building, Mail, Phone, MapPin, User as UserIcon, Package } from "lucide-react";

export default function GestionProveedores() {
  const [user, setUser] = useState({});
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", contact: "", phone: "", email: "", address: "", company: "" });

  const [companies, setCompanies] = useState([]);
  const [showMerchandiseModal, setShowMerchandiseModal] = useState(false);
  const [selectedProviderName, setSelectedProviderName] = useState("");
  const [providerInventories, setProviderInventories] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        setUser(JSON.parse(stored) || {});
      }
    } catch (e) {
      console.error(e);
    }
    loadProviders();
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setCompanies(await getCompanies());
    } catch (err) {}
  };

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await getProviders();
      setProviders(data);
    } catch (error) {
      console.error("Error loading providers", error);
    }
    setLoading(false);
  };

  const handleOpenModal = (provider = null) => {
    if (provider) {
      setEditingId(provider.id);
      setFormData({ 
        name: provider.name, 
        contact: provider.contact || "", 
        phone: provider.phone || "", 
        email: provider.email || "", 
        address: provider.address || "",
        company: provider.company || "" 
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", contact: "", phone: "", email: "", address: "", company: "" });
    }
    setShowModal(true);
  };
  
  const handleViewMerchandise = async (provider) => {
    setSelectedProviderName(provider.name);
    setShowMerchandiseModal(true);
    try {
       const allInventories = await getInventories();
       const filtered = allInventories.filter(inv => {
          return inv.providers_details && inv.providers_details.some(p => p.id === provider.id);
       });
       console.log(`Mercancía disponible de ${provider.name}:`, filtered);
       setProviderInventories(filtered);
    } catch(err) {
       console.error("Error cargando inventario", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProvider(editingId, formData);
      } else {
        await createProvider(formData);
      }
      setShowModal(false);
      loadProviders();
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Error al guardar proveedor: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de eliminar este proveedor?")) {
      try {
        await deleteProvider(id);
        loadProviders();
      } catch (error) {
        alert("Error al eliminar proveedor");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Gestión de Proveedores</h1>
              <p className="text-slate-500 mt-2">Administra los proveedores vinculados a tu empresa</p>
            </div>
            {(user.role === 'ADMIN' || user.role === 'JEFE_INVENTARIO') && (
              <button 
                onClick={() => handleOpenModal()} 
                className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nuevo Proveedor
              </button>
            )}
          </div>

          {loading ? (
             <div className="w-full flex justify-center py-20 text-slate-400">
                 Cargando proveedores...
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building className="w-8 h-8"/>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Sin proveedores</h3>
                  <p className="text-slate-500 mt-1">Aún no hay proveedores registrados.</p>
                </div>
              ) : (
                providers.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-100 transition-colors flex flex-col justify-between group">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight">{p.name}</h3>
                        {(user.role === 'ADMIN' || user.role === 'JEFE_INVENTARIO') && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleViewMerchandise(p)} className="p-1.5 text-slate-400 hover:text-green-600 rounded bg-slate-50 hover:bg-green-50 mr-1" title="Ver Mercancía">
                              <Package className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleOpenModal(p)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50 hover:bg-blue-50">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2.5">
                        {p.contact && (
                          <div className="flex items-center text-sm text-slate-600">
                            <UserIcon className="w-4 h-4 mr-2.5 text-slate-400" /> {p.contact}
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone className="w-4 h-4 mr-2.5 text-slate-400" /> {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center text-sm text-slate-600 truncate">
                            <Mail className="w-4 h-4 mr-2.5 text-slate-400" /> {p.email}
                          </div>
                        )}
                        {p.address && (
                          <div className="flex items-start text-sm text-slate-600">
                            <MapPin className="w-4 h-4 mr-2.5 text-slate-400 mt-0.5 shrink-0" /> 
                            <span className="line-clamp-2">{p.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL PROVIDER */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-xl">
            <h2 className="font-bold text-xl mb-6 text-slate-800">
              {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Razón Social / Nombre *</label>
                <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
              </div>
              {user.role === 'ADMIN' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Empresa a la que pertenece *</label>
                  <select required value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors">
                     <option value="">Seleccione una Empresa</option>
                     {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contacto</label>
                <input type="text" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Teléfono</label>
                  <input type="text" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                  <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dirección</label>
                <textarea rows="2" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={()=>setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm">
                  {editingId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MERCHANDISE */}
      {showMerchandiseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="font-bold text-xl text-slate-800">
                   Mercancía de {selectedProviderName}
                 </h2>
                 <button onClick={() => setShowMerchandiseModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">X</button>
             </div>
             
             <div className="p-6 overflow-y-auto flex-1">
                 {providerInventories.length === 0 ? (
                    <p className="text-slate-500 text-center py-10">No hay mercancía disponible de este proveedor en ninguna sede.</p>
                 ) : (
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-xs font-semibold">
                        <tr>
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">SKU</th>
                          <th className="px-4 py-3">Sede (Bodega)</th>
                          <th className="px-4 py-3 text-right">Cantidad Disponible</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {providerInventories.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-800">{inv.product_name}</td>
                            <td className="px-4 py-3 text-slate-400">{inv.product_sku}</td>
                            <td className="px-4 py-3">{inv.branch_name}</td>
                            <td className="px-4 py-3 text-right">
                               <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold text-xs">
                                  {inv.quantity} uds
                               </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 )}
             </div>
             <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl text-xs text-slate-500 text-center">
                 Los datos relacionales completos también se han impreso en la consola (F12).
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
