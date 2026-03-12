import { useState, useEffect } from "react";
import { Bell, AlertTriangle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Logo from "../components/Logo";
import { getLowStockAlerts } from "../services/inventoryService";
import { getOrders } from "../services/orderService";

export default function Inicio() {
  const [user, setUser] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        setUser(JSON.parse(stored) || {});
      }
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
    }
  }, []);

  const role = user?.role || "EMPLEADO";

  useEffect(() => {
    const fetchData = async () => {
      if (role === "ADMIN" || role === "JEFE_INVENTARIO") {
        try {
          const lsa = await getLowStockAlerts();
          setAlerts(lsa);
          
          const ords = await getOrders();
          setPendingOrders(ords.filter(o => o.status === "PENDING_APPROVAL"));
        } catch (error) {
          console.error("Error fetching alerts data", error);
        }
      }
    };
    fetchData();
  }, [role]);

  const getRoleDisplayName = (roleStr) => {
    switch (roleStr) {
      case "ADMIN": return "Administrador";
      case "JEFE_INVENTARIO": return "Jefe de Inventario";
      case "EMPLEADO": return "Empleado";
      default: return "Sin rol";
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 relative">

      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 p-8 flex flex-col relative">

        {/* Top Bar with Notifications */}
        <div className="absolute top-8 right-8 z-10">
          {(role === "ADMIN" || role === "JEFE_INVENTARIO") && (
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-3 bg-white rounded-full shadow-sm border border-slate-200 hover:bg-slate-50 relative transition-transform hover:scale-105"
              >
                <Bell className="w-6 h-6 text-slate-600" />
                {(alerts.length > 0 || pendingOrders.length > 0) && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                    {alerts.length + pendingOrders.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform origin-top-right transition-all">
                  <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
                    <h3 className="font-bold text-red-800 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Centro de Alertas
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {alerts.length === 0 && pendingOrders.length === 0 ? (
                      <p className="text-center text-sm text-slate-500 py-4 font-medium">Todo bajo control.</p>
                    ) : (
                      <ul className="space-y-1">
                        {pendingOrders.map(o => (
                          <li key={'ord'+o.id} className="p-3 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition-colors border-b border-white last:border-0 cursor-pointer" onClick={() => window.location.href='/orders'}>
                            <p className="text-sm font-bold text-yellow-800">Pedido #{o.id} por Aprobar</p>
                            <p className="text-xs text-yellow-700 font-medium">Creado por {o.created_by_name}</p>
                          </li>
                        ))}
                        {alerts.map((a) => (
                          <li key={'alr'+a.id} className="p-3 hover:bg-red-50/50 rounded-xl transition-colors border-b border-slate-50 last:border-0 cursor-pointer" onClick={() => window.location.href='/inventory'}>
                            <p className="text-sm font-semibold text-slate-800">{a.product_name}</p>
                            <p className="text-xs text-red-600 font-medium">Stock Crítico: {a.quantity} <span className="text-slate-400 font-normal ml-1">(Mínimo: {a.min_stock})</span></p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center Welcome */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl w-full text-center bg-white p-12 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">

          <div className="mb-6 transform scale-150 flex items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
            <Logo />
          </div>

          <h1 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
            Bienvenido a <span className="text-blue-600">StockVision</span>
          </h1>

          <p className="text-xl text-slate-500 mb-8 max-w-lg">
            Sistema Inteligente de Gestión de Inventarios y Predicción Automática
          </p>

          <div className="bg-slate-50 w-full p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Sesión Actual</p>
            <h2 className="text-2xl font-bold text-slate-800">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || "Usuario"}
            </h2>
            <div className="flex justify-center gap-3 mt-3">
              <span className="inline-block px-4 py-1.5 text-sm font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                {getRoleDisplayName(role)}
              </span>
              {user?.position_display && (
                <span className="inline-block px-4 py-1.5 text-sm font-semibold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                  Cargo: {user.position_display}
                </span>
              )}
            </div>
            {user?.assigned_by_name && (
              <p className="text-sm text-slate-500 mt-3">
                Asignado por: <span className="font-medium">{user.assigned_by_name}</span>
              </p>
            )}
          </div>

          <p className="text-sm text-slate-400 mt-8">
            Puedes ver más detalles y cambiar tu contraseña en tu Perfil.
          </p>

        </div>
        </div>
      </div>

    </div>
  );
}
