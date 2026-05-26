import { useState } from "react";
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
    ClipboardList,
    Menu,
    X,
    Shield
} from "lucide-react";

import Logo from "./Logo";

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
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

    const isSuperuser = user?.is_superuser === true;

    const menuItems = [
        ...(isSuperuser ? [{ name: "Panel Admin", path: "/superadmin", icon: <Shield className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] }] : []),
        { name: "Inicio", path: "/inicio", icon: <Home className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] },
        { name: "Sedes", path: "/sedes", icon: <Building2 className="w-[18px] h-[18px]" />, roles: ["ADMIN"] },
        { name: "Proveedores", path: "/proveedores", icon: <Briefcase className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] },
        { name: "Inventario", path: "/inventory", icon: <Package className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO"] },
        { name: "Punto de Venta", path: "/pos", icon: <Store className="w-[18px] h-[18px]" />, roles: ["JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Historial de Ventas", path: "/ventas", icon: <Receipt className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Clientes", path: "/clientes", icon: <Users className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Pedidos y Compras", path: "/compras", icon: <ClipboardList className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Rutas de Entrega", path: "/logistica", icon: <Route className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO", "EMPLEADO", "VENDEDOR"] },
        { name: "Predicción IA", path: "/predictions", icon: <TrendingUp className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] },
        { name: "Empleados", path: "/empleados", icon: <Users className="w-[18px] h-[18px]" />, roles: ["ADMIN", "JEFE_INVENTARIO"] }
    ];

    // Filter items based on user role
    const filteredMenuItems = menuItems.filter(item => item.roles.includes(role));

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Mobile Header & Hamburger */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40 w-full shadow-sm"
                 style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-2">
                    <div className="scale-75 origin-left">
                        <Logo />
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">StockVision</h1>
                </div>
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Backdrop */}
            <div 
                className={`md:hidden fixed inset-0 bg-slate-900/60 z-[9998] backdrop-blur-sm transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Container */}
            <div className={`fixed md:sticky top-0 left-0 h-[100dvh] w-[80vw] max-w-[280px] md:w-64 md:max-w-none shrink-0 bg-white border-r border-slate-200 z-[9999] transition-transform duration-300 ease-in-out transform ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 flex flex-col overflow-hidden`}>

                {/* Close Button inside Sidebar (Mobile) */}
                <div className="md:hidden flex justify-end px-3 pt-3"
                     style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                    <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Head / Logo (Desktop only) */}
                <div className="hidden md:flex items-center p-6 h-24">
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
                <nav className="flex-1 px-3 md:px-4 py-2 overflow-y-auto mt-1 md:mt-0 overscroll-contain">
                    <ul className="space-y-1">
                        {filteredMenuItems.map((item) => (
                            <li key={item.name}>
                                <button
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsOpen(false);
                                    }}
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
            <div className="shrink-0 p-3 md:p-4 border-t border-slate-100 space-y-1"
                 style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                <button
                    onClick={() => {
                        navigate("/perfil");
                        setIsOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors group"
                >
                    <Settings className="w-[18px] h-[18px] mr-3 text-slate-400 group-hover:text-slate-600" />
                    Perfil y Configuración
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

        </>
    );
}
