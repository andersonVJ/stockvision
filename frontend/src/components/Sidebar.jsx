import { useNavigate, useLocation } from "react-router-dom";
import {
    Home,
    LayoutDashboard,
    Package,
    TrendingUp,
    ShoppingCart,
    Settings,
    LogOut,
    Truck,
    User,
    Users,
    Building2,
    Store,
    Receipt,
    Briefcase,
    Route,
    ClipboardList
} from "lucide-react";

import Logo from "./Logo";

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    let user = {};
    try {
        const stored = localStorage.getItem("user");
        if (stored && stored !== "undefined" && stored !== "null") {
            user = JSON.parse(stored) || {};
        }
    } catch (e) {
        console.error("Error parsing user from localStorage:", e);
    }
    const role = user?.role || "EMPLEADO";

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    const menuItems = [
        { name: "Inicio", path: "/inicio", icon: <Home className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] },
        { name: "Sedes", path: "/sedes", icon: <Building2 className="w-[18px] h-[18px]" />, roles: ["ADMIN"] },
        { name: "Proveedores", path: "/proveedores", icon: <Briefcase className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] },
        { name: "Inventario", path: "/inventory", icon: <Package className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO"] },
        { name: "Punto de Venta", path: "/pos", icon: <Store className="w-[18px] h-[18px]" />, roles: ["JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Historial de Ventas", path: "/ventas", icon: <Receipt className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Clientes", path: "/clientes", icon: <Users className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Pedidos y Compras", path: "/compras", icon: <ClipboardList className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Rutas de Entrega", path: "/logistica", icon: <Route className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] },
        { name: "Predicción IA", path: "/predictions", icon: <TrendingUp className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] },
        { name: "Empleados", path: "/empleados", icon: <Users className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] }
    ];

    // Filter items based on user role
    const filteredMenuItems = menuItems.filter(item => item.roles.includes(role));

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex flex-col h-screen sticky top-0 w-64 shrink-0 bg-white border-r border-slate-200">

            {/* Head / Logo */}
            <div className="flex items-center p-6 h-24">
                <div className="flex items-center gap-2">
                    <Logo />
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight text-slate-800 leading-tight">
                            StockVision
                        </h1>
                        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                            Gestión Inteligente
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-2 overflow-y-auto">
                <ul className="space-y-1.5">
                    {filteredMenuItems.map((item) => (
                        <li key={item.name}>
                            <button
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm group ${isActive(item.path)
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                    }`}
                            >
                                <div className={`${isActive(item.path) ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} transition-colors`}>
                                    {item.icon}
                                </div>
                                <span className={`ml-3 ${isActive(item.path) ? "font-semibold" : ""}`}>
                                    {item.name}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Bottom Config Links */}
            <div className="p-4 border-t border-slate-100 space-y-1">
                <button
                    onClick={() => navigate("/perfil")}
                    className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                    <User className="w-[18px] h-[18px] mr-3 text-slate-400 group-hover:text-slate-600" />
                    Mi Perfil
                </button>
                <button
                    onClick={() => navigate("/config")}
                    className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                    <Settings className="w-[18px] h-[18px] mr-3 text-slate-400 group-hover:text-slate-600" />
                    Configuración
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
                >
                    <LogOut className="w-[18px] h-[18px] mr-3 text-slate-400 group-hover:text-red-500" />
                    Salir
                </button>
            </div>

        </div>
    );
}
