import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import { getInventories, getProducts, createSale, getClientByDocument } from "../services/inventoryService";
import FacturaImprimible from "../components/FacturaImprimible";

export default function PuntoDeVenta() {
  const [user, setUser] = useState({});
  const [inventories, setInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState('FISICA');
  const [clientData, setClientData] = useState({ id_document: '', name: '', phone: '', email: '' });
  const [clientSearching, setClientSearching] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  
  const componentRef = useRef();

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
      const [invs, prods] = await Promise.all([getInventories(), getProducts()]);
      setInventories(invs);
      setProducts(prods);
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
      const productDetail = products.find(p => p.sku === inventory.product_sku) || { price: 0 };
      setCart([...cart, { 
        product: inventory.product, 
        name: inventory.product_name, 
        sku: inventory.product_sku, 
        price: parseFloat(productDetail.price) || 0,
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

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleOpenCheckout = () => {
    if (cart.length === 0) return alert("El carrito está vacío.");
    setShowCheckoutModal(true);
    setInvoiceType('FISICA');
    setClientData({ id_document: '', name: '', phone: '', email: '' });
  };

  const handleClientSearch = async (e) => {
    const doc = e.target.value;
    setClientData({ ...clientData, id_document: doc });
    if(doc.length >= 5) {
      setClientSearching(true);
      try {
        const res = await getClientByDocument(doc);
        if(res && res.length > 0) {
          const client = res[0];
          setClientData({
            id_document: doc,
            name: client.name,
            phone: client.phone || '',
            email: client.email || ''
          });
        }
      } catch (err) {}
      setClientSearching(false);
    }
  };

  const handleCheckout = async () => {
    try {
      const payload = {
        status: "COMPLETED",
        branch: cart[0].branch_id,
        invoice_type: invoiceType,
        items: cart.map(item => ({ product: item.product, quantity: item.quantity })),
        ...(invoiceType === 'ELECTRONICA' ? { client_data: clientData } : {})
      };
      const response = await createSale(payload);
      
      const saleData = {
        id: response?.id || "Generando...",
        branch_name: cart[0].branch_name,
        client_name: response?.client_name || (invoiceType === 'ELECTRONICA' ? clientData.name : null),
        client_document: response?.client_document || (invoiceType === 'ELECTRONICA' ? clientData.id_document : null),
        items: [...cart],
        total: cartTotal
      };
      
      setInvoiceData(saleData);
      setShowCheckoutModal(false);
      setCart([]);
      loadData();
    } catch (err) {
      alert("Error al procesar la venta. Verifica el stock y los datos ingresados.");
    }
  };

  const handlePrintReset = () => {
    setInvoiceData(null);
  };

  return (
    <div className="flex bg-slate-50 font-sans text-slate-800 h-screen overflow-hidden print:bg-white">
      
      {/* Vista Principal Normal */}
      <div className={`flex flex-1 w-full h-full max-h-screen ${invoiceData ? 'hidden print:block' : 'print:hidden'}`}>
        <Sidebar className="print:hidden h-full sticky top-0" />
        <div className="flex-1 p-8 overflow-y-auto max-h-screen">
          <div className="flex gap-6 h-full pb-8">
          
          {/* CATALOGO */}
          <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800">Punto de Venta</h1>
              
              {user.role === 'ADMIN' && (
                <select
                  value={selectedBranchId}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los Puntos de Venta</option>
                  {Array.from(new Set(inventories.map(inv => inv.branch_name)))
                    .map(name => inventories.find(inv => inv.branch_name === name))
                    .map(inv => (
                      <option key={inv.branch} value={inv.branch}>{inv.branch_name}</option>
                  ))}
                </select>
              )}
            </div>

            {loading ? (
              <p className="text-slate-500 text-center py-10">Cargando catálogo...</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 overflow-y-auto flex-1 content-start pr-2">
                {inventories
                  .filter(inv => selectedBranchId ? String(inv.branch) === String(selectedBranchId) : true)
                  .map(inv => {
                  const productDetail = products.find(p => p.sku === inv.product_sku) || { price: 0 };
                  const isHigh = inv.quantity > 5;
                  const isLow = inv.quantity <= 0;
                  const dotColor = isLow ? 'bg-red-500' : isHigh ? 'bg-green-500' : 'bg-yellow-500';

                  return (
                    <div key={inv.id} onClick={() => addToCart(inv)} className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-40 bg-white group relative">
                      {/* Price Tag */}
                      <span className="absolute top-2 right-2 bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] shadow-sm z-10 w-fit">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits:0 }).format(productDetail.price)}
                      </span>
                      
                      <div>
                        <div className="h-16 w-full mb-2 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center p-1 relative">
                          {inv.product_image ? (
                             <img src={inv.product_image.startsWith('http') ? inv.product_image : `http://127.0.0.1:8000${inv.product_image}`} alt={inv.product_name} className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                             <span className="text-slate-300 font-bold text-[10px]">Sin Foto</span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors text-sm">{inv.product_name}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.product_sku}</p>
                        {user.role === 'ADMIN' && <p className="text-[9px] uppercase font-bold text-indigo-500 mt-0.5">{inv.branch_name}</p>}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1.5">
                           {/* Stock Dots indicator */}
                           <span className={`h-2.5 w-2.5 rounded-full ${dotColor} inline-block animate-pulse shrink-0`}></span>
                           <span className={`text-[10px] font-bold ${isLow ? 'text-red-600' : isHigh ? 'text-green-600' : 'text-yellow-600'}`}>
                             {isLow ? 'Agotado' : isHigh ? 'Alto' : 'Medio'}
                           </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {inv.quantity} uds
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                  <div key={`${item.product}-${item.branch_name}`} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-sm relative">
                    <button onClick={() => removeFromCart(item.product)} className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 hover:opacity-100 shadow transition-opacity">X</button>
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 mb-1">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-blue-600 font-black">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits:0 }).format(item.price)}</p>
                        {user.role === 'ADMIN' && <p className="text-[9px] uppercase text-indigo-500 font-bold">{item.branch_name}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-sm">
                        <button onClick={() => updateQuantity(item.product, item.quantity - 1, item.available)} className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-xs">-</button>
                        <input type="number" value={item.quantity} readOnly className="w-8 text-center text-xs font-bold outline-none border-x border-slate-200" />
                        <button onClick={() => updateQuantity(item.product, item.quantity + 1, item.available)} className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-xs">+</button>
                      </div>
                      <p className="text-[10px] font-bold text-slate-700">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits:0 }).format(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 mt-2 mb-4">
              <div className="flex justify-between items-end mb-4 bg-slate-50 p-3 rounded-xl border border-blue-100">
                <span className="text-sm font-bold text-slate-500 uppercase">Total a Pagar</span>
                <span className="text-2xl font-black text-blue-700 tracking-tight">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits:0 }).format(cartTotal)}
                </span>
              </div>
              <button 
                onClick={handleOpenCheckout} 
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

      {/* MODAL DE CHECKOUT (SELECCIÓN DE FACTURA Y CLIENTE) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Detalles de Facturación</h2>
            
            <div className="flex gap-4 mb-6">
               <button 
                 onClick={() => setInvoiceType('FISICA')} 
                 className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${invoiceType === 'FISICA' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}
               >
                 🧾 Factura Física
               </button>
               <button 
                 onClick={() => setInvoiceType('ELECTRONICA')} 
                 className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${invoiceType === 'ELECTRONICA' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-300'}`}
               >
                 📧 Factura Electrónica
               </button>
            </div>

            {invoiceType === 'ELECTRONICA' && (
              <div className="space-y-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-700 text-sm">Datos del Cliente</h3>
                  {clientSearching && <span className="text-[10px] font-bold text-blue-500 animate-pulse">Buscando...</span>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cédula / NIT</label>
                  <input 
                    type="text" 
                    value={clientData.id_document} 
                    onChange={handleClientSearch}
                    placeholder="Escribe para buscar..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={clientData.name} 
                    onChange={e => setClientData({...clientData, name: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                    <input 
                      type="text" 
                      value={clientData.phone} 
                      onChange={e => setClientData({...clientData, phone: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={clientData.email} 
                      onChange={e => setClientData({...clientData, email: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
               >
                 Cancelar
              </button>
              <button 
                onClick={handleCheckout}
                disabled={invoiceType === 'ELECTRONICA' && (!clientData.id_document || !clientData.name)}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FACTURA (Visible también en Impresión) */}
      {invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm print:bg-white print:static print:h-screen print:w-full print:block">
          <div className="bg-transparent print:bg-white flex flex-col max-h-[95vh] w-full items-center">
            
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto mb-4 print:shadow-none print:w-full print:p-0 print:mb-0">
               <FacturaImprimible ref={componentRef} saleData={invoiceData} user={user} />
            </div>

            <div className="flex gap-4 print:hidden">
              <button onClick={handlePrintReset} className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow hover:bg-slate-50 border border-slate-200">
                Cerrar e Iniciar Nueva
              </button>
              <button onClick={() => window.print()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700 flex items-center gap-2">
                🖨️ Imprimir Recibo
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
