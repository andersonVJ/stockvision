import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  getCompanies, createCompany, updateCompany, deleteCompany,
  getBranches, createBranch, deleteBranch,
  getEmployees, createEmployee
} from "../services/inventoryService";
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from "../utils/alerts";
import {
  Building2, Plus, MapPin, Phone, Mail, Users, ChevronDown, ChevronRight,
  Pencil, Trash2, UserPlus, Shield, Store, X
} from "lucide-react";

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});

  // Data
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Forms
  const [companyForm, setCompanyForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [branchForm, setBranchForm] = useState({ name: "", address: "", company: "" });
  const [adminForm, setAdminForm] = useState({
    username: "", email: "", password: "", password_confirm: "",
    first_name: "", last_name: "", cedula: "", role: "ADMIN",
    company: "", branch: ""
  });

  // Check superuser access
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        const u = JSON.parse(stored);
        setUser(u || {});
        if (!u?.is_superuser) {
          navigate("/inicio");
          return;
        }
      } else {
        navigate("/");
        return;
      }
    } catch (e) {
      navigate("/");
      return;
    }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [comps, branchs, emps] = await Promise.all([
        getCompanies(),
        getBranches(),
        getEmployees()
      ]);
      setCompanies(comps);
      setBranches(branchs);
      setEmployees(emps);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ─── COMPANY CRUD ──────────────────────────────
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateCompany(editingId, companyForm);
        showSuccessAlert("Empresa actualizada con éxito.");
      } else {
        await createCompany(companyForm);
        showSuccessAlert("Empresa creada con éxito. Ahora agrega sedes y un administrador.");
      }
      setShowCompanyModal(false);
      resetCompanyForm();
      loadAll();
    } catch (err) {
      const msg = err.response?.data;
      showErrorAlert(typeof msg === "string" ? msg : JSON.stringify(msg) || "Error al guardar empresa");
    }
  };

  const handleEditCompany = (c) => {
    setCompanyForm({ name: c.name, address: c.address, phone: c.phone, email: c.email });
    setEditingId(c.id);
    setIsEditing(true);
    setShowCompanyModal(true);
  };

  const handleDeleteCompany = async (id, name) => {
    const confirmed = await showConfirmAlert(
      `¿Eliminar "${name}"?`,
      "Se eliminarán todas las sedes, empleados, inventarios, ventas y datos de esta empresa. Esta acción es IRREVERSIBLE."
    );
    if (!confirmed) return;
    try {
      await deleteCompany(id);
      showSuccessAlert("Empresa eliminada.");
      loadAll();
    } catch (err) {
      showErrorAlert("Error al eliminar la empresa.");
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({ name: "", address: "", phone: "", email: "" });
    setIsEditing(false);
    setEditingId(null);
  };

  // ─── BRANCH CRUD ───────────────────────────────
  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      await createBranch(branchForm);
      showSuccessAlert("Sede creada con éxito.");
      setShowBranchModal(false);
      setBranchForm({ name: "", address: "", company: "" });
      loadAll();
    } catch (err) {
      const msg = err.response?.data;
      showErrorAlert(typeof msg === "string" ? msg : JSON.stringify(msg) || "Error al crear sede");
    }
  };

  const handleDeleteBranch = async (id, name) => {
    const confirmed = await showConfirmAlert(
      `¿Eliminar sede "${name}"?`,
      "Se eliminarán empleados e inventarios de esta sede."
    );
    if (!confirmed) return;
    try {
      await deleteBranch(id);
      showSuccessAlert("Sede eliminada.");
      loadAll();
    } catch (err) {
      showErrorAlert("Error al eliminar la sede.");
    }
  };

  // ─── ADMIN CREATION ────────────────────────────
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (adminForm.password !== adminForm.password_confirm) {
      showErrorAlert("Las contraseñas no coinciden.");
      return;
    }
    try {
      await createEmployee(adminForm);
      showSuccessAlert("Administrador creado con éxito. Ya puede iniciar sesión en el sistema.");
      setShowAdminModal(false);
      setAdminForm({
        username: "", email: "", password: "", password_confirm: "",
        first_name: "", last_name: "", cedula: "", role: "ADMIN",
        company: "", branch: ""
      });
      loadAll();
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === "object") {
        const errors = Object.entries(msg).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
        showErrorAlert(errors);
      } else {
        showErrorAlert(msg || "Error al crear administrador");
      }
    }
  };

  // ─── HELPERS ───────────────────────────────────
  const getCompanyBranches = (companyId) => branches.filter(b => b.company === companyId);
  const getCompanyEmployees = (companyId) => {
    const companyBranches = getCompanyBranches(companyId).map(b => String(b.id));
    return employees.filter(e => String(e.company) === String(companyId) || companyBranches.includes(String(e.branch)));
  };
  const getBranchEmployees = (branchId) => employees.filter(e => e.branch === branchId);

  const getRoleBadge = (role) => {
    const map = {
      ADMIN: "bg-purple-100 text-blue-700",
      JEFE_INVENTARIO: "bg-blue-100 text-blue-700",
      EMPLEADO: "bg-slate-100 text-slate-600",
      VENDEDOR: "bg-green-100 text-green-700",
    };
    const labels = {
      ADMIN: "Admin",
      JEFE_INVENTARIO: "Jefe Inventario",
      EMPLEADO: "Empleado",
      VENDEDOR: "Vendedor",
    };
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[role] || "bg-slate-100 text-slate-600"}`}>
        {labels[role] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 text-lg">Cargando panel de administración...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br bg-blue-600 rounded-xl text-white">
                  <Shield className="w-6 h-6" />
                </div>
                Panel SuperAdmin
              </h1>
              <p className="text-slate-500 mt-1 text-sm">Gestiona empresas, sedes y administradores de la plataforma</p>
            </div>
            <button
              onClick={() => { resetCompanyForm(); setShowCompanyModal(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300"
            >
              <Plus className="w-4 h-4" /> Nueva Empresa
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl"><Building2 className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{companies.length}</p>
                  <p className="text-xs text-slate-400 font-medium">Empresas</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl"><Store className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{branches.length}</p>
                  <p className="text-xs text-slate-400 font-medium">Sedes</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 rounded-xl"><Users className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{employees.length}</p>
                  <p className="text-xs text-slate-400 font-medium">Usuarios</p>
                </div>
              </div>
            </div>
          </div>

          {/* Company List */}
          {companies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">No hay empresas registradas</p>
              <p className="text-slate-400 text-sm mt-1">Haz clic en "Nueva Empresa" para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map(company => {
                const compBranches = getCompanyBranches(company.id);
                const compEmployees = getCompanyEmployees(company.id);
                const isExpanded = expandedCompany === company.id;
                const admins = compEmployees.filter(e => e.role === "ADMIN");

                return (
                  <div key={company.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                    {/* Company Header */}
                    <div
                      className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedCompany(isExpanded ? null : company.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br bg-blue-600 rounded-xl text-white shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{company.name}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{company.address}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{company.phone}</span>
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{company.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                          <span className="bg-slate-100 px-2 py-1 rounded-full font-medium">{compBranches.length} sedes</span>
                          <span className="bg-slate-100 px-2 py-1 rounded-full font-medium">{compEmployees.length} usuarios</span>
                        </div>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mb-5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <Pencil className="w-3 h-3" /> Editar Empresa
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setBranchForm({ name: "", address: "", company: company.id }); setShowBranchModal(true); }}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Agregar Sede
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdminForm({
                                username: "", email: "", password: "", password_confirm: "",
                                first_name: "", last_name: "", cedula: "", role: "ADMIN",
                                company: company.id, branch: ""
                              });
                              setShowAdminModal(true);
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <UserPlus className="w-3 h-3" /> Asignar Admin
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company.id, company.name); }}
                            className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>

                        {/* Branches & Employees */}
                        {compBranches.length === 0 ? (
                          <div className="bg-white rounded-xl p-6 text-center border border-dashed border-slate-200">
                            <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">No tiene sedes. Agrega una para comenzar.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {compBranches.map(branch => {
                              const brEmployees = getBranchEmployees(branch.id);
                              return (
                                <div key={branch.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <Store className="w-4 h-4 text-blue-500" />
                                      <div>
                                        <span className="font-semibold text-sm text-slate-700">{branch.name}</span>
                                        {branch.address && <span className="text-xs text-slate-400 ml-2">— {branch.address}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{brEmployees.length} usuarios</span>
                                      <button
                                        onClick={() => handleDeleteBranch(branch.id, branch.name)}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Eliminar sede"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Branch employees */}
                                  {brEmployees.length > 0 && (
                                    <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50">
                                      <div className="space-y-1.5">
                                        {brEmployees.map(emp => (
                                          <div key={emp.id} className="flex items-center justify-between text-xs py-1">
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                {(emp.first_name?.[0] || emp.username?.[0] || "?")}
                                              </div>
                                              <span className="font-medium text-slate-700">
                                                {emp.first_name && emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.username}
                                              </span>
                                              <span className="text-slate-400">({emp.username})</span>
                                            </div>
                                            {getRoleBadge(emp.role)}
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

                        {/* Employees without branch */}
                        {(() => {
                          const unassigned = compEmployees.filter(e => !e.branch);
                          if (unassigned.length === 0) return null;
                          return (
                            <div className="mt-3 bg-amber-50 rounded-xl border border-amber-200 px-4 py-3">
                              <p className="text-xs font-semibold text-amber-700 mb-2">⚠ Usuarios sin sede asignada</p>
                              <div className="space-y-1">
                                {unassigned.map(emp => (
                                  <div key={emp.id} className="flex items-center justify-between text-xs">
                                    <span className="text-amber-800 font-medium">{emp.first_name} {emp.last_name} ({emp.username})</span>
                                    {getRoleBadge(emp.role)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Admins summary */}
                        {admins.length > 0 && (
                          <div className="mt-3 bg-blue-50 rounded-xl border border-blue-200 px-4 py-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">
                              <Shield className="w-3 h-3 inline mr-1" />
                              Administradores de esta empresa ({admins.length})
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {admins.map(a => (
                                <span key={a.id} className="text-xs bg-white text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-medium">
                                  {a.first_name} {a.last_name} — {a.branch_name || "Sin sede"}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL: CREAR/EDITAR EMPRESA ═══ */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{isEditing ? "Editar Empresa" : "Nueva Empresa"}</h2>
              <button onClick={() => { setShowCompanyModal(false); resetCompanyForm(); }} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCompanySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa *</label>
                <input required type="text" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: ElectroMax S.A.S" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección *</label>
                <input required type="text" value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Calle 45 #23-10, Bogotá" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
                  <input required type="text" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="3001234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input required type="email" value={companyForm.email} onChange={e => setCompanyForm({...companyForm, email: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="info@empresa.com" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCompanyModal(false); resetCompanyForm(); }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium">
                  {isEditing ? "Guardar Cambios" : "Crear Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: CREAR SEDE ═══ */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Nueva Sede</h2>
              <button onClick={() => setShowBranchModal(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBranchSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <select disabled value={branchForm.company} className="w-full border border-slate-300 rounded-lg py-2 px-3 bg-slate-100 text-slate-500">
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Sede *</label>
                <input required type="text" value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Sede Norte" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                <input type="text" value={branchForm.address} onChange={e => setBranchForm({...branchForm, address: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Carrera 7 #72-41" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium">
                  Crear Sede
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: ASIGNAR ADMIN ═══ */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between sticky top-0">
              <h2 className="text-lg font-bold text-white">Crear Administrador</h2>
              <button onClick={() => setShowAdminModal(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <Shield className="w-3.5 h-3.5 inline mr-1" />
                Este usuario será <strong>Administrador</strong> de la empresa: <strong>{companies.find(c => c.id === adminForm.company)?.name}</strong>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input required type="text" value={adminForm.first_name} onChange={e => setAdminForm({...adminForm, first_name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Carlos" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
                  <input required type="text" value={adminForm.last_name} onChange={e => setAdminForm({...adminForm, last_name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pérez" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usuario *</label>
                  <input required type="text" value={adminForm.username} onChange={e => setAdminForm({...adminForm, username: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin_empresa" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
                  <input type="text" value={adminForm.cedula} onChange={e => setAdminForm({...adminForm, cedula: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="1234567890" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input required type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin@empresa.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select value={adminForm.role} onChange={e => setAdminForm({...adminForm, role: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ADMIN">Administrador</option>
                  <option value="JEFE_INVENTARIO">Jefe de Inventario</option>
                  <option value="EMPLEADO">Empleado</option>
                  <option value="VENDEDOR">Vendedor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sede *</label>
                <select required value={adminForm.branch} onChange={e => setAdminForm({...adminForm, branch: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar Sede</option>
                  {getCompanyBranches(adminForm.company).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {getCompanyBranches(adminForm.company).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Esta empresa no tiene sedes. Crea una primero.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
                  <input required type="password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar *</label>
                  <input required type="password" value={adminForm.password_confirm} onChange={e => setAdminForm({...adminForm, password_confirm: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium">
                  Crear Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
