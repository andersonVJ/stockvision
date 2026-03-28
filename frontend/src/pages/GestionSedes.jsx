import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getBranches, createBranch, updateBranch, deleteBranch, getCompanies } from "../services/inventoryService";
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from "../utils/alerts";
import { Target } from "lucide-react";
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
      <Popup>Ubicación de Sede</Popup>
    </Marker>
  )
}

export default function GestionSedes() {
  const [user, setUser] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", address: "", company: "", latitud: "", longitud: "" });
  const [mapPosition, setMapPosition] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

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
    loadCompanies();
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

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error("Error al cargar empresas", err);
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
      if (isEditing) {
        await updateBranch(editingId, finalData);
        showSuccessAlert("Sede actualizada con éxito.");
      } else {
        await createBranch(finalData);
        showSuccessAlert("Sede creada con éxito. Se generaron inventarios en 0 para los productos existentes.");
      }
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      setFormData({ name: "", address: "", company: "", latitud: "", longitud: "" });
      setMapPosition(null);
      loadBranches();
    } catch (err) {
      console.error(err.response?.data || err);
      showErrorAlert(isEditing ? "Error al actualizar la sede" : "Error al crear la sede");
    }
  };

  const handleEditBranch = (branch) => {
    setFormData({ 
      name: branch.name, 
      address: branch.address || "", 
      company: branch.company || "",
      latitud: branch.latitud || "",
      longitud: branch.longitud || ""
    });
    if (branch.latitud && branch.longitud) {
        setMapPosition({ lat: parseFloat(branch.latitud), lng: parseFloat(branch.longitud) });
    } else {
        setMapPosition(null);
    }
    setEditingId(branch.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteBranch = async (id) => {
    const isConfirmed = await showConfirmAlert("¿Eliminar Sede?", "Se eliminarán permanentemente los empleados e inventarios asociados a esta sede. Esta acción es irreversible.");
    if (!isConfirmed) return;
    try {
      await deleteBranch(id);
      showSuccessAlert("Sede eliminada con éxito.");
      loadBranches();
    } catch (err) {
      showErrorAlert("Error al eliminar la sede.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-slate-800 w-full sm:w-auto text-left">
              Gestión de Sedes (Bodegas)
            </h1>

            <div className="flex gap-4 w-full sm:w-auto">
              {(user.role === "ADMIN" || companies.length > 0) && (
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 w-full sm:w-auto"
                >
                  <option value="">Todas las Empresas</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              {user.role === "ADMIN" && (
                <button
                  onClick={() => {
                    setFormData({ name: "", address: "", company: "", latitud: "", longitud: "" });
                    setMapPosition(null);
                    setIsEditing(false);
                    setEditingId(null);
                    setShowModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  + Nueva Sede
                </button>
              )}
            </div>
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
                    {user.role === "ADMIN" && <th className="px-6 py-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches
                    .filter(b => selectedCompanyId ? String(b.company) === String(selectedCompanyId) || b.company_name === companies.find(c => String(c.id) === String(selectedCompanyId))?.name : true)
                    .map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{b.name}</td>
                      <td className="px-6 py-4">{b.address || "-"}</td>
                      <td className="px-6 py-4">{b.company_name}</td>
                      <td className="px-6 py-4 text-slate-400">#{b.id}</td>
                      {user.role === "ADMIN" && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditBranch(b)}
                            className="text-blue-600 hover:text-blue-800 font-medium mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(b.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
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
            <h2 className="text-2xl font-bold mb-6 text-slate-800">{isEditing ? "Editar Sede" : "Registrar Sede"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Sede Norte" />
              </div>
              {user.role === 'ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa a la que pertenece *</label>
                  <select required value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                     <option value="">Seleccione una Empresa</option>
                     {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-slate-700">Dirección</label>
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
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Calle Principal 123" />
              </div>

              <div className="h-40 w-full rounded-xl overflow-hidden border border-slate-300 z-0">
                  <MapContainer center={mapPosition || [4.6097, -74.0817]} zoom={mapPosition ? 15 : 5} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                  </MapContainer>
                  <p className="text-[10px] text-slate-400 text-center mt-1 outline-none">Arrastra el pin para centrar tu Sede.</p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  {isEditing ? "Guardar Cambios" : "Registrar Sede"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
