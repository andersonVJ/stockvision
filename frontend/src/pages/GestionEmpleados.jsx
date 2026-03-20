import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getCompanyEmployees, registerEmployee, deleteEmployee, updateEmployeeRole } from "../services/userService";
import { getBranches } from "../services/inventoryService";
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from "../utils/alerts";

export default function GestionEmpleados() {
  const [user, setUser] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    cedula: "",
    role: "EMPLEADO",
    branch: "",
    password: "",
    password_confirm: ""
  });

  const [branches, setBranches] = useState([]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        setUser(JSON.parse(stored) || {});
      }
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
    }
    
    // Fetch branches for branch assignment
    getBranches().then(data => setBranches(data)).catch(console.error);
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");

      const res = await fetch("http://127.0.0.1:8000/api/users/employees/", {
        headers: {
          Authorization: `Bearer ${tokens.access}`
        }
      });

      if (!res.ok) throw new Error("Error fetching employees");

      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [user]);

  const handleDeleteEmployee = async (id) => {
    const isConfirmed = await showConfirmAlert("¿Eliminar empleado?", "Esta acción no se puede deshacer.");
    if (!isConfirmed) return;
    try {
      await deleteEmployee(id);
      showSuccessAlert("Empleado eliminado");
      loadEmployees();
    } catch (err) {
      showErrorAlert(err.response?.data?.error || "Error al eliminar");
    }
  };

  const handleAssignPosition = async (id, newPosition) => {
    if (!newPosition) return;

    try {
      const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");

      const res = await fetch(
        `http://127.0.0.1:8000/api/users/employees/${id}/assign-position/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokens.access}`
          },
          body: JSON.stringify({ position: newPosition })
        }
      );

      if (res.ok) {
        loadEmployees();
        showSuccessAlert("Cargo asignado exitosamente");
      } else {
        showErrorAlert("Error al asignar cargo");
      }
    } catch (e) {
      showErrorAlert("Error de conexión");
    }
  };

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!editingEmployee && formData.password !== formData.password_confirm) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    try {
      const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");

      const url = editingEmployee
        ? `http://127.0.0.1:8000/api/users/employees/${editingEmployee}/`
        : "http://127.0.0.1:8000/api/users/employees/";

      const method = editingEmployee ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        setEditingEmployee(null);

        setFormData({
          username: "",
          email: "",
          first_name: "",
          last_name: "",
          cedula: "",
          role: "EMPLEADO",
          branch: "",
          password: "",
          password_confirm: ""
        });

        fetchEmployees();
      } else {
        setFormError(JSON.stringify(data));
      }
    } catch (e) {
      setFormError("Error de conexión al registrar el empleado.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto relative">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">
              Gestión de Empleados
            </h1>

            {user.role === "ADMIN" && (
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setShowModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                + Nuevo Empleado
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                Cargando empleados...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No hay empleados registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Empleado</th>
                      <th className="px-6 py-4">Cédula</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Cargo Operativo</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {emp.email}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-blue-500 mt-1">
                            {emp.branch_name ? `Sede: ${emp.branch_name}` : "Toda la Empresa"}
                          </div>
                        </td>

                        <td className="px-6 py-4">{emp.cedula || "-"}</td>

                        <td className="px-6 py-4">
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-md">
                            {emp.role}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <select
                            className="text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                            value={emp.position || ""}
                            onChange={(e) =>
                              handleAssignPosition(emp.id, e.target.value)
                            }
                          >
                            <option value="">Sin cargo</option>
                            <option value="BODEGA">Bodega</option>
                            <option value="ALMACEN">Almacén</option>
                            <option value="RECOGIDA">Recogida</option>
                          </select>
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          {user.role === "ADMIN" && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingEmployee(emp.id);

                                  setFormData({
                                    username: emp.username || "",
                                    email: emp.email || "",
                                    first_name: emp.first_name || "",
                                    last_name: emp.last_name || "",
                                    cedula: emp.cedula || "",
                                    role: emp.role || "EMPLEADO",
                                    branch: emp.branch || "",
                                    password: "",
                                    password_confirm: ""
                                  });

                                  setShowModal(true);
                                }}
                                className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => handleDelete(emp.id)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {editingEmployee
                ? "Editar Empleado"
                : "Registrar Nuevo Personal"}
            </h2>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                {formError}
              </div>
            )}

            <form
              onSubmit={handleRegisterEmployee}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre de Usuario
                </label>
                <input
                  required
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cédula
                </label>
                <input
                  required
                  type="text"
                  value={formData.cedula}
                  onChange={(e) =>
                    setFormData({ ...formData, cedula: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombres
                </label>
                <input
                  required
                  type="text"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Apellidos
                </label>
                <input
                  required
                  type="text"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {(user.role === "ADMIN" || user.role === "JEFE_INVENTARIO") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="EMPLEADO">Empleado</option>
                    <option value="VENDEDOR">Vendedor</option>
                    {user.role === "ADMIN" && (
                        <option value="JEFE_INVENTARIO">Jefe de Inventario</option>
                    )}
                    {user.role === "ADMIN" && (
                        <option value="ADMIN">Administrador</option>
                    )}
                  </select>
                </div>
              )}

              {user.role === "ADMIN" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sede (Si es Admin, esto es opcional)
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Ninguna o Toda la Empresa...</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              {!editingEmployee && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contraseña temporal
                    </label>
                    <input
                      required
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Confirmar Contraseña
                    </label>
                    <input
                      required
                      type="password"
                      value={formData.password_confirm}
                      onChange={(e) =>
                        setFormData({ ...formData, password_confirm: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingEmployee ? "Actualizar Usuario" : "Registrar Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}