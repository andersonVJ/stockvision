import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getCategories, createCategory, getProducts, createProduct, getInventories, getMovements, createMovement, getLowStockAlerts } from "../services/inventoryService";

export default function Inventario() {
  const [user, setUser] = useState({});
  const [activeTab, setActiveTab] = useState("inventario"); // inventario, categorias, movimientos, alertas
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        setUser(JSON.parse(stored) || {});
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "categorias") {
        setCategories(await getCategories());
      } else if (activeTab === "inventario") {
        setProducts(await getProducts());
        setInventories(await getInventories());
      } else if (activeTab === "movimientos") {
        setMovements(await getMovements());
        setInventories(await getInventories()); // needed for dropdown
      } else if (activeTab === "alertas") {
        setAlerts(await getLowStockAlerts());
      }
    } catch (error) {
      console.error("Error loading data", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // CATEGORY FORM
  const [newCatName, setNewCatName] = useState("");
  const handleCatSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCategory({ name: newCatName });
      setNewCatName("");
      loadData();
    } catch (err) { alert("Error al crear categoría"); }
  };

  // PRODUCT FORM
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodData, setProdData] = useState({ name: "", sku: "", price: "", category: "" });
  
  useEffect(() => {
    if (showProductModal) getCategories().then(setCategories);
  }, [showProductModal]);

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProduct(prodData);
      setShowProductModal(false);
      loadData();
    } catch (err) { alert("Error al crear. Verifica si el SKU ya existe en tu empresa."); }
  };

  // MOVEMENT FORM
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movData, setMovData] = useState({ inventory: "", movement_type: "ENTRY", quantity: 1, notes: "" });

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    try {
      await createMovement(movData);
      setShowMovementModal(false);
      loadData();
    } catch (err) { alert("Error al registrar movimiento. ¿Es posible que no tengas stock suficiente para esta salida?"); }
  };

  const getInventoryForProduct = (productId) => {
    return inventories.find(i => i.product === productId);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestión de Inventario</h1>
          
          {/* TABS */}
          <div className="flex space-x-2 border-b border-slate-200 mb-6">
            <button onClick={() => setActiveTab("inventario")} className={`px-4 py-2 font-medium ${activeTab === 'inventario' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Inventario Total</button>
            <button onClick={() => setActiveTab("categorias")} className={`px-4 py-2 font-medium ${activeTab === 'categorias' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Categorías</button>
            <button onClick={() => setActiveTab("movimientos")} className={`px-4 py-2 font-medium ${activeTab === 'movimientos' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Movimientos</button>
            <button onClick={() => setActiveTab("alertas")} className={`px-4 py-2 font-medium ${activeTab === 'alertas' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500'}`}>Alertas de Stock</button>
          </div>

          {loading ? (
             <div className="text-center text-slate-500 mt-10">Cargando datos...</div>
          ) : (
            <>
              {/* TAB: INVENTARIO */}
              {activeTab === "inventario" && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Directorio de Productos</h2>
                    {user.role !== 'EMPLEADO' && (
                      <button onClick={() => setShowProductModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nuevo Producto</button>
                    )}
                  </div>
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Precio</th>
                        <th className="px-4 py-3">Stock Disponible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map(p => {
                        const inv = getInventoryForProduct(p.id);
                        return (
                          <tr key={p.id}>
                            <td className="px-4 py-3 font-semibold">{p.sku}</td>
                            <td className="px-4 py-3">{p.name} <span className="text-xs text-slate-400 block">{p.category_name}</span></td>
                            <td className="px-4 py-3">${p.price}</td>
                            <td className="px-4 py-3 font-bold text-blue-600">{inv ? inv.quantity : 0} uds</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: CATEGORÍAS */}
              {activeTab === "categorias" && (
                <div className="grid grid-cols-3 gap-6">
                  {user.role !== 'EMPLEADO' && (
                    <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <h2 className="text-lg font-bold mb-4">Crear Categoría</h2>
                      <form onSubmit={handleCatSubmit} className="flex flex-col gap-3">
                        <input required type="text" placeholder="Nombre" value={newCatName} onChange={e=>setNewCatName(e.target.value)} className="border rounded-lg p-2 outline-none" />
                        <button className="bg-blue-600 text-white rounded-lg p-2 font-medium">Guardar</button>
                      </form>
                    </div>
                  )}
                  <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-4">Listado de Categorías</h2>
                    <ul className="space-y-2">
                      {categories.map(c => (
                        <li key={c.id} className="p-3 bg-slate-50 border rounded-lg font-medium">{c.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB: MOVIMIENTOS */}
              {activeTab === "movimientos" && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Historial de Movimientos</h2>
                    <button onClick={() => setShowMovementModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Registrar Movimiento</button>
                  </div>
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Producto</th>
                        <th className="px-4 py-3">Cantidad</th>
                        <th className="px-4 py-3">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.map(m => (
                        <tr key={m.id}>
                          <td className="px-4 py-3">{new Date(m.date).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${m.movement_type === 'ENTRY' ? 'bg-green-100 text-green-700' : m.movement_type === 'EXIT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {m.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">{m.inventory_product_name}</td>
                          <td className="px-4 py-3 font-bold">{m.quantity}</td>
                          <td className="px-4 py-3">{m.user_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB: ALERTAS */}
              {activeTab === "alertas" && (
                <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-6">
                  <h2 className="text-xl font-bold text-red-800 mb-4">¡Atención! Stock Crítico</h2>
                  {alerts.length === 0 ? (
                    <p className="text-green-700 font-medium">Todos los niveles de inventario están saludables.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {alerts.map(a => (
                        <div key={a.id} className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 flex justify-between">
                            {a.product_name} 
                            <span className="text-red-600">Quedan: {a.quantity}</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Nivel mínimo requerido: {a.min_stock}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* MODAL PRODUCTO */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl w-96">
            <h2 className="font-bold text-xl mb-4">Nuevo Producto</h2>
            <form onSubmit={handleProductSubmit} className="flex flex-col gap-3">
              <input required type="text" placeholder="SKU" onChange={e=>setProdData({...prodData, sku: e.target.value})} className="border p-2 rounded" />
              <input required type="text" placeholder="Nombre" onChange={e=>setProdData({...prodData, name: e.target.value})} className="border p-2 rounded" />
              <input required type="number" step="0.01" placeholder="Precio Base" onChange={e=>setProdData({...prodData, price: e.target.value})} className="border p-2 rounded" />
              <select required onChange={e=>setProdData({...prodData, category: e.target.value})} className="border p-2 rounded">
                <option value="">Seleccione Categoría...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={()=>setShowProductModal(false)} className="px-3 py-1 bg-slate-200 rounded">Cancelar</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl w-96">
            <h2 className="font-bold text-xl mb-4 text-green-700">Registrar Movimiento</h2>
            <form onSubmit={handleMovementSubmit} className="flex flex-col gap-3">
              <select required onChange={e=>setMovData({...movData, movement_type: e.target.value})} className="border p-2 rounded outline-none font-bold">
                <option value="ENTRY">ENTRADA (Añadir al Stock)</option>
                <option value="EXIT">SALIDA (Descontar del Stock)</option>
                <option value="ADJUSTMENT">AJUSTE (Auditoría/Mermas)</option>
              </select>
              <select required onChange={e=>setMovData({...movData, inventory: e.target.value})} className="border p-2 rounded">
                <option value="">Seleccione Producto en Bodega...</option>
                {inventories.map(i => <option key={i.id} value={i.id}>{i.product_name} (Stock actual: {i.quantity})</option>)}
              </select>
              <input required type="number" min="1" placeholder="Cantidad a mover" onChange={e=>setMovData({...movData, quantity: e.target.value})} className="border p-2 rounded outline-none" />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={()=>setShowMovementModal(false)} className="px-3 py-1 bg-slate-200 rounded">Cancelar</button>
                <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded font-bold">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
