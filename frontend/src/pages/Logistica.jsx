import { useState, useEffect, useCallback, useRef } from "react";
import {
    Truck, PlusCircle, RefreshCw, MapPin, CheckCircle,
    XCircle, Clock, ChevronDown, ChevronUp, Calendar,
    Navigation, Building2, ArrowDownCircle
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Swal from "sweetalert2";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getProviders } from "../services/inventoryService";

// Fix Leaflet default icon paths for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored icons per stop state
const getStopIcon = (estado) => {
    const COLORS = { PENDIENTE: "#f59e0b", ENTREGADO: "#22c55e", FALLIDO: "#ef4444" };
    const color = COLORS[estado] || "#6366f1";
    return L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>`,
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
    });
};

const branchIcon = L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center">
             <div style="transform:rotate(45deg);color:white;font-weight:bold;font-size:12px">S</div></div>`,
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
});

const supplierIcon = L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:#7c3aed;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center">
             <div style="transform:rotate(45deg);color:white;font-weight:bold;font-size:12px">P</div></div>`,
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
});

const API = "http://127.0.0.1:8000/api/logistics";

function getAuthHeaders() {
    const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
    return { Authorization: `Bearer ${tokens.access}` };
}

const ESTADO_RUTA = {
    PENDIENTE:  { label: "Pendiente",  color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    EN_CURSO:   { label: "En Curso",   color: "bg-blue-100 text-blue-800 border-blue-200"   },
    FINALIZADA: { label: "Finalizada", color: "bg-green-100 text-green-800 border-green-200" },
};

const ESTADO_PARADA = {
    PENDIENTE: { label: "Pendiente",  color: "text-yellow-700 bg-yellow-50", icon: Clock         },
    ENTREGADO: { label: "Entregado",  color: "text-green-700 bg-green-50",   icon: CheckCircle   },
    FALLIDO:   { label: "Fallido",    color: "text-red-600 bg-red-50",       icon: XCircle       },
};

// Colombia center as default (moves to stops when loaded) - Medellín
const DEFAULT_CENTER = [6.2442, -75.5812];

function FitBounds({ markers }) {
    const map = useMap();
    useEffect(() => {
        if (!markers || markers.length === 0) return;
        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
    }, [markers, map]);
    return null;
}

export default function Logistica() {
    const [rutas, setRutas] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRuta, setSelectedRuta] = useState(null);
    const [filtroEstado, setFiltroEstado] = useState("TODOS");
    const [showGenerarModal, setShowGenerarModal] = useState(false);
    const [formGenerar, setFormGenerar] = useState({
        fecha: new Date().toISOString().split("T")[0],
        zona: "",
        transportador: "",
    });

    const fetchRutas = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/routes/`, { headers: getAuthHeaders() });
            setRutas(res.data);
            if (!selectedRuta && res.data.length > 0) setSelectedRuta(res.data[0]);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [selectedRuta]);

    useEffect(() => { 
        fetchRutas(); 
        const fetchProviders = async () => {
            try {
                const data = await getProviders();
                setProviders(data);
            } catch (err) { console.error("Error fetching providers", err); }
        };
        fetchProviders();
    }, [fetchRutas]);

    const handleGenerarRuta = async () => {
        try {
            const res = await axios.post(`${API}/routes/generate_route/`, formGenerar, { headers: getAuthHeaders() });
            Swal.fire({ icon: "success", title: "¡Ruta generada!", text: `Ruta #${res.data.id} — ${res.data.total_paradas} parada(s).`, confirmButtonColor: "#2563eb" });
            setShowGenerarModal(false);
            await fetchRutas();
            setSelectedRuta(res.data);
        } catch (err) {
            Swal.fire({ icon: "warning", title: "Aviso", text: err.response?.data?.detail || "No se pudo generar la ruta.", confirmButtonColor: "#2563eb" });
        }
    };

    const handleSetEstado = async (rutaId, nuevoEstado) => {
        try {
            await axios.post(`${API}/routes/${rutaId}/set_estado/`, { estado: nuevoEstado }, { headers: getAuthHeaders() });
            fetchRutas();
        } catch { Swal.fire({ icon: "error", title: "Error", text: "No se pudo cambiar el estado.", confirmButtonColor: "#2563eb" }); }
    };

    const handleUpdateStop = async (rutaId, stopId, nuevoEstado) => {
        const { value: notas, isConfirmed } = await Swal.fire({
            title: `Marcar como "${ESTADO_PARADA[nuevoEstado]?.label}"`,
            input: "textarea", inputLabel: "Notas (opcional)",
            showCancelButton: true, confirmButtonText: "Confirmar",
            cancelButtonText: "Cancelar", confirmButtonColor: "#2563eb",
        });
        if (!isConfirmed) return;
        try {
            await axios.post(`${API}/routes/${rutaId}/update_stop/`, { stop_id: stopId, estado_entrega: nuevoEstado, notas: notas || "" }, { headers: getAuthHeaders() });
            fetchRutas();
        } catch { Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar.", confirmButtonColor: "#2563eb" }); }
    };

    const rutasFiltradas = filtroEstado === "TODOS" ? rutas : rutas.filter(r => r.estado === filtroEstado);

    // Build map markers from selected route
    // Since we don't have geocoded coordinates, we simulate spread positions
    // around the branch address region (Colombia lat/lng).
    // In a real scenario, the Branch model would have lat/lng fields.
    const mapMarkers = selectedRuta ? selectedRuta.paradas.map((p, i) => {
        const angle = (2 * Math.PI * i) / Math.max(selectedRuta.paradas.length, 1);
        const radius = 0.05 + 0.03 * Math.floor(i / 6);
        return {
            lat: DEFAULT_CENTER[0] + Math.sin(angle) * radius,
            lng: DEFAULT_CENTER[1] + Math.cos(angle) * radius,
            parada: p,
            label: `#${p.orden_entrega}`,
        };
    }) : [];

    const branchMarker = selectedRuta ? {
        lat: DEFAULT_CENTER[0],
        lng: DEFAULT_CENTER[1],
        name: selectedRuta.branch_name || "Sede principal",
    } : null;

    const supplierMarker = (selectedRuta && selectedRuta.tipo === "ENTRADA") ? {
        lat: DEFAULT_CENTER[0] + 0.04,
        lng: DEFAULT_CENTER[1] + 0.04,
        name: selectedRuta.origin_supplier || "Proveedor",
    } : null;

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <Sidebar />

            {/* Left panel — route list */}
            <div className="w-80 shrink-0 flex flex-col bg-white border-r border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-600 rounded-xl"><Truck className="w-4 h-4 text-white" /></div>
                        <h1 className="text-base font-bold text-slate-800">Rutas de Entrega</h1>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchRutas} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-100">
                            <RefreshCw className="w-3 h-3" /> Actualizar
                        </button>
                        <button onClick={() => setShowGenerarModal(true)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200">
                            <PlusCircle className="w-3 h-3" /> Generar Ruta
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="px-4 py-2 flex gap-1 flex-wrap border-b border-slate-50">
                    {["TODOS", "PENDIENTE", "EN_CURSO", "FINALIZADA"].map(e => (
                        <button key={e} onClick={() => setFiltroEstado(e)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${filtroEstado === e ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}>
                            {e === "TODOS" ? "Todas" : ESTADO_RUTA[e]?.label}
                        </button>
                    ))}
                </div>

                {/* Route list */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center pt-12"><div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : rutasFiltradas.length === 0 ? (
                        <div className="text-center py-10 px-4">
                            <Truck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">No hay rutas</p>
                        </div>
                    ) : rutasFiltradas.map(ruta => {
                        const cfg = ESTADO_RUTA[ruta.estado] || {};
                        const progreso = ruta.total_paradas > 0 ? Math.round((ruta.paradas_entregadas / ruta.total_paradas) * 100) : (ruta.estado === "FINALIZADA" ? 100 : 0);
                        const isSelected = selectedRuta?.id === ruta.id;
                        const isEntrada = ruta.tipo === "ENTRADA";
                        const isInterno = ruta.tipo === "INTERNO";

                        return (
                            <div key={ruta.id}
                                onClick={() => setSelectedRuta(ruta)}
                                className={`p-4 border-b border-slate-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-slate-50"}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isEntrada ? "bg-violet-100 text-violet-700" : isInterno ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                            {isEntrada ? "Entrada" : isInterno ? "Interno" : "Salida"}
                                        </span>
                                        <span className="text-sm font-bold text-slate-700">Ruta #{ruta.id}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>{cfg.label}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                    <Calendar className="w-3 h-3" /> {ruta.fecha}
                                    {ruta.zona && <><MapPin className="w-3 h-3 ml-2" /> {ruta.zona}</>}
                                </div>
                                {isEntrada ? (
                                    <div className="flex items-center gap-1 text-xs text-violet-600 font-medium mb-2">
                                        <ArrowDownCircle className="w-3 h-3" /> Prov: {ruta.origin_supplier}
                                    </div>
                                ) : isInterno ? (
                                    <div className="flex items-center gap-1 text-xs text-orange-600 font-medium mb-2">
                                        <Building2 className="w-3 h-3" /> Origen: {ruta.origin_supplier || "Sede Matriz"}
                                    </div>
                                ) : (
                                    ruta.transportador && <div className="flex items-center gap-1 text-xs text-slate-400 mb-2"><Truck className="w-3 h-3" /> {ruta.transportador}</div>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${isEntrada ? "bg-violet-500" : isInterno ? "bg-orange-500" : "bg-blue-500"}`} style={{ width: `${progreso}%` }} />
                                    </div>
                                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                        {(isEntrada || isInterno) ? (ruta.estado === "FINALIZADA" ? "Completado" : "Pendiente") : `${ruta.paradas_entregadas}/${ruta.total_paradas}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right — Map + detail */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedRuta ? (
                    <>
                        {/* Route info bar */}
                        <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="font-bold text-slate-800 text-sm">
                                        {selectedRuta.tipo === "ENTRADA" ? "Pedido de Marca" : selectedRuta.tipo === "INTERNO" ? "Traslado Interno" : "Hoja de Ruta"} #{selectedRuta.id}
                                        {selectedRuta.zona && <span className="ml-2 text-slate-400 font-normal">— {selectedRuta.zona}</span>}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        {selectedRuta.fecha}
                                        {selectedRuta.tipo === "ENTRADA" ? ` · Proveedor: ${selectedRuta.origin_supplier}` : selectedRuta.tipo === "INTERNO" ? ` · Origen: ${selectedRuta.origin_supplier || 'Sede Matriz'}` : (selectedRuta.transportador && ` · Transportador: ${selectedRuta.transportador}`)}
                                        {selectedRuta.branch_name && ` · Sede Destino: ${selectedRuta.branch_name}`}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${ESTADO_RUTA[selectedRuta.estado]?.color}`}>
                                    {ESTADO_RUTA[selectedRuta.estado]?.label}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {["PENDIENTE","EN_CURSO","FINALIZADA"].filter(e => e !== selectedRuta.estado).map(e => (
                                    <button key={e} onClick={() => handleSetEstado(selectedRuta.id, e)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${ESTADO_RUTA[e]?.color}`}>
                                        → {ESTADO_RUTA[e]?.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Map */}
                        <div className="relative" style={{ height: "340px" }}>
                            <MapContainer
                                center={DEFAULT_CENTER}
                                zoom={11}
                                style={{ height: "100%", width: "100%" }}
                                zoomControl={true}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <FitBounds markers={[
                                    ...mapMarkers, 
                                    branchMarker ? { lat: branchMarker.lat, lng: branchMarker.lng } : null,
                                    supplierMarker ? { lat: supplierMarker.lat, lng: supplierMarker.lng } : null
                                ].filter(Boolean)} />

                                {/* Branch marker */}
                                {branchMarker && (
                                    <Marker position={[branchMarker.lat, branchMarker.lng]} icon={branchIcon}>
                                        <Popup>
                                            <div className="font-semibold text-blue-700 flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5" /> {branchMarker.name}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Sede destino de la ruta</p>
                                        </Popup>
                                    </Marker>
                                )}

                                {/* Default Supplier marker (For old ENTRADA without coords) */}
                                {supplierMarker && (
                                    <Marker position={[supplierMarker.lat, supplierMarker.lng]} icon={supplierIcon}>
                                        <Popup>
                                            <div className="font-semibold text-violet-700 flex items-center gap-1">
                                                <ArrowDownCircle className="w-3.5 h-3.5" /> {supplierMarker.name}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Proveedor de origen</p>
                                        </Popup>
                                    </Marker>
                                )}

                                {/* ALL providers dynamically with coordinates */}
                                {providers.filter(p => p.latitud && p.longitud).map(p => (
                                    <Marker key={`prov-${p.id}`} position={[parseFloat(p.latitud), parseFloat(p.longitud)]} icon={supplierIcon}>
                                        <Popup>
                                            <div className="font-semibold text-violet-700 flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5" /> {p.name}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1 border-t pt-1 border-slate-200">
                                                Proveedor registrado<br/>{p.address}
                                            </p>
                                        </Popup>
                                    </Marker>
                                ))}

                                {/* Stop markers */}
                                {mapMarkers.map((m, i) => {
                                    const pc = ESTADO_PARADA[m.parada.estado_entrega] || {};
                                    return (
                                        <Marker key={i} position={[m.lat, m.lng]} icon={getStopIcon(m.parada.estado_entrega)}>
                                            <Popup minWidth={200}>
                                                <div className="font-bold text-slate-800 mb-1">Parada #{m.parada.orden_entrega}</div>
                                                <div className={`text-xs px-2 py-0.5 rounded-full inline-block font-semibold mb-2 ${pc.color}`}>{pc.label}</div>
                                                <p className="text-xs text-slate-600"><strong>Venta:</strong> #{m.parada.venta_id}</p>
                                                {m.parada.client_name && <p className="text-xs text-slate-600"><strong>Cliente:</strong> {m.parada.client_name}</p>}
                                                <p className="text-xs text-slate-600"><strong>Sede:</strong> {m.parada.branch_name}</p>
                                                <p className="text-xs text-slate-600"><strong>Total:</strong> ${Number(m.parada.total_venta).toFixed(2)}</p>
                                                {m.parada.notas && <p className="text-xs text-slate-500 mt-1 italic">{m.parada.notas}</p>}
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>

                            {/* Map legend */}
                            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 text-xs space-y-1 z-[999] shadow-sm">
                                <p className="font-semibold text-slate-600 mb-1">Leyenda</p>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600" /> Sede Destino</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-500" /> Proveedor (Origen)</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /> Parada Pendiente</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /> Entregado</div>
                            </div>

                            {selectedRuta.paradas.length === 0 && selectedRuta.tipo !== "ENTRADA" && selectedRuta.tipo !== "INTERNO" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-[998]">
                                    <div className="text-center">
                                        <Navigation className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm font-medium">Sin paradas en esta ruta</p>
                                    </div>
                                </div>
                            )}
                            {(selectedRuta.tipo === "ENTRADA" || selectedRuta.tipo === "INTERNO") && (
                                <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-xl border flex items-center gap-3 z-[999] ${selectedRuta.tipo === "INTERNO" ? "border-orange-100" : "border-violet-100"}`}>
                                    <div className={`p-2 rounded-full ${selectedRuta.tipo === "INTERNO" ? "bg-orange-100" : "bg-violet-100"}`}>
                                        <ArrowDownCircle className={`w-5 h-5 ${selectedRuta.tipo === "INTERNO" ? "text-orange-600" : "text-violet-600"}`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Origen: {selectedRuta.origin_supplier || "Sede Matriz"}</p>
                                        <p className="text-sm font-bold text-slate-800">Enviando a {selectedRuta.branch_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stops detail list */}
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            <div className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white border-b border-slate-100">
                                Detalle de Paradas — {selectedRuta.paradas.length} total
                            </div>
                            {selectedRuta.paradas.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">Esta ruta no tiene paradas asignadas.</div>
                            ) : selectedRuta.paradas.map(parada => {
                                const pCfg = ESTADO_PARADA[parada.estado_entrega] || {};
                                const PIcon = pCfg.icon || Clock;
                                return (
                                    <div key={parada.id} className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm shrink-0">
                                                {parada.orden_entrega}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    Venta #{parada.venta_id}
                                                    {parada.client_name !== "Sin cliente registrado" && (
                                                        <span className="font-normal text-slate-500 ml-1.5">— {parada.client_name}</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" /> {parada.branch_name}
                                                    <span className="ml-2">${Number(parada.total_venta).toFixed(2)}</span>
                                                </p>
                                                {parada.notas && <p className="text-xs text-slate-400 italic mt-0.5">{parada.notas}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${pCfg.color}`}>
                                                <PIcon className="w-3 h-3" /> {pCfg.label}
                                            </span>
                                            {parada.estado_entrega === "PENDIENTE" && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleUpdateStop(selectedRuta.id, parada.id, "ENTREGADO")}
                                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Entregado">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleUpdateStop(selectedRuta.id, parada.id, "FALLIDO")}
                                                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Fallido">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                            <Navigation className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Selecciona o genera una ruta</p>
                            <p className="text-slate-300 text-sm mt-1">para ver el mapa de entregas</p>
                            <button onClick={() => setShowGenerarModal(true)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 mx-auto">
                                <PlusCircle className="w-4 h-4" /> Generar primera ruta
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Generar Ruta */}
            {showGenerarModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Generar Ruta del Día</h2>
                        <p className="text-sm text-slate-500 mb-5">El sistema agrupará todas las ventas completadas de la fecha que aún no tienen ruta.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                <input type="date" value={formGenerar.fecha} onChange={e => setFormGenerar(p => ({ ...p, fecha: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Zona (opcional)</label>
                                <input type="text" placeholder="Norte, Sur, Centro..." value={formGenerar.zona} onChange={e => setFormGenerar(p => ({ ...p, zona: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Transportador (opcional)</label>
                                <input type="text" placeholder="Nombre del conductor..." value={formGenerar.transportador} onChange={e => setFormGenerar(p => ({ ...p, transportador: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowGenerarModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
                            <button onClick={handleGenerarRuta} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Generar Ruta</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
