import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/api";
import {
    TrendingUp, AlertTriangle, CheckCircle, PackageSearch,
    Loader2, ArrowRight, ShoppingCart, Sparkles
} from "lucide-react";
import Swal from "sweetalert2";

export default function Predicciones() {
    const navigate = useNavigate();
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderingId, setOrderingId] = useState(null); // ID del producto que está procesando pedido

    const getTokens = () => JSON.parse(localStorage.getItem("tokens") || "{}");

    const fetchPredictions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get("/predictions/", {
                headers: { Authorization: `Bearer ${getTokens().access}` }
            });
            if (response.data.status === "success") {
                setPredictions(response.data.data);
            } else {
                setError("Error al procesar los datos de predicción.");
            }
        } catch {
            setError("Ocurrió un error al cargar los modelos predictivos.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

    // ── Auto-Order Handler ──────────────────────────────────────────────────
    const handleAutoOrder = async (pred) => {
        const forecast = pred.prophet_forecast;
        const demand = forecast?.next_30_days_demand ?? 0;
        const qty = Math.max(1, demand);

        // Obtener sedes disponibles para el selector
        let branches = [];
        try {
            const res = await api.get("/companies/branches/", {
                headers: { Authorization: `Bearer ${getTokens().access}` }
            });
            branches = res.data;
        } catch {
            Swal.fire("Error", "No se pudieron cargar las sedes.", "error");
            return;
        }

        const { value: formValues } = await Swal.fire({
            title: "¿Generar Pedido Automático?",
            html: `
                <div style="text-align:left; font-size:14px; line-height:1.8">
                    <p><b>Producto:</b> ${pred.product_name}</p>
                    <p><b>Demanda proyectada:</b> <span style="color:#4f46e5;font-weight:700">${qty} uds.</span></p>
                    <hr style="margin:12px 0; border-color:#e2e8f0" />
                    <label style="display:block; margin-bottom:4px; font-weight:600; color:#475569">Sede de destino:</label>
                    <select id="swal-branch" class="swal2-select" style="width:100%; margin:0; display:block">
                        <option value="">Seleccionar sede...</option>
                        ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                    </select>
                </div>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "✓ Sí, generar pedido",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#4f46e5",
            preConfirm: () => {
                const branchId = document.getElementById('swal-branch').value;
                if (!branchId) {
                    Swal.showValidationMessage('Debes seleccionar una sede');
                    return false;
                }
                return { branchId };
            }
        });

        if (!formValues) return;

        setOrderingId(pred.product_id);
        try {
            const response = await api.post(
                "/predictions/auto_order/",
                { 
                    product_id: pred.product_id, 
                    quantity: qty,
                    branch_id: formValues.branchId 
                },
                { headers: { Authorization: `Bearer ${getTokens().access}` } }
            );

            const isExternal = response.data.flow_type === 'EXTERNAL';
            const title = isExternal ? "¡Compra Generada! 🚀" : "¡Pedido Generado! 🚀";
            const orderLabel = isExternal ? "Orden de Compra" : "Pedido Interno";
            const tabParam = isExternal ? "compras" : "pedidos";

            await Swal.fire({
                title: title,
                html: `
                    <div style="text-align:left; font-size:14px; line-height:1.9">
                        <p>✅ <b>${orderLabel} #${response.data.order_id}</b> creado</p>
                        <p>🚚 <b>Ruta de Entrega #${response.data.route_id}</b> creada y en tránsito</p>
                        <hr style="margin:10px 0; border-color:#e2e8f0" />
                        <p style="color:#64748b; font-size:13px">Redirigiendo al módulo de <b>${isExternal ? 'Órdenes de Compra' : 'Pedidos Internos'}</b>...</p>
                    </div>
                `,
                icon: "success",
                timer: 2000,
                showConfirmButton: false,
            });

            navigate(`/compras?selected_order=${response.data.order_id}&tab=${tabParam}`);

        } catch (err) {
            const msg = err.response?.data?.detail || "Error desconocido al generar el pedido.";
            Swal.fire("Error", msg, "error");
        } finally {
            setOrderingId(null);
        }
    };

    // ── Style Helpers ───────────────────────────────────────────────────────
    const getStateStyle = (stateCode) => {
        switch (stateCode) {
            case "CRITICAL":    return "from-red-50 to-red-100 border-red-200 text-red-800 shadow-red-100/50";
            case "STABLE":      return "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800 shadow-emerald-100/50";
            case "LOW_ROTATION":return "from-amber-50 to-amber-100 border-amber-200 text-amber-800 shadow-amber-100/50";
            default:            return "from-slate-50 to-slate-100 border-slate-200 text-slate-800";
        }
    };

    const getButtonStyle = (stateCode) => {
        switch (stateCode) {
            case "CRITICAL":    return "bg-red-600 hover:bg-red-700 text-white shadow-red-200";
            case "STABLE":      return "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200";
            case "LOW_ROTATION":return "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200";
            default:            return "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200";
        }
    };

    const getStateBadge = (stateCode) => {
        switch (stateCode) {
            case "CRITICAL":
                return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 shadow-sm">CRÍTICO</span>;
            case "STABLE":
                return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 shadow-sm">ESTABLE</span>;
            case "LOW_ROTATION":
                return <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 shadow-sm">BAJA ROTACIÓN</span>;
            default: return null;
        }
    };

    const getStateIcon = (stateCode) => {
        switch (stateCode) {
            case "CRITICAL":    return <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />;
            case "STABLE":      return <CheckCircle className="w-8 h-8 text-emerald-600 mb-2" />;
            case "LOW_ROTATION":return <PackageSearch className="w-8 h-8 text-amber-600 mb-2" />;
            default:            return <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
            <Sidebar />

            <div className="flex-1 p-10 overflow-y-auto">
                {/* Header */}
                <header className="mb-10">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 shadow-inner">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">StockVision AI</h2>
                            <p className="text-slate-500 mt-1 font-medium text-sm">
                                Pronóstico de demanda · Clasificación inteligente · Pedidos automáticos
                            </p>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        <p className="text-slate-500 font-medium">Ejecutando Modelos Prophet & XGBoost...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl shadow-sm flex items-start gap-4">
                        <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold">Error de Conexión</h3>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        {predictions.map((pred) => {
                            const stateCode = pred.xgboost_classification.state_code;
                            const forecast = pred.prophet_forecast;
                            const isOrdering = orderingId === pred.product_id;
                            const demand = Math.max(1, forecast?.next_30_days_demand ?? 0);

                            return (
                                <div
                                    key={pred.product_id}
                                    className={`relative overflow-hidden bg-gradient-to-br border rounded-3xl p-6 shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${getStateStyle(stateCode)}`}
                                >
                                    {/* Glassmorphism overlay */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col h-full">
                                        {/* Producto Header */}
                                        <div className="flex items-center gap-4 mb-4">
                                            {pred.image ? (
                                                <img
                                                    src={`${pred.image}`}
                                                    alt={pred.product_name}
                                                    className="w-16 h-16 object-cover rounded-xl shadow-md border border-white/50 bg-white"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-xl shadow-md border border-white/50 bg-slate-100 flex items-center justify-center shrink-0">
                                                    <PackageSearch className="w-8 h-8 text-slate-300" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-xl font-bold mb-0 tracking-tight leading-tight">{pred.product_name}</h3>
                                                <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">{pred.category}</span>
                                            </div>
                                        </div>

                                        {/* Stock + Badge */}
                                        <div className="flex justify-between items-center mb-5">
                                            <div className="flex flex-col text-sm font-semibold opacity-80">
                                                <span>ID: #{pred.product_id}</span>
                                                <span className="mt-0.5">Stock: {Math.round(pred.current_stock)} uds.</span>
                                            </div>
                                            {getStateBadge(stateCode)}
                                        </div>

                                        {/* Pronóstico Prophet */}
                                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/50 shadow-sm">
                                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2 flex items-center">
                                                <TrendingUp className="w-3 h-3 mr-1" /> Pronóstico Prophet (30 Días)
                                            </h4>
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-3xl font-extrabold">{forecast.next_30_days_demand}</span>
                                                <span className="text-sm font-bold opacity-70">uds.</span>
                                            </div>
                                            <p className="text-xs font-medium opacity-80">
                                                Intervalo: {forecast.confidence_interval[0]} – {forecast.confidence_interval[1]}
                                            </p>
                                        </div>

                                        {/* Recomendaciones IA */}
                                        <div className="mb-5">
                                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2 flex items-center gap-1">
                                                <ArrowRight className="w-3 h-3" /> Recomendación IA
                                            </h4>
                                            <ul className="space-y-1.5">
                                                {pred.xgboost_classification.recommendations.map((rec, i) => (
                                                    <li key={i} className="text-sm font-medium leading-tight flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 mt-1.5 shrink-0" />
                                                        {rec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* ── BOTÓN SOLICITAR ── */}
                                        <button
                                            id={`btn-auto-order-${pred.product_id}`}
                                            onClick={() => handleAutoOrder(pred)}
                                            disabled={isOrdering}
                                            className={`mt-auto w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${getButtonStyle(stateCode)}`}
                                        >
                                            {isOrdering ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Generando pedido...
                                                </>
                                            ) : (
                                                <>
                                                    <ShoppingCart className="w-4 h-4" />
                                                    Solicitar {demand} uds. al proveedor
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
