import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { 
  getCategories, createCategory, updateCategory, deleteCategory, getProducts, createProduct, updateProduct, deleteProduct, 
  getInventories, getMovements, createMovement, getDashboardAlerts, getProviders, importProductsExcel, bulkDeleteProducts, bulkUpdateProducts
} from "../services/inventoryService";
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from "../utils/alerts";
import { ShoppingCart, AlertTriangle, Clock, List, LayoutGrid, PackageX, Edit2, Building, Search, Trash2, Upload } from "lucide-react";
import { formatCurrency } from "../utils/currency";

export default function Inventario() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [activeTab, setActiveTab] = useState("inventario");

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [providers, setProviders] = useState([]);
  const [alerts, setAlerts] = useState({ cercanos_fin_vida: [], stock_muerto: [], bajo_stock: [] });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  
  // SELECTION STATES
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ category: "", price: "" });

  // EXCEL IMPORT STATES
  const [showImportModal, setShowImportModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      showErrorAlert("Por favor selecciona un archivo Excel o CSV.");
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", excelFile);
      const res = await importProductsExcel(formData);
      showSuccessAlert(res.message || "Productos importados con éxito");
      setShowImportModal(false);
      setExcelFile(null);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al importar el archivo Excel/CSV.";
      showErrorAlert(msg);
    } finally {
      setImporting(false);
    }
  };

  // FILTERS
  const [showInvFilters, setShowInvFilters] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  // Kardex Filters
  const [movYearFilter, setMovYearFilter] = useState(new Date().getFullYear());
  const [movMonthFilter, setMovMonthFilter] = useState(new Date().getMonth() + 1);

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
        const [prodRes, invRes, catRes] = await Promise.all([getProducts(), getInventories(), getCategories()]);
        setProducts(prodRes);
        setInventories(invRes);
        setCategories(catRes);
      } else if (activeTab === "movimientos") {
        setMovements(await getMovements({ year: movYearFilter, month: movMonthFilter }));
        setInventories(await getInventories());
      } else if (activeTab === "alertas") {
        setAlerts(await getDashboardAlerts());
      }
    } catch (error) {
      console.error("Error loading data", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab, movYearFilter, movMonthFilter]);

  // CATEGORY FORM
  const [newCatName, setNewCatName] = useState("");
  const [catVidaUtil, setCatVidaUtil] = useState(1);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingCategory) {
        await updateCategory(editingCategoryId, { name: newCatName, vida_util_anios: catVidaUtil });
        showSuccessAlert("Categoría actualizada con éxito");
      } else {
        await createCategory({ name: newCatName, vida_util_anios: catVidaUtil });
        showSuccessAlert("Categoría creada con éxito");
      }
      setNewCatName("");
      setCatVidaUtil(1);
      setIsEditingCategory(false);
      setEditingCategoryId(null);
      loadData();
    } catch (err) { 
      const msg = err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response.data : null) || `Error al guardar categoría: ${err.message}`;
      showErrorAlert(msg); 
    }
  };

  const handleDeleteCategory = async (id) => {
    const isConfirmed = await showConfirmAlert("¿Eliminar categoría?", "Esta acción no se puede deshacer.");
    if (!isConfirmed) return;
    try {
      await deleteCategory(id);
      showSuccessAlert("Categoría eliminada con éxito");
      if (isEditingCategory && editingCategoryId === id) {
        setIsEditingCategory(false);
        setEditingCategoryId(null);
        setNewCatName("");
        setCatVidaUtil(1);
      }
      loadData();
    } catch (err) { showErrorAlert("Error al eliminar la categoría. Probablemente tenga productos asociados."); }
  };

  const openEditCategory = (cat) => {
    setNewCatName(cat.name);
    setCatVidaUtil(cat.vida_util_anios);
    setIsEditingCategory(true);
    setEditingCategoryId(cat.id);
  };

  // PRODUCT FORM
  const [showProductModal, setShowProductModal] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [prodData, setProdData] = useState({ name: "", sku: "", price: "", category: "", fecha_ingreso: "", image: null, providers: [], description: "" });

  useEffect(() => {
    if (showProductModal) {
      getCategories().then(setCategories).catch(console.error);
      getProviders().then(setProviders).catch(console.error);
    }
  }, [showProductModal]);

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", prodData.name);
      formData.append("sku", prodData.sku);
      formData.append("price", prodData.price);
      formData.append("category", prodData.category);
      formData.append("is_active", "true");
      if (prodData.fecha_ingreso) formData.append("fecha_ingreso", prodData.fecha_ingreso);
      if (prodData.image) formData.append("image", prodData.image);
      if (prodData.description) formData.append("description", prodData.description);

      // Handle array appending replacing correctly
      if (prodData.providers && prodData.providers.length > 0) {
        prodData.providers.forEach(pId => formData.append("providers", pId));
      }

      if (isEditingProduct) {
        await updateProduct(editingProductId, formData);
      } else {
        await createProduct(formData);
      }

      setShowProductModal(false);
      setIsEditingProduct(false);
      setEditingProductId(null);
      setProdData({ name: "", sku: "", price: "", category: "", fecha_ingreso: "", image: null, providers: [], description: "" });
      showSuccessAlert("Producto guardado con éxito");
      loadData();
    } catch (err) { 
      const msg = err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response.data : null) || `Error al guardar producto: ${err.message}`;
      showErrorAlert(msg); 
    }
  };

  const handleDeleteProduct = async () => {
    const isConfirmed = await showConfirmAlert("¿Eliminar producto?", "Esta acción no se puede deshacer.");
    if (!isConfirmed) return;
    try {
      await deleteProduct(editingProductId);
      showSuccessAlert("Producto eliminado con éxito");
      setShowProductModal(false);
      setIsEditingProduct(false);
      setEditingProductId(null);
      loadData();
    } catch (err) { showErrorAlert("Error al eliminar el producto. Quizás tenga ventas o movimientos asociados."); }
  };

  const openEditProduct = (product) => {
    setProdData({
      name: product.name,
      sku: product.sku,
      price: product.price,
      category: product.category,
      fecha_ingreso: product.fecha_ingreso ? product.fecha_ingreso.split("T")[0] : "",
      description: product.description || "",
      image: null, // Don't pre-fill file input
      providers: product.providers || []
    });
    setIsEditingProduct(true);
    setEditingProductId(product.id);
    setShowProductModal(true);
  };

  const handleSelectProduct = (productId, isChecked) => {
    if (isChecked) {
      setSelectedProductIds([...selectedProductIds, productId]);
    } else {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleBulkDelete = async () => {
    const isConfirmed = await showConfirmAlert(
      "¿Eliminar productos seleccionados?",
      `Esta acción intentará eliminar o inactivar los ${selectedProductIds.length} productos seleccionados. ¿Continuar?`
    );
    if (!isConfirmed) return;
    
    setLoading(true);
    try {
      const res = await bulkDeleteProducts(selectedProductIds);
      showSuccessAlert(res.detail || "Productos eliminados con éxito");
      setSelectedProductIds([]);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al eliminar productos seleccionados.";
      showErrorAlert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!bulkEditData.category && !bulkEditData.price) {
      showErrorAlert("Debes especificar al menos un campo para actualizar.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        ids: selectedProductIds,
        ...(bulkEditData.category ? { category: bulkEditData.category } : {}),
        ...(bulkEditData.price ? { price: bulkEditData.price } : {})
      };
      const res = await bulkUpdateProducts(payload);
      showSuccessAlert(res.detail || "Productos actualizados con éxito");
      setShowBulkEditModal(false);
      setBulkEditData({ category: "", price: "" });
      setSelectedProductIds([]);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al actualizar productos seleccionados.";
      showErrorAlert(msg);
    } finally {
      setLoading(false);
    }
  };


  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProdData({ ...prodData, image: e.target.files[0] });
    }
  };

  const toggleProvider = (id) => {
    const list = [...prodData.providers];
    const index = list.indexOf(id);
    if (index > -1) list.splice(index, 1);
    else list.push(id);
    setProdData({ ...prodData, providers: list });
  };

  // MOVEMENT FORM
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movData, setMovData] = useState({ inventory: "", movement_type: "ENTRY", quantity: 1, notes: "" });

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    try {
      await createMovement(movData);
      setShowMovementModal(false);
      showSuccessAlert("Movimiento registrado con éxito");
      loadData();
    } catch (err) { 
      const msg = err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response.data : null) || `Error al registrar movimiento: ${err.message}`;
      showErrorAlert(msg); 
    }
  };

  const getProductDetails = (sku) => {
    return products.find(p => p.sku === sku) || {};
  };

  const filteredProducts = products.filter(product => {
    let passSearch = true; let passCat = true; let passBranch = true;
    if (searchFilter) {
      const term = searchFilter.toLowerCase();
      passSearch = product.name?.toLowerCase().includes(term) || product.sku?.toLowerCase().includes(term);
    }
    if (categoryFilter) { passCat = String(product.category) === String(categoryFilter); }
    if (branchFilter && user.role === 'ADMIN') { 
        passBranch = inventories.some(inv => inv.product_sku === product.sku && String(inv.branch_id) === String(branchFilter)); 
    }
    return passSearch && passCat && passBranch;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">Bodega e Inventario</h1>

          {/* TABS */}
          <div className="flex space-x-2 border-b border-slate-200 mb-6">
            <button onClick={() => setActiveTab("inventario")} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'inventario' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Catálogo de Productos</button>
            <button onClick={() => setActiveTab("categorias")} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'categorias' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Categorías</button>
            <button onClick={() => setActiveTab("movimientos")} className={`px-4 py-2 font-medium transition-colors ${activeTab === 'movimientos' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Kardex</button>
            <button onClick={() => setActiveTab("alertas")} className={`px-4 py-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'alertas' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700'}`}>
              Alertas UI <span className={`flex h-2 w-2 relative ml-1 ${alerts.bajo_stock?.length > 0 ? '' : 'hidden'}`}><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-400 mt-20 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="mt-4 font-medium">Cargando módulos...</span>
            </div>
          ) : (
            <>
              {/* TAB: INVENTARIO */}
              {activeTab === "inventario" && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                      <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LayoutGrid className="w-5 h-5" />
                      </button>
                      <button onClick={() => setViewMode("table")} className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                        <List className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowInvFilters(!showInvFilters)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${showInvFilters ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}>
                         Filtros Administrativos { (searchFilter || categoryFilter || branchFilter) && <span className="bg-blue-500 w-2 h-2 rounded-full shadow-sm"></span> }
                      </button>
                      {user.role !== 'EMPLEADO' && (
                        <div className="flex gap-2">
                          <button onClick={() => {
                              setExcelFile(null);
                              setShowImportModal(true);
                          }} className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Importar Excel
                          </button>
                          <button onClick={() => {
                              setIsEditingProduct(false);
                              setEditingProductId(null);
                              setProdData({ name: "", sku: "", price: "", category: "", fecha_ingreso: "", image: null, providers: [], description: "" });
                              setShowProductModal(true);
                          }} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                            + Nuevo Producto
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {showInvFilters && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-5 shadow-sm animate-in slide-in-from-top-2">
                       <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5" /> Buscar en Catálogo
                          </label>
                          <input type="text" placeholder="SKU o nombre de producto..." value={searchFilter} onChange={e=>setSearchFilter(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700" />
                       </div>
                       
                       <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                            Filtrar por Categoría
                          </label>
                          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 cursor-pointer">
                             <option value="">Todas las Categorías</option>
                             {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                       
                       {user.role === 'ADMIN' && (
                         <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5" /> Filtrar por Sede
                            </label>
                            <select value={branchFilter} onChange={e=>setBranchFilter(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-blue-700 cursor-pointer">
                               <option value="">Consolidado (Todas las Sedes)</option>
                               {Array.from(new Set(inventories.map(inv => inv.branch_name)))
                                .map(name => inventories.find(inv => inv.branch_name === name))
                                .filter(Boolean)
                                .map(inv => (
                                  <option key={inv.branch_id} value={inv.branch_id}>{inv.branch_name}</option>
                                ))}
                            </select>
                         </div>
                       )}
                       
                       <div className="flex items-end">
                          <button onClick={() => {setSearchFilter(""); setCategoryFilter(""); setBranchFilter("");}} className="h-[42px] px-6 text-slate-500 hover:text-slate-800 text-sm font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                            Limpiar Filtros
                          </button>
                       </div>
                    </div>
                  )}

                  {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                      <p className="text-slate-500 font-medium">No se encontraron productos.</p>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredProducts.map(product => {
                        const prodInvs = inventories.filter(inv => inv.product_sku === product.sku);
                        const displayInvs = (branchFilter && user.role === 'ADMIN') ? prodInvs.filter(i => String(i.branch_id) === String(branchFilter)) : prodInvs;
                        const totalQuantity = displayInvs.reduce((sum, i) => sum + i.quantity, 0);
                        const isLowStock = totalQuantity > 0 && totalQuantity < 10;
                        
                        return (
                          <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col group relative">
                            <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                              {/* Selection Checkbox */}
                              {user.role === 'ADMIN' && (
                                <div className="absolute top-3 left-3 z-10 bg-white/85 rounded-md p-1 backdrop-blur-sm border border-slate-200 shadow-sm">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedProductIds.includes(product.id)} 
                                    onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                                  />
                                </div>
                              )}
                              {product.image ? (
                                <img src={product.image?.replace(/^https?:\/\/[^\/]+/, '')} alt={product.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 mix-blend-multiply" />
                              ) : (
                                <span className="text-slate-300 font-bold text-lg px-6 text-center">{product.name}</span>
                              )}
                              {isLowStock && (
                                <span className={`absolute top-3 ${user.role === 'ADMIN' ? 'left-11' : 'left-3'} bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm`}>Bajo Stock</span>
                              )}
                            </div>
                            
                            {user.role === 'ADMIN' && (
                              <button onClick={() => openEditProduct(product)} className="absolute top-3 right-3 bg-white/90 p-2 rounded-xl text-blue-500 hover:text-blue-700 hover:bg-white shadow-sm transition opacity-0 group-hover:opacity-100 z-10">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            <div className="p-5 flex-1 flex flex-col">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{product.sku}</p>
                              <h3 className="text-base font-bold text-slate-800 leading-snug line-clamp-2">{product.name}</h3>
                              <div className="mt-4 flex items-end justify-between mt-auto">
                                <div>
                                  <p className="text-xs text-slate-500 font-medium pb-0.5">Precio Base</p>
                                  <p className="text-lg font-black text-blue-600">{formatCurrency(product.price)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-400 uppercase">En Sede(s)</p>
                                  <p className={`font-bold text-lg ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>{totalQuantity} <span className="text-xs">uds</span></p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase text-xs font-bold border-b border-slate-100">
                          <tr>
                            {user.role === 'ADMIN' && (
                              <th className="px-6 py-4 w-12">
                                <input 
                                  type="checkbox" 
                                  checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length} 
                                  onChange={(e) => handleSelectAll(e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                                />
                              </th>
                            )}
                            <th className="px-6 py-4">Foto / SKU</th>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4">Fin de Vida</th>
                            <th className="px-6 py-4">Precio</th>
                            <th className="px-6 py-4">Stock Disp</th>
                            <th className="px-6 py-4"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredProducts.map(product => {
                            const prodInvs = inventories.filter(inv => inv.product_sku === product.sku);
                            const displayInvs = (branchFilter && user.role === 'ADMIN') ? prodInvs.filter(i => String(i.branch_id) === String(branchFilter)) : prodInvs;
                            const totalQuantity = displayInvs.reduce((sum, i) => sum + i.quantity, 0);
                            
                            return (
                              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                {user.role === 'ADMIN' && (
                                  <td className="px-6 py-4 w-12">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedProductIds.includes(product.id)} 
                                      onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" 
                                    />
                                  </td>
                                )}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    {product.image ? (
                                      <img src={typeof product.image === 'string' ? product.image.replace(/^https?:\/\/[^\/]+/, '') : ''} alt={product.name} className="w-10 h-10 rounded-lg object-contain bg-slate-100 p-1 mix-blend-multiply" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shrink-0"></div>
                                    )}
                                    <span className="font-semibold text-slate-700">{product.sku}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-800">
                                  {product.name}
                                  {user.role === 'ADMIN' && branchFilter && (
                                    <span className="text-[10px] font-bold text-blue-500 block uppercase mt-1">Sede Filtrada</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-xs">
                                  {product.fecha_estimada_fin_vida ? new Date(product.fecha_estimada_fin_vida).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 font-bold">{formatCurrency(product.price)}</td>
                                <td className="px-6 py-4 font-bold text-blue-600">{totalQuantity} uds</td>
                                <td className="px-6 py-4">
                                  {user.role === 'ADMIN' && (
                                    <button onClick={() => openEditProduct(product)} className="text-blue-500 hover:text-blue-700">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

              {/* TAB: CATEGORÍAS */}
              {activeTab === "categorias" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {user.role !== 'EMPLEADO' && (
                    <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                      <h2 className="text-lg font-bold mb-4">{isEditingCategory ? "Editar Familia / Categoría" : "Nueva Familia / Categoría"}</h2>
                      <form onSubmit={handleCatSubmit} className="flex flex-col gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                          <input required type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full border p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Vida Útil Estimada (Años)</label>
                          <input required type="number" min="0" value={catVidaUtil} onChange={e => setCatVidaUtil(e.target.value)} className="w-full border p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 mt-1" />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold shadow-sm">
                            {isEditingCategory ? "Guardar" : "Guardar Familia"}
                          </button>
                          {isEditingCategory && (
                            <button type="button" onClick={() => {
                              setIsEditingCategory(false);
                              setEditingCategoryId(null);
                              setNewCatName("");
                              setCatVidaUtil(1);
                            }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl py-2.5 px-4 font-semibold shadow-sm">
                              Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}
                  <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-4">Listado de Categorías</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {categories.map(c => (
                        <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-200 transition-colors relative group">
                          <h3 className="font-bold text-slate-800 pr-6">{c.name}</h3>
                          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Vida útil: {c.vida_util_anios} años</p>
                          {user.role !== 'EMPLEADO' && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => openEditCategory(c)} className="text-blue-500 hover:text-blue-700">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteCategory(c.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: MOVIMIENTOS */}
              {activeTab === "movimientos" && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-bold text-slate-800">Kardex de Movimientos</h2>
                      <p className="text-xs text-slate-500 font-medium">Historial detallado de entradas y salidas de inventario</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                        <select 
                          value={movYearFilter} 
                          onChange={e => setMovYearFilter(e.target.value)}
                          className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer px-2"
                        >
                          {[...Array(5)].map((_, i) => {
                            const y = new Date().getFullYear() - i;
                            return <option key={y} value={y}>{y}</option>
                          })}
                        </select>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <select 
                          value={movMonthFilter} 
                          onChange={e => setMovMonthFilter(e.target.value)}
                          className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer px-2"
                        >
                          <option value="1">Enero</option>
                          <option value="2">Febrero</option>
                          <option value="3">Marzo</option>
                          <option value="4">Abril</option>
                          <option value="5">Mayo</option>
                          <option value="6">Junio</option>
                          <option value="7">Julio</option>
                          <option value="8">Agosto</option>
                          <option value="9">Septiembre</option>
                          <option value="10">Octubre</option>
                          <option value="11">Noviembre</option>
                          <option value="12">Diciembre</option>
                        </select>
                      </div>

                      <button onClick={() => setShowMovementModal(true)} className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                        + Registrar Movilidad
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-400 uppercase text-xs border-y border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-bold">Fecha / Hora</th>
                          <th className="px-4 py-3 font-bold">Operación</th>
                          <th className="px-4 py-3 font-bold">Producto</th>
                          <th className="px-4 py-3 font-bold">Magnitud</th>
                          <th className="px-4 py-3 font-bold">Sede</th>
                          <th className="px-4 py-3 font-bold">Ejecutado por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {movements.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-500">{new Date(m.date).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${m.movement_type === 'ENTRY' ? 'bg-green-100 text-green-700' : m.movement_type === 'EXIT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {m.movement_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{m.inventory_product_name}</td>
                            <td className="px-4 py-3 font-black text-slate-700">{m.quantity}</td>
                            <td className="px-4 py-3 text-[10px] uppercase font-bold text-slate-400">{m.branch_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-slate-500">{m.user_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: ALERTAS */}
              {activeTab === "alertas" && (
                <div className="space-y-6">
                  {/* BAJO STOCK */}
                  <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden relative">
                    <div className="h-1 w-full bg-red-500 absolute top-0 left-0"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><AlertTriangle className="w-5 h-5" /></div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 leading-none">Alerta de Bajo Stock</h2>
                          <p className="text-sm text-slate-500 mt-1">Productos por debajo del mínimo permitido</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                        {alerts.bajo_stock?.length === 0 && <p className="text-slate-400 font-medium">No hay productos con bajo stock en la bodega.</p>}
                        {alerts.bajo_stock?.map(a => (
                          <div key={a.id} className="bg-red-50/50 p-4 border border-red-100 rounded-xl">
                            <h3 className="font-bold text-slate-800">{a.product_name}</h3>
                            <div className="flex justify-between mt-2 text-sm font-medium">
                              <span className="text-red-600">Actual: {a.quantity}</span>
                              <span className="text-slate-500">Mínimo ideal: {a.min_stock}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* FIN DE VIDA */}
                  <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden relative">
                    <div className="h-1 w-full bg-amber-500 absolute top-0 left-0"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Clock className="w-5 h-5" /></div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 leading-none">Fin de Vida Útil Cercano</h2>
                          <p className="text-sm text-slate-500 mt-1">Productos que vencerán o quedarán obsoletos pronto</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                        {alerts.cercanos_fin_vida?.length === 0 && <p className="text-slate-400 font-medium">Ningún producto en base a su categoría está por expirar su vida útil próxima.</p>}
                        {alerts.cercanos_fin_vida?.map(p => (
                          <div key={p.id} className="bg-amber-50/50 p-4 border border-amber-100 rounded-xl">
                            <h3 className="font-bold text-slate-800">{p.name}</h3>
                            <p className="text-xs text-amber-700 font-bold uppercase mt-2">Fin estimado: {new Date(p.fecha_estimada_fin_vida).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* STOCK MUERTO */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                    <div className="h-1 w-full bg-slate-500 absolute top-0 left-0"></div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><PackageX className="w-5 h-5" /></div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 leading-none">Stock Muerto (Sin Rotación)</h2>
                          <p className="text-sm text-slate-500 mt-1">Inventarios que no han registrado salidas en 3 meses</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                        {alerts.stock_muerto?.length === 0 && <p className="text-slate-400 font-medium">Excelente rotación de mercancía.</p>}
                        {alerts.stock_muerto?.map(a => (
                          <div key={a.inventory.id} className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                            <h3 className="font-bold text-slate-800">{a.inventory.product_name}</h3>
                            <div className="flex justify-between items-center mt-2">
                              <p className="text-xs text-slate-500">{a.reason}</p>
                              <span className="text-xs font-bold px-2 py-1 bg-slate-200 rounded text-slate-600">Stock: {a.inventory.quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* MODAL PRODUCTO */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="font-bold text-2xl text-slate-800 mb-6">{isEditingProduct ? "Modificar Producto" : "Crear Nuevo Producto"}</h2>
            {!isEditingProduct && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">¿Quieres cargar productos de forma masiva?</h4>
                  <p className="text-xs text-emerald-600 mt-0.5">Sube una hoja de cálculo (Excel/CSV) con el listado completo.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setExcelFile(null);
                    setShowImportModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" /> Subir Excel/CSV
                </button>
              </div>
            )}
            <form onSubmit={handleProductSubmit} className="flex flex-col gap-6">

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Fotografía o Banner</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                  <input required disabled={isEditingProduct} type="text" value={prodData.sku} onChange={e => setProdData({ ...prodData, sku: e.target.value })} className={`w-full border border-slate-200 p-2.5 rounded-xl mt-1 outline-none transition-colors ${isEditingProduct ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 focus:border-blue-500'}`} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                <input required type="text" value={prodData.name} onChange={e => setProdData({ ...prodData, name: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Descripción</label>
                <textarea value={prodData.description} onChange={e => setProdData({ ...prodData, description: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-colors" rows="2" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Precio Unitario Base</label>
                  <input required type="number" step="0.01" value={prodData.price} onChange={e => setProdData({ ...prodData, price: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Categoría Perteneciente</label>
                  <select required value={prodData.category} onChange={e => setProdData({ ...prodData, category: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-colors font-medium">
                    <option value="">Seleccione Categoría...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Recepción / Origen</label>
                <input type="date" value={prodData.fecha_ingreso} onChange={e => setProdData({ ...prodData, fecha_ingreso: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-colors" />
                <p className="text-[11px] text-slate-400 mt-1">Sirve para deducir la estimación de vida útil según su familia de categoría.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Asociar Proveedores Autorizados</label>
                <div className="bg-slate-50 rounded-xl max-h-40 overflow-y-auto border border-slate-200 p-3 grid grid-cols-2 gap-2">
                  {providers.length === 0 ? <p className="text-xs text-slate-400 p-2">No hay proveedores creados</p> : null}
                  {providers.map(p => (
                    <label key={p.id} className="flex items-center p-2 border border-slate-200 rounded-lg hover:border-blue-300 bg-white cursor-pointer select-none">
                      <input type="checkbox" className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" checked={prodData.providers.includes(p.id)} onChange={() => toggleProvider(p.id)} />
                      <span className="text-sm font-medium text-slate-700 truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-6 border-t border-slate-100">
                <div>
                  {isEditingProduct && (
                    <button type="button" onClick={handleDeleteProduct} className="px-5 py-2.5 bg-red-50 text-red-600 font-bold hover:bg-red-100 rounded-xl transition-colors">
                      Eliminar Producto
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowProductModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm">{isEditingProduct ? "Guardar Cambios" : "Integrar Producto"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO (Mantenido Básico como antes) */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-xl">
            <h2 className="font-bold text-xl mb-6 text-slate-800">Registrar Intervención</h2>
            <form onSubmit={handleMovementSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Razón de Movilidad</label>
                <select required onChange={e => setMovData({ ...movData, movement_type: e.target.value })} className="w-full border p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500">
                  <option value="ENTRY">ENTRADA (Reposición Interna)</option>
                  <option value="EXIT">SALIDA (Consumo/Despacho)</option>
                  <option value="ADJUSTMENT">AJUSTE (Auditoría)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Seleccionar Referencia Fija</label>
                <select required onChange={e => setMovData({ ...movData, inventory: e.target.value })} className="w-full border p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500">
                  <option value="">Buscar de la propia sede...</option>
                  {inventories.map(i => <option key={i.id} value={i.id}>[{i.product_sku}] {i.product_name} - Q: {i.quantity}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cifra Real</label>
                <input required type="number" min="1" placeholder="Ej: 15" onChange={e => setMovData({ ...movData, quantity: e.target.value })} className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowMovementModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Volver</button>
                <button type="submit" className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-sm">Aplicar Flujo</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL IMPORTAR EXCEL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-slate-800 leading-none">Importar Inventario</h2>
                <p className="text-xs text-slate-500 mt-1">Carga masiva desde una hoja de cálculo (Excel/CSV)</p>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="flex flex-col gap-5">
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 flex flex-col items-center justify-center min-h-[140px] relative">
                <input
                  required
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-bold text-slate-700">
                  {excelFile ? excelFile.name : "Selecciona o arrastra tu archivo"}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Soporta .xlsx, .xls y .csv
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Columnas detectadas automáticamente:</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-medium">
                  <li><b>Nombre:</b> Nombre, Producto, Item, etc. (Obligatorio)</li>
                  <li><b>Descripción:</b> Detalles, Info, etc. (Opcional)</li>
                  <li><b>Precio Base:</b> Precio, Valor, Costo, etc. (Opcional, default: $1.000)</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => setShowImportModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-55"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-55 flex items-center gap-2"
                >
                  {importing ? "Importando..." : "Subir Archivo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARRA DE ACCIONES MASIVAS */}
      {user.role === 'ADMIN' && selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-bold text-slate-300">
            {selectedProductIds.length} seleccionado{selectedProductIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setShowBulkEditModal(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Modificar Selección
            </button>
            <button 
              type="button"
              onClick={handleBulkDelete} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Eliminar Selección
            </button>
            <button 
              type="button"
              onClick={() => setSelectedProductIds([])} 
              className="text-slate-400 hover:text-white px-2 py-2 text-xs font-medium"
            >
              Despejar
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN MASIVA */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="font-bold text-xl text-slate-800 mb-2">Editar Selección Masiva</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Modifica {selectedProductIds.length} productos seleccionados simultáneamente. Deja vacío el campo que no quieras cambiar.</p>
            
            <form onSubmit={handleBulkUpdateSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nueva Categoría</label>
                <select 
                  value={bulkEditData.category} 
                  onChange={e => setBulkEditData({ ...bulkEditData, category: e.target.value })} 
                  className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 transition-colors font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="">Mantener original / No cambiar</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nuevo Precio Unitario Base</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Mantener original / No cambiar"
                  value={bulkEditData.price} 
                  onChange={e => setBulkEditData({ ...bulkEditData, price: e.target.value })} 
                  className="w-full border border-slate-200 p-2.5 rounded-xl bg-slate-50 outline-none focus:border-blue-500 transition-colors text-sm font-medium" 
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBulkEditModal(false);
                    setBulkEditData({ category: "", price: "" });
                  }} 
                  className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Aplicar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

