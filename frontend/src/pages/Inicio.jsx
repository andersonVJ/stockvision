import Sidebar from "../components/Sidebar";
import Logo from "../components/Logo";

export default function Inicio() {
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

  const getRoleDisplayName = (roleStr) => {
    switch (roleStr) {
      case "ADMIN": return "Administrador";
      case "JEFE_INVENTARIO": return "Jefe de Inventario";
      case "EMPLEADO": return "Empleado";
      default: return "Sin rol";
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 p-8 flex items-center justify-center">
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
            <span className="inline-block mt-3 px-4 py-1.5 text-sm font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              {getRoleDisplayName(role)}
            </span>
          </div>

          {/* Hint for future profile editing feature */}
          <p className="text-sm text-slate-400 mt-8">
            Próximamente podrás actualizar tus datos personales desde este panel.
          </p>

        </div>
      </div>

    </div>
  );
}
