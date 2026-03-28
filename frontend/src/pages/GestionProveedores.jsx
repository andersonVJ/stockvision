import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getProviders, createProvider, updateProvider, deleteProvider, getCompanies, getInventories, getProducts, getCategories } from "../services/inventoryService";
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from "../utils/alerts";
import { Plus, Edit2, Trash2, Building, Mail, Phone, MapPin, User as UserIcon, Package, Target } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) { setPosition(e.latlng); }
  });
  useEffect(() => {
    if (position) map.flyTo(position, 15);
  }, [position, map]);
  
  return position === null ? null : (
    <Marker draggable={true} eventHandlers={{ dragend: (e) => setPosition(e.target.getLatLng()) }} position={position}>
      <Popup>Ubicación</Popup>
    </Marker>
  )
}

export default function GestionProveedores() {
  const [user, setUser] = useState({});
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", contact: "", phone: "", email: "", address: "", company: "", latitud: "", longitud: "" });
  const [mapPosition, setMapPosition] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [showMerchandiseModal, setShowMerchandiseModal] = useState(false);
  const [selectedProviderName, setSelectedProviderName] = useState("");
  const [providerInventories, setProviderInventories] = useState([]);

  // Filtrado Auxiliar
  const [showProviderFilters, setShowProviderFilters] = useState(false);
  const [providerCatFilter, setProviderCatFilter] = useState("");
  const [providerBranchFilter, setProviderBranchFilter] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allInventories, setAllInventories] = useState([]);

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
    loadRelationalData();
  }, []);

  const loadRelationalData = async () => {
    try {
      const [prodRes, catRes, invRes] = await Promise.all([getProducts(), getCategories(), getInventories()]);
      setAllProducts(prodRes);
      setAllCategories(catRes);
      setAllInventories(invRes);
    } catch (err) { }
  };

  const loadCompanies = async () => {
    try {
      setCompanies(await getCompanies());
    } catch (err) { }
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
        company: provider.company || "",
        latitud: provider.latitud || "",
        longitud: provider.longitud || ""
      });
      if (provider.latitud && provider.longitud) {
          setMapPosition({ lat: parseFloat(provider.latitud), lng: parseFloat(provider.longitud) });
      } else {
          setMapPosition(null);
      }
    } else {
      setEditingId(null);
      setFormData({ name: "", contact: "", phone: "", email: "", address: "", company: "", latitud: "", longitud: "" });
      setMapPosition(null);
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
    } catch (err) {
      console.error("Error cargando inventario", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalData = { ...formData };
    if (mapPosition) {
        finalData.latitud = Number(mapPosition.lat).toFixed(6);
        finalData.longitud = Number(mapPosition.lng).toFixed(6);
    }
    try {
      if (editingId) {
        await updateProvider(editingId, finalData);
      } else {
        await createProvider(finalData);
      }
      setShowModal(false);
      showSuccessAlert("Proveedor guardado con éxito");
      loadProviders();
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      showErrorAlert(`Error al guardar proveedor: ${msg}`);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await showConfirmAlert("¿Eliminar proveedor?", "Esta acción no se puede deshacer.");
    if (!isConfirmed) return;
    try {
      await deleteProvider(id);
      showSuccessAlert("Proveedor eliminado con éxito");
      loadProviders();
    } catch (err) {
      showErrorAlert("Error al eliminar proveedor");
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
            <div className="flex gap-3">
              <button
                onClick={() => setShowProviderFilters(!showProviderFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${showProviderFilters ? 'bg-slate-800 text-white' : 'bg-white border text-slate-700 hover:bg-slate-50 border-slate-200'}`}
              >
                Filtros {(providerCatFilter || providerBranchFilter) && <span className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></span>}
              </button>
              {(user.role === 'ADMIN' || user.role === 'JEFE_INVENTARIO') && (
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nuevo Proveedor
                </button>
              )}
            </div>
          </div>

          {showProviderFilters && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo de Mercancía</label>
                <select value={providerCatFilter} onChange={e => setProviderCatFilter(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 outline-none text-sm font-medium text-slate-700 focus:border-blue-500 transition-colors">
                  <option value="">Cualquier Categoría</option>
                  {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {user.role === 'ADMIN' && (
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Provee Mercancía en Sede</label>
                  <select value={providerBranchFilter} onChange={e => setProviderBranchFilter(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50 outline-none font-medium text-slate-700 text-sm focus:border-blue-500 transition-colors">
                    <option value="">Cualquier Sede</option>
                    {Array.from(new Set(allInventories.map(inv => inv.branch_name)))
                      .map(name => allInventories.find(inv => inv.branch_name === name))
                      .map(inv => <option key={inv.branch} value={inv.branch}>{inv.branch_name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <button onClick={() => { setProviderCatFilter(""); setProviderBranchFilter(""); }} className="px-5 py-2.5 text-slate-500 hover:text-slate-800 text-sm font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Limpiar</button>
              </div>
            </div>
          )}

          {!loading && providers.length > 0 && (
            <div className="w-full h-80 mb-6 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative z-0">
               <MapContainer center={[4.6097, -74.0817]} zoom={5} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  {providers.filter(p => p.latitud && p.longitud).map(p => (
                      <Marker key={p.id} position={[parseFloat(p.latitud), parseFloat(p.longitud)]}>
                          <Popup>
                             <div className="font-bold">{p.name}</div>
                             <div className="text-xs text-slate-500">{p.address}</div>
                          </Popup>
                      </Marker>
                  ))}
               </MapContainer>
            </div>
          )}

          {loading ? (
            <div className="w-full flex justify-center py-20 text-slate-400">
              Cargando proveedores...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">Sin proveedores</h3>
                  <p className="text-slate-500 mt-1">Aún no hay proveedores registrados.</p>
                </div>
              ) : (
                providers.filter(p => {
                  let passCat = true;
                  let passBranch = true;
                  if (providerCatFilter) {
                    passCat = allProducts.some(pr => String(pr.category) === String(providerCatFilter) && pr.providers?.includes(p.id));
                  }
                  if (providerBranchFilter && user.role === 'ADMIN') {
                    passBranch = allInventories.some(inv => String(inv.branch) === String(providerBranchFilter) && inv.providers_details?.some(pd => pd.id === p.id));
                  }
                  return passCat && passBranch;
                }).map(p => (
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
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
              </div>
              {user.role === 'ADMIN' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Empresa a la que pertenece *</label>
                  <select required value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors">
                    <option value="">Seleccione una Empresa</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contacto</label>
                <input type="text" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Teléfono</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Dirección</label>
                  <button type="button" onClick={async () => {
                    if(!formData.address) { showErrorAlert("Ingresa una dirección primero"); return; }
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`);
                      const data = await res.json();
                      if(data && data.length > 0) {
                        setMapPosition({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
                      } else { showErrorAlert("No se encontró ubicación"); }
                    } catch(e) { showErrorAlert("Error en búsqueda"); }
                  }} className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                    <Target className="w-3 h-3" /> Ubicar auto.
                  </button>
                </div>
                <textarea rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"></textarea>
              </div>
              <div className="h-40 w-full rounded-xl overflow-hidden border border-slate-200 z-0">
                  <MapContainer center={mapPosition || [4.6097, -74.0817]} zoom={mapPosition ? 15 : 5} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                  </MapContainer>
                  <p className="text-[10px] text-slate-400 text-center mt-1">Arrastra el pin para ajustar la ubicación.</p>
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
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
