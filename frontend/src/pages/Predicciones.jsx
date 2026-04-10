import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/api";
import { TrendingUp, AlertTriangle, CheckCircle, PackageSearch, Loader2, ArrowRight } from "lucide-react";

export default function Predicciones() {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
                const response = await api.get("/predictions/", {
                    headers: {
                        "Authorization": `Bearer ${tokens.access}`
                    }
                });
                if (response.data.status === "success") {
                    setPredictions(response.data.data);
                } else {
                    setError("Failed to parse prediction data.");
                }
            } catch (err) {
                setError("Ocurrió un error al cargar los modelos predictivos.");
            } finally {
                setLoading(false);
            }
        };

        fetchPredictions();
    }, []);

    const getStateStyle = (stateCode) => {
        switch (stateCode) {
            case "CRITICAL":
                return "from-red-50 to-red-100 border-red-200 text-red-800 shadow-red-100/50";
            case "STABLE":
                return "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800 shadow-emerald-100/50";
            case "LOW_ROTATION":
                return "from-amber-50 to-amber-100 border-amber-200 text-amber-800 shadow-amber-100/50";
            default:
                return "from-slate-50 to-slate-100 border-slate-200 text-slate-800";
        }
    };

    const getStateIcon = (stateCode) => {
        switch (stateCode) {
            case "CRITICAL":
                return <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />;
            case "STABLE":
                return <CheckCircle className="w-8 h-8 text-emerald-600 mb-2" />;
            case "LOW_ROTATION":
                return <PackageSearch className="w-8 h-8 text-amber-600 mb-2" />;
            default:
                return <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />;
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
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <Sidebar />

            <div className="flex-1 p-10 overflow-y-auto">
                <header className="mb-12">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 shadow-inner">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">StockVision AI</h2>
                            <p className="text-slate-500 mt-1 font-medium text-sm">Pronóstico de demanda y clasificación inteligente</p>
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

                            return (
                                <div key={pred.product_id} className={`relative overflow-hidden bg-gradient-to-br border rounded-3xl p-6 shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${getStateStyle(stateCode)}`}>
                                    
                                    {/* Glassmorphism highlight overlay */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-3xl rounded-full -mr-10 -mt-10"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-4">
                                            {pred.image ? (
                                                <img src={`http://127.0.0.1:8000${pred.image}`} alt={pred.product_name} className="w-16 h-16 object-cover rounded-xl shadow-md border border-white/50 bg-white" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-xl shadow-md border border-white/50 bg-slate-100 flex items-center justify-center">
                                                    <PackageSearch className="w-8 h-8 text-slate-300" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-xl font-bold mb-0 tracking-tight leading-tight">{pred.product_name}</h3>
                                                <span className="text-xs font-semibold opacity-70 uppercase tracking-wider">{pred.category}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex flex-col text-sm font-semibold opacity-80">
                                                <span>ID Corto: #{pred.product_id}</span>
                                                <span className="mt-0.5">Stock Físico: {Math.round(pred.current_stock)} uds.</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                               {getStateBadge(stateCode)}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/50 shadow-sm">
                                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-3 flex items-center">
                                                <TrendingUp className="w-3 h-3 mr-1" /> Pronóstico Prophet (30 Días)
                                            </h4>
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-3xl font-extrabold">{forecast.next_30_days_demand}</span>
                                                <span className="text-sm font-bold opacity-70">uds.</span>
                                            </div>
                                            <p className="text-xs font-medium opacity-80">
                                                Intervalo de confianza: {forecast.confidence_interval[0]} - {forecast.confidence_interval[1]}
                                            </p>
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-3 flex items-center gap-1">
                                                <ArrowRight className="w-3 h-3" /> Recomendación IA
                                            </h4>
                                            <ul className="space-y-2">
                                                {pred.xgboost_classification.recommendations.map((rec, i) => (
                                                    <li key={i} className="text-sm font-medium leading-tight flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 mt-1.5 shrink-0"></div>
                                                        {rec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
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
