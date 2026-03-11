import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function Perfil() {
  const [user, setUser] = useState({});
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

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

  const getRoleDisplayName = (roleStr) => {
    switch (roleStr) {
      case "ADMIN": return "Administrador";
      case "JEFE_INVENTARIO": return "Jefe de Inventario";
      case "EMPLEADO": return "Empleado";
      default: return "Sin rol";
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    if (newPassword !== newPasswordConfirm) {
      setMessage({ text: "Las nuevas contraseñas no coinciden", type: "error" });
      return;
    }
    
    try {
      const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
      const res = await fetch("http://127.0.0.1:8000/api/users/profile/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokens.access}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Contraseña actualizada exitosamente", type: "success" });
        setOldPassword("");
        setNewPassword("");
        setNewPasswordConfirm("");
      } else {
        setMessage({ text: data.old_password?.[0] || data.new_password?.[0] || "Error al actualizar", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error de conexión", type: "error" });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-slate-800">Mi Perfil</h1>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
            <h2 className="text-xl font-semibold mb-6 text-slate-700 border-b pb-3">Información Personal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500 mb-1">Nombre Completo</p>
                <p className="font-medium text-slate-800">{user.first_name} {user.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Cédula</p>
                <p className="font-medium text-slate-800">{user.cedula || "No registrada"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Rol en el Sistema</p>
                <div className="mt-1">
                  <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Cargo Asignado</p>
                <div className="mt-1">
                  {user.position_display ? (
                    <span className="inline-block px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                      {user.position_display}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Sin cargo asignado</span>
                  )}
                </div>
              </div>
              {user.assigned_by_name && (
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-500 mb-1">Jefe que asignó el cargo</p>
                  <p className="font-medium text-slate-800">{user.assigned_by_name}</p>
                </div>
              )}
            </div>
            
            {(user.role === 'ADMIN' || user.role === 'JEFE_INVENTARIO') && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                <p className="text-sm text-orange-700">
                  <span className="font-bold">Aviso:</span> La información personal (excepto contraseña) solo puede ser modificada por el Administrador General.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-semibold mb-6 text-slate-700 border-b pb-3">Cambiar Contraseña</h2>
            {message.text && (
              <div className={`p-4 mb-6 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Actual</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors mt-2"
              >
                Actualizar Contraseña
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
