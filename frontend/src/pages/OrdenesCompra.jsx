import { useState, useEffect, useCallback } from "react";
import {
    ShoppingCart, PlusCircle, RefreshCw, CheckCircle, Truck, MapPin,
    Package, XCircle, Lightbulb, ArrowRight, Layers,
    ChevronDown, ChevronUp, ClipboardCheck, History
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Swal from "sweetalert2";
import axios from "axios";
import { getOrders, createOrder, approveOrder, deliverOrder, rejectOrder } from "../services/orderService";
import { getProducts, getBranches, getProviders } from "../services/inventoryService";

const API_LOGISTICS = "http://127.0.0.1:8000/api/logistics";
const API_INVENTORY = "http://127.0.0.1:8000/api/inventory";

function getAuthHeaders() {
    const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
    return { Authorization: `Bearer ${tokens.access}` };
}

// ─── Status configs ────────────────────────────────────────────────────────────

const ESTADO_OC_CONFIG = {
    BORRADOR:    { label: "Borrador",             color: "bg-slate-100 text-slate-600 border-slate-200" },
    PENDIENTE:   { label: "Pend. Aprobación",     color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    APROBADA:    { label: "Aprobada",             color: "bg-blue-100 text-blue-700 border-blue-200" },
    EN_TRANSITO: { label: "En Tránsito",          color: "bg-purple-100 text-purple-700 border-purple-200" },
    RECIBIDA:    { label: "Recibida",             color: "bg-green-100 text-green-700 border-green-200" },
    CANCELADA:   { label: "Cancelada",            color: "bg-red-100 text-red-600 border-red-200" },
};

const STATUS_PEDIDO = {
    PENDING_APPROVAL: { label: "Pendiente",        color: "bg-yellow-100 text-yellow-700" },
    APPROVED:         { label: "Aprobado",         color: "bg-blue-100 text-blue-700" },
    IN_TRANSIT:       { label: "En Tránsito",      color: "bg-purple-100 text-purple-700" },
    DELIVERED:        { label: "Recibido",         color: "bg-green-100 text-green-700" },
    REJECTED:         { label: "Rechazado",        color: "bg-red-100 text-red-600" },
};

const EMPTY_OC = { proveedor: "", estado: "BORRADOR", notas: "", items: [] };

// ─── Catálogo de marcas oficiales ─────────────────────────────────────────────
const BRANDS = [
    { name: "Samsung", website: "https://www.samsung.com", emoji: "📱", color: "#1428A0", products: [
        "Galaxy S24 Ultra 256GB", "Galaxy Tab S9 FE", "Monitor Odyssey G5 27\"", "Galaxy Book4 Pro", "TV QLED 55\" Q80D", "Soundbar HW-Q700C", "Galaxy A55 5G",
    ]},
    { name: "Apple", website: "https://www.apple.com", emoji: "🍎", color: "#555", products: [
        "iPhone 15 Pro Max 256GB", "MacBook Air M3 15\"", "iPad Pro M4 11\"", "Apple Watch Series 9", "AirPods Pro 2da gen", "Mac Mini M4", "Apple TV 4K",
    ]},
    { name: "HP", website: "https://www.hp.com", emoji: "🖥️", color: "#0096D6", products: [
        "HP EliteBook 840 G11", "HP LaserJet Pro M404n", "HP Pavilion 27\" All-in-One", "HP OfficeJet Pro 9020e", "HP ZBook Fury 16 G10", "HP 27f 4K Display", "HP DeskJet 4155e",
    ]},
    { name: "Lenovo", website: "https://www.lenovo.com", emoji: "💻", color: "#E2231A", products: [
        "ThinkPad X1 Carbon Gen 12", "IdeaPad 5 Pro 16\"", "Legion 5 Pro 16\" RTX 4070", "ThinkCentre M70s", "Lenovo Tab P12 Pro", "ThinkVision T27h-20", "Yoga Book 9i",
    ]},
    { name: "Dell", website: "https://www.dell.com", emoji: "💽", color: "#007DB8", products: [
        "Dell XPS 15 9530", "Dell Latitude 5440", "Dell UltraSharp U2724D 27\"", "Dell Precision 3680", "Dell Optiplex 7010", "Dell P2423D Monitor", "Dell Alienware m16 R2",
    ]},
    { name: "Sony", website: "https://www.sony.com", emoji: "🎧", color: "#222", products: [
        "Sony WH-1000XM5 Headphones", "PlayStation 5 Slim", "Bravia XR A80L OLED 65\"", "Sony ZV-E10 II Camera", "Sony SRS-XB43 Speaker", "Sony WF-1000XM5 Earbuds", "DualSense Controller",
    ]},
    { name: "LG", website: "https://www.lg.com", emoji: "📺", color: "#A50034", products: [
        "LG OLED C4 65\"", "LG UltraGear 27GP850", "LG Gram 16 2-in-1", "LG SoundBar S75Q", "LG 32UN880 Monitor", "LG WashTower", "LG StanbyME 27\" Pantalla Móvil",
    ]},
    { name: "Huawei", website: "https://www.huawei.com", emoji: "📡", color: "#CF0A2C", products: [
        "Huawei MatePad Pro 13.2\"", "Huawei Watch GT 4", "Huawei MateBook X Pro", "Huawei FreeBuds Pro 3", "Huawei Mate 60 Pro", "Huawei MateStation X", "Router Huawei WiFi AX3",
    ]},
    { name: "Asus", website: "https://www.asus.com", emoji: "🖱️", color: "#00539B", products: [
        "ASUS ROG Strix G16 RTX 4080", "ASUS ZenBook 14 OLED", "ASUS ProArt Display PA278CGV", "ASUS ROG Phone 8 Pro", "ASUS ExpertBook B9", "ASUS TUF Gaming F15", "ROG Zephyrus G14",
    ]},
    { name: "Acer", website: "https://www.acer.com", emoji: "🖨️", color: "#83B81A", products: [
        "Acer Swift 14 AI", "Acer Nitro V 15 RTX 4060", "Acer Predator Helios 18", "Acer CB2 Chromebook", "Acer Nitro Monitor 27\" QHD", "Acer Veriton N Desktop", "Acer EK271 Monitor",
    ]},
    { name: "Microsoft", website: "https://www.microsoft.com", emoji: "🪟", color: "#00A4EF", products: [
        "Surface Pro 10", "Surface Laptop 6 15\"", "Xbox Series X 1TB", "Microsoft 365 Business Premium (1 año)", "Surface Studio 2+", "Wireless Keyboard & Mouse 900", "Xbox Controller",
    ]},
    { name: "Google", website: "https://store.google.com", emoji: "🔍", color: "#4285F4", products: [
        "Pixel 9 Pro 256GB", "Pixel Watch 3 45mm", "Nest Hub Max 10\"", "Pixel Tablet 11\"", "Google TV Streamer 4K", "Pixel Buds Pro 2", "Nest Wifi Pro",
    ]},
    { name: "Xiaomi", website: "https://www.mi.com", emoji: "📲", color: "#FF6900", products: [
        "Xiaomi 14T Pro 512GB", "Redmi Pad Pro 12.1\"", "Xiaomi Watch S3", "Redmi Note 13 Pro 5G", "Xiaomi Buds 4 Pro", "Xiaomi Smart Band 8 Pro", "Mi TV Stick 4K",
    ]},
    { name: "Canon", website: "https://www.canon.com", emoji: "📷", color: "#CC0000", products: [
        "Canon EOS R10 + 18-45mm Kit", "Canon PIXMA G7020", "Canon imageCLASS MF753Cdw", "Canon EF 50mm f/1.8", "Canon EOS R5 C", "Canon SELPHY CP1500", "Canon EOS M50 Mark II",
    ]},
    { name: "Epson", website: "https://www.epson.com", emoji: "🖨️", color: "#003087", products: [
        "Epson EcoTank L3560", "Epson WorkForce WF-7840", "Epson SureColor SC-T3170", "Epson EB-L610U Proyector", "Epson FastFoto FF-680W", "Epson PowerLite L730U", "Epson ET-2850",
    ]},
    { name: "Logitech", website: "https://www.logitech.com", emoji: "🕹️", color: "#00B8FC", products: [
        "MX Master 3S Mouse", "MX Keys S Keyboard", "BRIO 4K Webcam Ultra HD", "G Pro X Superlight 2", "Zone Vibe 125 Headset", "MX Mechanical Mini Keyboard", "Bolt USB Receiver",
    ]},
];


export default function OrdenesCompra() {
    const [activeTab, setActiveTab] = useState("pedidos");

    // ── User ──────────────────────────────────────────────────────────────────
    const [user, setUser] = useState({});
    useEffect(() => {
        try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch {}
    }, []);
    const role = user?.role || "EMPLEADO";

    // ── Pedidos internos (Pedidos.jsx merged) ─────────────────────────────────
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [pedidosTab, setPedidosTab] = useState("pendientes");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [newOrderItems, setNewOrderItems] = useState([{ product: "", requested_quantity: 1 }]);
    const [showDeliverModal, setShowDeliverModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [deliveryItems, setDeliveryItems] = useState([]);

    const loadPedidos = useCallback(async () => {
        setLoadingPedidos(true);
        try {
            const [ord, prod, bra, prov] = await Promise.all([
                getOrders(), getProducts(), getBranches(), getProviders()
            ]);
            setOrders(ord); setProducts(prod); setBranches(bra); setProviders(prov);
        } catch {}
        setLoadingPedidos(false);
    }, []);

    useEffect(() => { if (activeTab === "pedidos") loadPedidos(); }, [activeTab, loadPedidos]);

    const filteredOrders = () => {
        if (pedidosTab === "pendientes") return orders.filter(o => o.status === "PENDING_APPROVAL");
        if (pedidosTab === "transito") return orders.filter(o => ["APPROVED", "IN_TRANSIT"].includes(o.status));
        return orders.filter(o => ["DELIVERED", "REJECTED"].includes(o.status));
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        if (!selectedBranch) { Swal.fire({ icon: "warning", title: "Selecciona una sede", confirmButtonColor: "#2563eb" }); return; }
        const items = newOrderItems.filter(i => i.product && parseInt(i.requested_quantity) > 0);
        if (!items.length) { Swal.fire({ icon: "warning", title: "Agrega al menos un producto", confirmButtonColor: "#2563eb" }); return; }
        try {
            await createOrder({ branch: selectedBranch, items });
            setShowCreateModal(false); setNewOrderItems([{ product: "", requested_quantity: 1 }]); setSelectedProvider(""); setSelectedBranch("");
            loadPedidos();
            Swal.fire({ icon: "success", title: "¡Pedido creado!", confirmButtonColor: "#2563eb" });
        } catch { Swal.fire({ icon: "error", title: "Error al crear el pedido", confirmButtonColor: "#2563eb" }); }
    };

    const handleApprove = async (id) => {
        const r = await Swal.fire({ title: "¿Aprobar este pedido?", icon: "question", showCancelButton: true, confirmButtonColor: "#2563eb", cancelButtonText: "No" });
        if (!r.isConfirmed) return;
        try { await approveOrder(id); loadPedidos(); } catch {}
    };

    const handleReject = async (id) => {
        const r = await Swal.fire({ title: "¿Denegar este pedido?", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonText: "No" });
        if (!r.isConfirmed) return;
        try { await rejectOrder(id); loadPedidos(); } catch {}
    };

    const openDeliverModal = (order) => {
        setSelectedOrder(order);
        setDeliveryItems(order.items.map(i => ({ id: i.id, product_name: i.product_name, requested_quantity: i.requested_quantity, received_quantity: i.requested_quantity })));
        setShowDeliverModal(true);
    };

    const handleDeliverOrder = async (e) => {
        e.preventDefault();
        try {
            await deliverOrder(selectedOrder.id, deliveryItems);
            setShowDeliverModal(false); loadPedidos();
            Swal.fire({ icon: "success", title: "¡Recepción registrada! Stock actualizado.", confirmButtonColor: "#2563eb" });
        } catch { Swal.fire({ icon: "error", title: "Error al recibir", confirmButtonColor: "#2563eb" }); }
    };

    const handleAcceptAll = async (id) => {
        const r = await Swal.fire({ 
            title: "¿Recibir pedido completo?", 
            text: "Esto sumará todo el stock solicitado a tu inventario de inmediato.",
            icon: "question", 
            showCancelButton: true, 
            confirmButtonColor: "#16a34a", 
            cancelButtonText: "Cancelar",
            confirmButtonText: "Sí, Aceptar Todo"
        });
        if (!r.isConfirmed) return;
        try { 
            await deliverOrder(id, []); 
            loadPedidos(); 
            Swal.fire({ icon: "success", title: "¡Pedido ingresado completamente!", confirmButtonColor: "#16a34a" });
        } catch { Swal.fire({ icon: "error", title: "Error al recibir", confirmButtonColor: "#2563eb" }); }
    };

    const handleAcceptAllGeneral = async () => {
        const transitoOrders = orders.filter(o => ["APPROVED", "IN_TRANSIT"].includes(o.status));
        if (transitoOrders.length === 0) return;

        const r = await Swal.fire({ 
            title: `¿Recibir ${transitoOrders.length} pedido(s) pendientes?`, 
            text: "Esto ingresará de golpe todo el stock de las filas mostradas en esta sección.",
            icon: "warning", 
            showCancelButton: true, 
            confirmButtonColor: "#16a34a", 
            cancelButtonText: "Cancelar",
            confirmButtonText: "Sí, Recibir Todo"
        });
        if (!r.isConfirmed) return;

        Swal.fire({ title: "Procesando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        try { 
            await Promise.all(transitoOrders.map(o => deliverOrder(o.id, [])));
            loadPedidos(); 
            Swal.fire({ icon: "success", title: "¡Todos los pedidos fueron ingresados con éxito!", confirmButtonColor: "#16a34a" });
        } catch { 
            loadPedidos();
            Swal.fire({ icon: "error", title: "Error", text: "Hubo un problema al procesar algunos pedidos.", confirmButtonColor: "#2563eb" }); 
        }
    };

    // ── Órdenes de Compra (proveedor externo) ─────────────────────────────────
    const [ordenes, setOrdenes] = useState([]);
    const [sugerencias, setSugerencias] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [loadingOC, setLoadingOC] = useState(false);
    const [loadingSug, setLoadingSug] = useState(false);
    const [expandedOc, setExpandedOc] = useState(null);
    const [filtroEstadoOC, setFiltroEstadoOC] = useState("TODOS");
    const [showOCModal, setShowOCModal] = useState(false);
    const [formOC, setFormOC] = useState(EMPTY_OC);
    const [showSugerencias, setShowSugerencias] = useState(true);
    const [showRecepcionModal, setShowRecepcionModal] = useState(null);
    const [recepItemsMap, setRecepItemsMap] = useState({});
    const [recepBranch, setRecepBranch] = useState("");
    const [selectedBrand, setSelectedBrand] = useState(null); // { name, website, emoji, color }
    const [customBrandName, setCustomBrandName] = useState("");

    const fetchOrdenes = useCallback(async () => {
        setLoadingOC(true);
        try { const r = await axios.get(`${API_LOGISTICS}/purchase-orders/`, { headers: getAuthHeaders() }); setOrdenes(r.data); } catch {}
        setLoadingOC(false);
    }, []);

    const fetchSugerencias = useCallback(async () => {
        setLoadingSug(true);
        try { const r = await axios.get(`${API_LOGISTICS}/purchase-orders/suggest_purchases/`, { headers: getAuthHeaders() }); setSugerencias(r.data); } catch {}
        setLoadingSug(false);
    }, []);

    const fetchSedes = useCallback(async () => {
        try { const r = await axios.get(`http://127.0.0.1:8000/api/companies/branches/`, { headers: getAuthHeaders() }); setSedes(r.data); } catch {}
    }, []);

    useEffect(() => {
        if (activeTab === "compras") { fetchOrdenes(); fetchSugerencias(); fetchSedes(); }
    }, [activeTab, fetchOrdenes, fetchSugerencias, fetchSedes]);

    const addOCItem = () => setFormOC(p => ({ ...p, items: [...p.items, { producto_id: "", producto_nombre: "", cantidad_solicitada: 1, precio_unitario: 0 }] }));
    const removeOCItem = (i) => setFormOC(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
    const updateOCItem = (idx, f, v) => setFormOC(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, [f]: v } : it) }));

    const handleCrearOC = async () => {
        const brandName = selectedBrand ? selectedBrand.name : customBrandName.trim();
        if (!brandName) { Swal.fire({ icon: "warning", title: "Selecciona una marca", confirmButtonColor: "#7c3aed" }); return; }
        
        // Validar y limpiar items
        const rawItems = formOC.items.filter(it => (it.producto_id || it.producto_nombre?.trim()) && Number(it.cantidad_solicitada) > 0);
        if (!rawItems.length) { Swal.fire({ icon: "warning", title: "Agrega al menos un producto válido", confirmButtonColor: "#7c3aed" }); return; }
        
        try {
            // Auto-create or get the brand provider for this company
            const brandRes = await axios.post(
                `${API_INVENTORY}/providers/ensure_brand/`,
                { name: brandName, website: selectedBrand?.website || "" },
                { headers: getAuthHeaders() }
            );
            const proveedorId = brandRes.data.id;
            
            await axios.post(`${API_LOGISTICS}/purchase-orders/`, {
                proveedor: proveedorId, 
                estado: formOC.estado || "BORRADOR", 
                notas: formOC.notas,
                items: rawItems.map(it => ({ 
                    producto: it.producto_id || null, 
                    producto_nombre: it.producto_nombre || null,
                    cantidad_solicitada: Number(it.cantidad_solicitada), 
                    precio_unitario: Number(it.precio_unitario || 0) 
                }))
            }, { headers: getAuthHeaders() });
            
            Swal.fire({ icon: "success", title: `¡Pedido enviado a ${brandName}!`, confirmButtonColor: "#7c3aed" });
            setShowOCModal(false); setFormOC(EMPTY_OC); setSelectedBrand(null); setCustomBrandName(""); fetchOrdenes();
        } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail || "No se pudo crear el pedido", confirmButtonColor: "#7c3aed" });
        }
    };

    const handleOCAccion = async (id, accion) => {
        const map = { aprobar: "aprobar", transito: "marcar_en_transito", cancelar: "cancelar" };
        try { await axios.post(`${API_LOGISTICS}/purchase-orders/${id}/${map[accion]}/`, {}, { headers: getAuthHeaders() }); fetchOrdenes(); }
        catch (err) { Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail, confirmButtonColor: "#7c3aed" }); }
    };

    const handleCrearRutaOC = async (orden) => {
        try {
            const res = await axios.post(`${API_LOGISTICS}/purchase-orders/${orden.id}/crear_ruta/`, {
                zona: `Ruta desde ${orden.proveedor_name}`,
                transportador: "Transporte Proveedor",
                branch_id: user.branch?.id
            }, { headers: getAuthHeaders() });
            
            if (res.status === 200) {
                Swal.fire({ icon: "info", title: "Ruta existente", text: "Ya existe una ruta vinculada a esta orden.", confirmButtonColor: "#7c3aed" });
            } else {
                Swal.fire({ icon: "success", title: "¡Ruta generada!", text: "Se ha creado una ruta de entrada en Logística.", confirmButtonColor: "#7c3aed" });
            }
        } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail || "No se pudo crear la ruta", confirmButtonColor: "#7c3aed" });
        }
    };


    const openRecepcionOC = (orden) => {
        const m = {}; orden.items.forEach(it => { m[it.id] = it.cantidad_solicitada; });
        setRecepItemsMap(m); setRecepBranch(""); setShowRecepcionModal(orden);
    };

    const handleRecibirOC = async () => {
        if (!recepBranch) { Swal.fire({ icon: "warning", title: "Selecciona una sede", confirmButtonColor: "#7c3aed" }); return; }
        const orden = showRecepcionModal;
        try {
            const items = Object.entries(recepItemsMap).map(([id, qty]) => ({ id: Number(id), cantidad_recibida: Number(qty) }));
            await axios.post(`${API_LOGISTICS}/purchase-orders/${orden.id}/recibir/`, { branch_id: Number(recepBranch), items }, { headers: getAuthHeaders() });
            Swal.fire({ icon: "success", title: "¡Recibido! Inventario actualizado.", confirmButtonColor: "#7c3aed" });
            setShowRecepcionModal(null); fetchOrdenes(); fetchSugerencias();
        } catch (err) { Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail, confirmButtonColor: "#7c3aed" }); }
    };

    const useSugerencia = (s) => {
        setFormOC({
            proveedor: s.proveedor_sugerido ? String(s.proveedor_sugerido.id) : "",
            estado: "BORRADOR",
            notas: `Sugerencia automática — stock actual: ${s.stock_actual}`,
            items: [{ producto_id: String(s.producto_id), producto_nombre: s.producto_nombre, cantidad_solicitada: s.cantidad_sugerida, precio_unitario: 0 }]
        });
        setShowOCModal(true);
    };

    const allProviders = providers.length ? providers : [];

    const ordenesFiltradas = filtroEstadoOC === "TODOS" ? ordenes : ordenes.filter(o => o.estado === filtroEstadoOC);

    const TAB_STYLES = (active) =>
        `flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-t-xl border-b-2 transition-colors ${active ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`;

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Top header */}
                <div className="px-8 pt-8 pb-0 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Gestión de Pedidos y Compras</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Pedidos internos entre sedes y órdenes de compra a proveedores</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-8 mt-6 flex gap-1 border-b border-slate-200">
                    <button onClick={() => setActiveTab("pedidos")} className={TAB_STYLES(activeTab === "pedidos")}>
                        <ClipboardCheck className="w-4 h-4" /> Pedidos Internos
                    </button>
                    <button onClick={() => setActiveTab("compras")} className={TAB_STYLES(activeTab === "compras")}>
                        <ShoppingCart className="w-4 h-4" /> Pedidos a Tiendas de Marca
                    </button>
                </div>

                {/* ══════════════════════════════════════════════
                    TAB 1 — PEDIDOS INTERNOS
                ═══════════════════════════════════════════════ */}
                {activeTab === "pedidos" && (
                    <div className="flex-1 p-8 overflow-auto">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                {(role === "ADMIN" || role === "JEFE_INVENTARIO") && (
                                    <button onClick={() => setPedidosTab("pendientes")}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${pedidosTab === "pendientes" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                                        Por Aprobar
                                    </button>
                                )}
                                <button onClick={() => setPedidosTab("transito")}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${pedidosTab === "transito" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                                    En Tránsito
                                </button>
                                <button onClick={() => setPedidosTab("historial")}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${pedidosTab === "historial" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                                    <History className="w-3.5 h-3.5 inline mr-1" />Historial
                                </button>
                            </div>
                            <div className="flex gap-2">
                                {pedidosTab === "transito" && filteredOrders().length > 0 && (
                                    <button onClick={handleAcceptAllGeneral} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white border border-green-700 rounded-xl hover:bg-green-700 text-sm font-semibold shadow-sm transition-colors">
                                        <CheckCircle className="w-4 h-4" /> Recibir Todo
                                    </button>
                                )}
                                <button onClick={loadPedidos} className="flex items-center gap-1.5 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium">
                                    <RefreshCw className="w-4 h-4" /> Actualizar
                                </button>
                                <button onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm shadow-blue-200">
                                    <PlusCircle className="w-4 h-4" /> Nuevo Pedido
                                </button>
                            </div>
                        </div>

                        {loadingPedidos ? (
                            <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="px-5 py-4">Pedido</th>
                                            <th className="px-5 py-4">Fecha</th>
                                            <th className="px-5 py-4">Sede Destino</th>
                                            <th className="px-5 py-4">Creado por</th>
                                            <th className="px-5 py-4">Estado</th>
                                            <th className="px-5 py-4">Artículos</th>
                                            <th className="px-5 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredOrders().length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-10 text-slate-400">No hay pedidos en esta sección.</td></tr>
                                        ) : filteredOrders().map(o => {
                                            const sc = STATUS_PEDIDO[o.status] || { label: o.status, color: "bg-slate-100 text-slate-600" };
                                            return (
                                                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-5 py-4 font-bold text-slate-800">#{o.id}</td>
                                                    <td className="px-5 py-4 text-slate-500">{new Date(o.created_at).toLocaleDateString()}</td>
                                                    <td className="px-5 py-4 font-medium text-slate-700">{o.branch_name || "—"}</td>
                                                    <td className="px-5 py-4 text-slate-500">{o.created_by_name}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <ul className="text-xs space-y-0.5">
                                                            {o.items.map(it => <li key={it.id} className="text-slate-500">· {it.requested_quantity}× {it.product_name}</li>)}
                                                        </ul>
                                                    </td>
                                                    <td className="px-5 py-4 text-right space-x-2">
                                                        {o.status === "PENDING_APPROVAL" && ["ADMIN", "JEFE_INVENTARIO"].includes(role) && (<>
                                                            <button onClick={() => handleApprove(o.id)} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold">Aprobar</button>
                                                            <button onClick={() => handleReject(o.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold">Denegar</button>
                                                        </>)}
                                                        {["APPROVED", "IN_TRANSIT"].includes(o.status) && (
                                                            <button onClick={() => openDeliverModal(o)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">Recibir Mercancía</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    TAB 2 — ÓRDENES DE COMPRA A PROVEEDORES
                ═══════════════════════════════════════════════ */}
                {activeTab === "compras" && (
                    <div className="flex-1 p-8 overflow-auto">

                        {/* Explainer banner */}
                        <div className="flex gap-4 mb-6 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl">
                            <div className="p-3 bg-violet-100 rounded-xl shrink-0">
                                <ShoppingCart className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-violet-800 text-sm">Pedidos a Tiendas de Marca Oficial</p>
                                <p className="text-xs text-violet-600 mt-0.5">
                                    Solicita productos especiales directamente a marcas como Samsung, Apple, Lenovo, etc.
                                    Estos pedidos son para artículos que <strong>no están en el inventario habitual</strong>.
                                    Para solicitar entre sedes, usa la pestaña <em>Pedidos Internos</em>.
                                </p>
                            </div>
                        </div>
                        <div className="mb-6">
                            <button onClick={() => setShowSugerencias(p => !p)}
                                className="flex items-center gap-2 w-full bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-left hover:bg-amber-100 transition-colors">
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                <span className="font-semibold text-amber-800 text-sm flex-1">
                                    Sugerencias automáticas por bajo stock
                                    {sugerencias.length > 0 && <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{sugerencias.length}</span>}
                                </span>
                                {showSugerencias ? <ChevronUp className="w-4 h-4 text-amber-500" /> : <ChevronDown className="w-4 h-4 text-amber-500" />}
                            </button>
                            {showSugerencias && (
                                <div className="bg-white border border-amber-100 rounded-xl mt-2 overflow-hidden">
                                    {loadingSug ? (
                                        <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
                                    ) : sugerencias.length === 0 ? (
                                        <div className="flex items-center gap-3 px-6 py-5 text-slate-500 text-sm"><CheckCircle className="w-4 h-4 text-green-400" /> Todos los productos tienen stock suficiente.</div>
                                    ) : sugerencias.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between px-5 py-3 border-b last:border-0 hover:bg-amber-50 transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{s.producto_nombre} <span className="text-xs text-slate-400 font-normal">({s.producto_sku})</span></p>
                                                <p className="text-xs text-slate-500">Sede: {s.sede} · Stock: <span className="text-red-600 font-bold">{s.stock_actual}</span> / Mín: {s.stock_minimo} · Ventas 30d: {s.ventas_30_dias}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="text-sm font-bold text-violet-700">Pedir: {s.cantidad_sugerida}</p>
                                                <button onClick={() => useSugerencia(s)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700">
                                                    Crear OC <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-2 flex-wrap">
                                {["TODOS", ...Object.keys(ESTADO_OC_CONFIG)].map(e => (
                                    <button key={e} onClick={() => setFiltroEstadoOC(e)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filtroEstadoOC === e ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"}`}>
                                        {e === "TODOS" ? "Todos" : ESTADO_OC_CONFIG[e]?.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { fetchOrdenes(); fetchSugerencias(); }} className="flex items-center gap-1.5 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium"><RefreshCw className="w-4 h-4" /> Actualizar</button>
                                <button onClick={() => setShowOCModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-sm font-semibold shadow-sm shadow-violet-200"><PlusCircle className="w-4 h-4" /> Nueva OC</button>
                            </div>
                        </div>

                        {/* Lista OC */}
                        {loadingOC ? (
                            <div className="flex justify-center pt-16"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
                        ) : ordenesFiltradas.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No hay órdenes de compra</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {ordenesFiltradas.map(oc => {
                                    const cfg = ESTADO_OC_CONFIG[oc.estado] || {};
                                    const expanded = expandedOc === oc.id;
                                    return (
                                        <div key={oc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpandedOc(expanded ? null : oc.id)}>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-center w-11 h-11 bg-violet-50 rounded-xl justify-center">
                                                        <span className="text-[10px] text-violet-400 font-bold uppercase">OC</span>
                                                        <span className="text-sm font-bold text-violet-700">#{oc.id}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>{cfg.label}</span>
                                                            <span className="text-sm font-semibold text-slate-700">{oc.proveedor_name}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {oc.fecha} · {oc.generada_por_name}
                                                            {oc.branch_name && <span className="ml-2 font-medium text-violet-600">· Destino: {oc.branch_name}</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-slate-700">${Number(oc.total_orden).toFixed(2)}</p>
                                                        <p className="text-xs text-slate-400">{oc.items?.length} producto(s)</p>
                                                    </div>
                                                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                </div>
                                            </div>
                                            {expanded && (
                                                <div className="border-t border-slate-100">
                                                    <div className="flex flex-wrap gap-2 px-4 py-2 bg-slate-50 border-b">
                                                        {["BORRADOR","PENDIENTE"].includes(oc.estado) && <button onClick={() => handleOCAccion(oc.id,"aprobar")} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"><CheckCircle className="w-3 h-3 inline mr-1"/>Aprobar</button>}
                                                        {oc.estado==="APROBADA" && <button onClick={() => handleOCAccion(oc.id,"transito")} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"><Truck className="w-3 h-3 inline mr-1"/>En Tránsito</button>}
                                                        {["APROBADA","EN_TRANSITO"].includes(oc.estado) && (
                                                            <>
                                                                <button onClick={() => handleCrearRutaOC(oc)} className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700"><MapPin className="w-3 h-3 inline mr-1"/>Crear Ruta</button>
                                                                <button onClick={() => openRecepcionOC(oc)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"><Package className="w-3 h-3 inline mr-1"/>Recibir</button>
                                                            </>
                                                        )}
                                                        {!["RECIBIDA","CANCELADA"].includes(oc.estado) && <button onClick={() => handleOCAccion(oc.id,"cancelar")} className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100"><XCircle className="w-3 h-3 inline mr-1"/>Cancelar</button>}
                                                    </div>
                                                    <div className="divide-y divide-slate-50">
                                                        {oc.items.map(it => (
                                                            <div key={it.id} className="flex items-center justify-between px-4 py-3 text-sm">
                                                                <div><p className="font-medium text-slate-700">{it.producto_name}</p><p className="text-xs text-slate-400">SKU: {it.producto_sku}</p></div>
                                                                <div className="flex gap-6 text-xs text-slate-500">
                                                                    <span>Solicitado: <strong className="text-slate-700">{it.cantidad_solicitada}</strong></span>
                                                                    <span>Recibido: <strong className={it.cantidad_recibida != null ? "text-green-600" : "text-slate-300"}>{it.cantidad_recibida ?? "—"}</strong></span>
                                                                    <span>Precio: <strong>${Number(it.precio_unitario).toFixed(2)}</strong></span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ─── MODAL: Crear Pedido Interno ────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-5">Nuevo Pedido Interno</h2>
                        <form onSubmit={handleCreateOrder} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sede de destino</label>
                                <select required value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccionar sede...</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor (catálogo automático)</label>
                                <select value={selectedProvider} onChange={e => {
                                    const pid = e.target.value; setSelectedProvider(pid);
                                    setNewOrderItems(pid ? products.filter(p => p.providers?.includes(parseInt(pid))).map(p => ({ product: String(p.id), requested_quantity: 0 })) : [{ product: "", requested_quantity: 1 }]);
                                }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Sin proveedor (manual)</option>
                                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Productos</label>
                                <div className="space-y-2 max-h-52 overflow-y-auto border border-slate-100 rounded-xl p-2">
                                    {newOrderItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            {!selectedProvider ? (
                                                <select required value={item.product} onChange={e => { const ni = [...newOrderItems]; ni[idx].product = e.target.value; setNewOrderItems(ni); }}
                                                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                    <option value="">Producto...</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} – {p.name}</option>)}
                                                </select>
                                            ) : (
                                                <span className="flex-1 text-sm text-slate-700 px-2">{products.find(p => String(p.id) === String(item.product))?.name}</span>
                                            )}
                                            <input type="number" min={selectedProvider ? 0 : 1} value={item.requested_quantity}
                                                onChange={e => { const ni = [...newOrderItems]; ni[idx].requested_quantity = e.target.value; setNewOrderItems(ni); }}
                                                className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    ))}
                                </div>
                                {!selectedProvider && (
                                    <button type="button" onClick={() => setNewOrderItems(p => [...p, { product: "", requested_quantity: 1 }])}
                                        className="mt-2 text-xs text-blue-600 font-semibold hover:underline">+ Agregar fila</button>
                                )}
                            </div>
                            <div className="flex gap-3 pt-3 border-t">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Enviar Pedido</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Recibir Pedido Interno ──────────────────────────── */}
            {showDeliverModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Recepción — Pedido #{selectedOrder.id}</h2>
                        <p className="text-sm text-slate-500 mb-4">Sede: <strong>{selectedOrder.branch_name}</strong>. El stock se acreditará automáticamente.</p>
                        <form onSubmit={handleDeliverOrder} className="space-y-3">
                            {deliveryItems.map((item, idx) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">{item.product_name}</p>
                                        <p className="text-xs text-slate-400">Solicitado: {item.requested_quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-500">Recibido:</label>
                                        <input type="number" min={0} value={item.received_quantity}
                                            onChange={e => { const ni = [...deliveryItems]; ni[idx].received_quantity = e.target.value; setDeliveryItems(ni); }}
                                            className={`w-20 border rounded-lg px-2 py-1 text-sm text-center focus:outline-none ${item.received_quantity < item.requested_quantity ? "border-red-300 text-red-600" : "border-slate-200 text-blue-700"}`} />
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-3 pt-3 border-t">
                                <button type="button" onClick={() => setShowDeliverModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">Confirmar Recepción</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Nueva OC (Tienda de Marca) ─────────────────────── */}
            {showOCModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-violet-100 rounded-xl"><ShoppingCart className="w-4 h-4 text-violet-600" /></div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Nuevo Pedido a Tienda de Marca</h2>
                                <p className="text-xs text-slate-500">Selecciona la marca. El proveedor se crea automáticamente.</p>
                            </div>
                        </div>

                        {/* Brand picker grid */}
                        <p className="text-sm font-semibold text-slate-700 mb-2">Selecciona la marca</p>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {BRANDS.map(b => (
                                <button
                                    key={b.name}
                                    type="button"
                                    onClick={() => { setSelectedBrand(b); setCustomBrandName(""); }}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                                        selectedBrand?.name === b.name
                                            ? "border-violet-500 bg-violet-50 shadow-md"
                                            : "border-slate-100 bg-white hover:border-violet-300 hover:bg-violet-50"
                                    }`}
                                >
                                    <span className="text-2xl">{b.emoji}</span>
                                    <span className="text-xs font-semibold text-slate-700">{b.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Custom brand */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">¿Otra marca? Escribe el nombre</label>
                            <input type="text" placeholder="Ej: Toshiba, Brother, Kodak..."
                                value={customBrandName}
                                onChange={e => { setCustomBrandName(e.target.value); setSelectedBrand(null); }}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>

                        {/* Selected brand badge + product chips */}
                        {selectedBrand && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
                                    <span className="text-lg">{selectedBrand.emoji}</span>
                                    <div>
                                        <p className="text-sm font-bold text-violet-800">{selectedBrand.name}</p>
                                        <p className="text-xs text-violet-500">El proveedor se creará automáticamente. Haz clic en los productos para agregarlos.</p>
                                    </div>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Productos del catálogo — haz clic para agregar</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedBrand.products.map(prod => {
                                        const alreadyAdded = formOC.items.some(it => it.producto_nombre === prod);
                                        return (
                                            <button
                                                key={prod}
                                                type="button"
                                                onClick={() => {
                                                    if (!alreadyAdded) {
                                                        setFormOC(p => ({ ...p, items: [...p.items, { producto_id: "", producto_nombre: prod, cantidad_solicitada: 1, precio_unitario: 0 }] }));
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                    alreadyAdded
                                                        ? "bg-violet-600 text-white border-violet-600 cursor-default"
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700"
                                                }`}
                                            >
                                                {alreadyAdded ? "✓ " : "+ "}{prod}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {!selectedBrand && customBrandName && (
                            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
                                <span className="text-lg">🏢</span>
                                <div>
                                    <p className="text-sm font-bold text-violet-800">{customBrandName}</p>
                                    <p className="text-xs text-violet-500">El proveedor se creará automáticamente si no existe</p>
                                </div>
                            </div>
                        )}


                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Estado inicial</label>
                                <select value={formOC.estado} onChange={e => setFormOC(p => ({ ...p, estado: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                                    {["BORRADOR","PENDIENTE"].map(e => <option key={e} value={e}>{ESTADO_OC_CONFIG[e]?.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notas / referencia del pedido</label>
                                <textarea rows={2} value={formOC.notas} onChange={e => setFormOC(p => ({ ...p, notas: e.target.value }))}
                                    placeholder="Ej: Pedir para ampliación de sede norte, evento próximo..."
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-700">Productos a solicitar</label>
                                    <button onClick={addOCItem} className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1">
                                        <PlusCircle className="w-3 h-3" /> Agregar producto
                                    </button>
                                </div>
                                {formOC.items.length === 0 && (
                                    <div className="text-center py-5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                        Agrega los productos que deseas pedir<br/>
                                        <span className="text-slate-300">(Ej: iPhone 15 Pro, Galaxy S24, MacBook Air M3...)</span>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {formOC.items.map((it, idx) => (
                                        <div key={idx} className="p-3 border border-slate-100 rounded-xl bg-slate-50">
                                            <div className="flex gap-2 items-center mb-2">
                                                <input type="text" placeholder="Nombre del producto (ej: iPhone 15 Pro 256GB)" value={it.producto_nombre}
                                                    onChange={e => updateOCItem(idx, "producto_nombre", e.target.value)}
                                                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                                <button onClick={() => removeOCItem(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                                                    <XCircle className="w-4 h-4"/>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <label className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">Cantidad:</label>
                                                <input type="number" placeholder="1" min={1} value={it.cantidad_solicitada}
                                                    onChange={e => updateOCItem(idx, "cantidad_solicitada", e.target.value)}
                                                    className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => { setShowOCModal(false); setFormOC(EMPTY_OC); setSelectedBrand(null); setCustomBrandName(""); }}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
                            <button onClick={handleCrearOC}
                                className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700">Enviar Solicitud</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: Recibir OC ──────────────────────────────────────── */}
            {showRecepcionModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Registrar Recepción — OC #{showRecepcionModal.id}</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sede de destino</label>
                            <select value={recepBranch} onChange={e => setRecepBranch(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option value="">-- Seleccionar sede --</option>
                                {sedes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            {showRecepcionModal.items.map(it => (
                                <div key={it.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div><p className="text-sm font-semibold text-slate-700">{it.producto_name}</p><p className="text-xs text-slate-400">Pedido: {it.cantidad_solicitada}</p></div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-slate-500">Recibido:</label>
                                        <input type="number" min={0} value={recepItemsMap[it.id] ?? it.cantidad_solicitada}
                                            onChange={e => setRecepItemsMap(p => ({ ...p, [it.id]: e.target.value }))}
                                            className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowRecepcionModal(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">Cancelar</button>
                            <button onClick={handleRecibirOC} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">Confirmar Recepción</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
