import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getInventories, createSale } from "../services/inventoryService";

export default function PuntoDeVenta() {
  const [user, setUser] = useState({});
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState([]);
  const [status, setStatus] = useState("COMPLETED");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored && stored !== "undefined" && stored !== "null") {
        setUser(JSON.parse(stored) || {});
      }
    } catch (e) {
      console.error(e);
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setInventories(await getInventories());
    } catch (error) {
      console.error("Error loading inventories", error);
    }
    setLoading(false);
  };

  const addToCart = (inventory) => {
    if (cart.length > 0 && cart[0].branch_id && cart[0].branch_id !== inventory.branch) {
      alert("No puedes mezclar productos de diferentes sedes en el mismo carrito.");
      return;
    }

    const existing = cart.find(item => item.product === inventory.product);
    if (existing) {
      if (existing.quantity >= inventory.quantity) {
        alert("Stock insuficiente en tu bodega");
        return;
      }
      setCart(cart.map(item => item.product === inventory.product ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      if (inventory.quantity <= 0) {
        alert("Este producto está agotado en tu bodega");
        return;
      }
      setCart([...cart, { 
        product: inventory.product, 
        name: inventory.product_name, 
        sku: inventory.product_sku, 
        quantity: 1, 
        available: inventory.quantity,
        branch_name: inventory.branch_name,
        branch_id: inventory.branch
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product !== productId));
  };

  const updateQuantity = (productId, newQuantity, available) => {
    if (newQuantity > available) {
      alert("No hay suficiente stock.");
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => item.product === productId ? { ...item, quantity: parseInt(newQuantity) } : item));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("El carrito está vacío.");
    
    try {
      const payload = {
        status: status,
        branch: cart[0].branch_id,
        items: cart.map(item => ({ product: item.product, quantity: item.quantity }))
      };
      await createSale(payload);
      alert("Venta registrada con éxito.");
      setCart([]);
      loadData();
    } catch (err) {
      alert("Error al procesar la venta. Verifica el stock.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto flex gap-6">
          
          {/* CATALOGO */}
          <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[calc(100vh-4rem)]">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Punto de Venta</h1>
            {loading ? (
              <p className="text-slate-500 text-center py-10">Cargando catálogo...</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 overflow-y-auto flex-1 content-start pr-2">
                {inventories.map(inv => (
                  <div key={inv.id} onClick={() => addToCart(inv)} className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-32 bg-white group">
                    <div>
                      <div className="h-20 w-full mb-3 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center">
                        {inv.product_image ? (
                           <img src={inv.product_image} alt={inv.product_name} className="w-full h-full object-contain p-2 mix-blend-multiply" />
                        ) : (
                           <span className="text-slate-300 font-bold text-xs">Sin Foto</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{inv.product_name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">{inv.product_sku}</p>
                      {user.role === 'ADMIN' && <p className="text-[10px] uppercase font-bold text-indigo-500 mt-1">{inv.branch_name}</p>}
                    </div>
                    <div className="flex justify-between items-end">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${inv.quantity > 5 ? 'bg-green-100 text-green-700' : inv.quantity > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {inv.quantity} uds
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHECKOUT / CART */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[calc(100vh-4rem)]">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex justify-between">
              Carrito 
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm font-bold">{cart.length}</span>
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p>Selecciona productos para iniciar una venta</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={`${item.product}-${item.branch_name}`} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-800 text-sm line-clamp-1">{item.name}</p>
                      {user.role === 'ADMIN' && <p className="text-[9px] uppercase text-indigo-500 font-bold">{item.branch_name}</p>}
                    </div>
                    <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden">
                      <button onClick={() => updateQuantity(item.product, item.quantity - 1, item.available)} className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold">-</button>
                      <input type="number" value={item.quantity} readOnly className="w-8 text-center text-sm font-bold outline-none" />
                      <button onClick={() => updateQuantity(item.product, item.quantity + 1, item.available)} className="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estado de la Venta</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setStatus("COMPLETED")} className={`py-2 text-sm font-bold rounded-lg transition-colors ${status === "COMPLETED" ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    Completada
                  </button>
                  <button onClick={() => setStatus("PENDING")} className={`py-2 text-sm font-bold rounded-lg transition-colors ${status === "PENDING" ? 'bg-yellow-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    Pendiente
                  </button>
                </div>
              </div>

              <button 
                onClick={handleCheckout} 
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${cart.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-600/20 active:scale-[0.98]'}`}
                disabled={cart.length === 0}
              >
                Procesar Venta
              </button>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
