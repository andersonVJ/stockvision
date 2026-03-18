import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getOrders, createOrder, approveOrder, deliverOrder, rejectOrder } from "../services/orderService";
import { getProducts, getBranches, getProviders } from "../services/inventoryService";

export default function Pedidos() {
  const [user, setUser] = useState({});
  const [activeTab, setActiveTab] = useState("pendientes"); // pendientes, transito, historial
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored) || {});
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, productsData, branchesData, providersData] = await Promise.all([
        getOrders(),
        getProducts(),
        getBranches(),
        getProviders()
      ]);
      setOrders(ordersData);
      setProducts(productsData);
      setBranches(branchesData);
      setProviders(providersData);
    } catch (error) {
      console.error("Error loading orders data", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const role = user?.role || "EMPLEADO";
  const isBodega = user?.position === "BODEGA" || user?.position === "ALMACEN" || user?.position === "RECOGIDA";

  const getFilteredOrders = () => {
    if (activeTab === "pendientes") return orders.filter(o => o.status === "PENDING_APPROVAL");
    if (activeTab === "transito") return orders.filter(o => o.status === "APPROVED" || o.status === "IN_TRANSIT");
    return orders.filter(o => o.status === "DELIVERED" || o.status === "REJECTED");
  };

  // CREATE ORDER FORM
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [newOrderItems, setNewOrderItems] = useState([{ product: "", requested_quantity: 1 }]);

  const handleAddOrderItem = () => {
    setNewOrderItems([...newOrderItems, { product: "", requested_quantity: 1 }]);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedBranch) {
      alert("Por favor seleccione una sede");
      return;
    }
    try {
      await createOrder({ 
        branch: selectedBranch,
        items: newOrderItems 
      });
      setShowCreateModal(false);
      setNewOrderItems([{ product: "", requested_quantity: 1 }]);
      setSelectedBranch("");
      loadData();
    } catch (err) {
      alert("Error al crear el pedido");
    }
  };

  // APPROVE ORDER
  const handleApprove = async (id) => {
    if (!window.confirm("¿Aprobar este pedido?")) return;
    try {
      await approveOrder(id);
      loadData();
    } catch (err) {
      alert("Error al aprobar");
    }
  };

  // REJECT ORDER
  const handleReject = async (id) => {
      if (!window.confirm("¿Está seguro de denegar este pedido?")) return;
      try {
          await rejectOrder(id);
          loadData();
      } catch (err) {
          alert("Error al denegar el pedido");
      }
  };

  // DELIVER ORDER FORM
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryItems, setDeliveryItems] = useState([]);

  const openDeliverModal = (order) => {
    setSelectedOrder(order);
    const initialItems = order.items.map(item => ({
      id: item.id,
      product_name: item.product_name,
      requested_quantity: item.requested_quantity,
      received_quantity: item.requested_quantity // Default to requested
    }));
    setDeliveryItems(initialItems);
    setShowDeliverModal(true);
  };

  const handleDeliverOrder = async (e) => {
    e.preventDefault();
    try {
      await deliverOrder(selectedOrder.id, deliveryItems);
      setShowDeliverModal(false);
      loadData();
    } catch (err) {
      alert("Error al recibir pedido");
    }
  };

  const statusTags = {
    'PENDING_APPROVAL': <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-bold">Pendiente</span>,
    'APPROVED': <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">Aprobado / En camino</span>,
    'DELIVERED': <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">Recibido</span>,
    'REJECTED': <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Rechazado</span>,
    'IN_TRANSIT': <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold">En Tránsito</span>,
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Pedidos y Recepción</h1>
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Nuevo Pedido
            </button>
          </div>

          {/* TABS */}
          <div className="flex space-x-2 border-b border-slate-200 mb-6">
            {(role === "ADMIN" || role === "JEFE_INVENTARIO") && (
              <button onClick={() => setActiveTab("pendientes")} className={`px-4 py-2 font-medium ${activeTab === 'pendientes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Pedidos por Aprobar</button>
            )}
            <button onClick={() => setActiveTab("transito")} className={`px-4 py-2 font-medium ${activeTab === 'transito' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>En Tránsito (Esperando Bodega)</button>
            <button onClick={() => setActiveTab("historial")} className={`px-4 py-2 font-medium ${activeTab === 'historial' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Historial</button>
          </div>

          {loading ? (
             <div className="text-center text-slate-500 mt-10">Cargando datos...</div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">ID Pedido</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Sede Destino</th>
                    <th className="px-6 py-4">Creado Por</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Artículos</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getFilteredOrders().length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-8">No hay pedidos aquí.</td></tr>
                  ) : getFilteredOrders().map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold">#{o.id}</td>
                      <td className="px-6 py-4">{new Date(o.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{o.branch_name || "Sin Sede"}</td>
                      <td className="px-6 py-4">{o.created_by_name}</td>
                      <td className="px-6 py-4">{statusTags[o.status] || o.status}</td>
                      <td className="px-6 py-4">
                        <ul className="text-xs">
                          {o.items.map(item => (
                            <li key={item.id}>• {item.requested_quantity}x {item.product_name}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {o.status === "PENDING_APPROVAL" && (role === "ADMIN" || role === "JEFE_INVENTARIO") && (
                          <>
                            <button onClick={() => handleApprove(o.id)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-xs font-bold transition-colors">Aceptar</button>
                            <button onClick={() => handleReject(o.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold transition-colors">Denegar</button>
                          </>
                        )}
                        {(o.status === "APPROVED" || o.status === "IN_TRANSIT") && (role === "ADMIN" || role === "JEFE_INVENTARIO" || isBodega) && (
                          <button onClick={() => openDeliverModal(o)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-bold transition-colors">Recibir Mercancía</button>
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

      {/* CREATE ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Crear Nuevo Pedido</h2>
            <form onSubmit={handleCreateOrder}>
              
              <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-2">Seleccionar Sede de Destino</label>
                <select 
                  required 
                  value={selectedBranch} 
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sede...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <p className="text-[10px] text-blue-600 mt-1">El stock se sumará automáticamente a esta sede al recibir el pedido.</p>
              </div>

              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-800 mb-2">Seleccionar Proveedor (Opcional, filtra productos)</label>
                <select 
                  value={selectedProvider} 
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setNewOrderItems([{ product: "", requested_quantity: 1 }]);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los productos...</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {newOrderItems.map((item, index) => {
                const availableProducts = selectedProvider 
                   ? products.filter(p => p.providers.includes(parseInt(selectedProvider)))
                   : products;
                
                return (
                 <div key={index} className="flex gap-4 mb-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Producto</label>
                    <select required value={item.product} onChange={(e) => {
                      const newItems = [...newOrderItems];
                      newItems[index].product = e.target.value;
                      setNewOrderItems(newItems);
                    }} className="w-full border rounded-lg p-2 outline-none">
                      <option value="">Seleccione...</option>
                      {availableProducts.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-slate-500 mb-1">Cant. Solicitada</label>
                    <input required type="number" min="1" value={item.requested_quantity} onChange={(e) => {
                      const newItems = [...newOrderItems];
                      newItems[index].requested_quantity = e.target.value;
                      setNewOrderItems(newItems);
                    }} className="w-full border rounded-lg p-2 outline-none" />
                  </div>
                </div>
               );
              })}
              <button type="button" onClick={handleAddOrderItem} className="text-blue-600 text-sm font-bold mb-6 hover:underline">+ Añadir otro producto</button>
              
              <div className="flex justify-end gap-3 mt-4 border-t pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Enviar Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELIVER ORDER MODAL */}
      {showDeliverModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2 text-slate-800">Recepción de Pedido #{selectedOrder.id}</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-6">
                <p className="text-sm text-yellow-800">
                    <strong>Sede de Destino:</strong> {selectedOrder.branch_name}
                </p>
                <p className="text-xs text-yellow-700 mt-1">Si la cantidad recibida es menor a la solicitada, el sistema marcará el pedido con las cantidades reales.</p>
            </div>
            
            <form onSubmit={handleDeliverOrder}>
              {deliveryItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                      <div className="font-medium">{item.product_name}</div>
                      {item.received_quantity < item.requested_quantity && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">INCOMPLETO</span>
                      )}
                  </div>
                  <div className="text-sm text-slate-500 w-24">Pedido: {item.requested_quantity}</div>
                  <div className="w-24">
                    <label className="block text-xs text-slate-500 mb-1">Recibido (Cant)</label>
                    <input required type="number" min="0" value={item.received_quantity} onChange={(e) => {
                      const newItems = [...deliveryItems];
                      newItems[index].received_quantity = e.target.value;
                      setDeliveryItems(newItems);
                    }} className={`w-full border rounded-lg p-1.5 outline-none font-bold ${item.received_quantity < item.requested_quantity ? 'text-red-600 border-red-300' : 'text-blue-700'}`} />
                  </div>
                </div>
              ))}
              <div className="text-xs text-blue-600 mt-2 mb-6 font-medium italic">Al confirmar, el stock se sumará de inmediato a la sede "{selectedOrder.branch_name}".</div>
              <div className="flex justify-end gap-3 mt-4 border-t pt-4">
                <button type="button" onClick={() => setShowDeliverModal(false)} className="px-4 py-2 border rounded-lg text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Confirmar Recepción</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
