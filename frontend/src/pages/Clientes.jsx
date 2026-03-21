import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Logo from "../components/Logo";
import { getClients, createClient, updateClient, deleteClient } from "../services/clientService";
import { getSalesByClient, sendInvoiceEmail } from "../services/inventoryService";
import { Users, Search, Plus, Edit2, Trash2, Mail, Phone, Hash, History, X, Send, CheckCircle } from "lucide-react";

export default function Clientes() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  const [formData, setFormData] = useState({
    id_document: "",
    name: "",
    phone: "",
    email: ""
  });

  const [showHistory, setShowHistory] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);

  useEffect(() => {
    fetchClients();
  }, [searchTerm]); // Re-fetch when search changes for backend search

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await getClients(searchTerm);
      setClients(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        id_document: client.id_document || "",
        name: client.name || "",
        phone: client.phone || "",
        email: client.email || ""
      });
    } else {
      setEditingClient(null);
      setFormData({
        id_document: "",
        name: "",
        phone: "",
        email: ""
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData);
      }
      handleCloseModal();
      fetchClients();
    } catch (error) {
      console.error("Error saving client:", error);
      const serverMsg = error.response?.data ? JSON.stringify(error.response.data) : "Hubo un error al guardar el cliente.";
      alert(`Error al guardar: ${serverMsg}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      try {
        await deleteClient(id);
        fetchClients();
      } catch (error) {
        console.error("Error deleting client:", error);
        alert("Hubo un error al eliminar el cliente.");
      }
    }
  };

  const handleOpenHistory = async (client) => {
    setSelectedClient(client);
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const data = await getSalesByClient(client.id_document);
      setHistory(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Error fetching client history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendEmail = async (saleId, clientEmail) => {
    setSendingEmail(saleId);
    try {
      await sendInvoiceEmail(saleId, clientEmail);
      alert("Factura enviada correctamente al correo del cliente.");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Error al enviar el correo.");
    } finally {
      setSendingEmail(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 overflow-auto relative">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Logo />
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Gestión de Clientes</h1>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nuevo Cliente
          </button>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                Directorio de Clientes
              </h2>
              <div className="relative w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, cédula o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400 font-medium">Cargando clientes...</div>
              ) : clients.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium">No hay clientes registrados que coincidan con la búsqueda.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Nombre del Cliente</th>
                      <th className="p-4">Cédula / NIT</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-6 font-semibold text-slate-700">
                          {client.name}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-slate-600 font-medium">
                            <Hash className="w-4 h-4 text-slate-400" />
                            {client.id_document}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 text-slate-600">
                            {client.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-4 h-4 text-slate-400" />
                                {client.email}
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-slate-400" />
                                {client.phone}
                              </div>
                            )}
                            {!client.email && !client.phone && (
                              <span className="text-slate-400 italic">Sin datos de contacto</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenHistory(client)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                            title="Ver Historial"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(client)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mr-2"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>

        {/* Modal de Crear/Editar Cliente */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / NIT</label>
                  <input
                    type="text"
                    required
                    value={formData.id_document}
                    onChange={(e) => setFormData({ ...formData, id_document: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ej. 123456789"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
                  >
                    {editingClient ? "Guardar Cambios" : "Crear Cliente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Historial de Compras */}
        {showHistory && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Historial de Compras</h3>
                    <p className="text-xs text-slate-500">{selectedClient?.name} - {selectedClient?.id_document}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                {loadingHistory ? (
                  <div className="p-12 text-center text-slate-400 font-medium">Cargando compras...</div>
                ) : history.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    No hay compras registradas para este cliente.
                  </div>
                ) : (
                  <div className="overflow-hidden border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="p-3 pl-4">Factura</th>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Total</th>
                          <th className="p-3 text-right pr-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {history.map((sale) => (
                          <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 pl-4 font-mono font-bold text-slate-600">
                              #{sale.id}
                            </td>
                            <td className="p-3 text-slate-500">
                              {new Date(sale.date).toLocaleDateString()}
                            </td>
                            <td className="p-3 font-bold text-slate-800">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits:0 }).format(sale.total)}
                            </td>
                            <td className="p-3 text-right pr-4">
                              <button
                                onClick={() => handleSendEmail(sale.id, selectedClient?.email)}
                                disabled={sendingEmail === sale.id}
                                className={`flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  sendingEmail === sale.id 
                                  ? "bg-slate-100 text-slate-400" 
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                                }`}
                              >
                                {sendingEmail === sale.id ? (
                                  <>Enviando...</>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    Enviar Factura
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowHistory(false)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
