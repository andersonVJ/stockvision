import axios from "axios";

// Helper function to get authorization headers
const getAuthHeaders = () => {
    const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
    return {
        headers: {
            "Authorization": `Bearer ${tokens.access}`
        }
    };
};

export const getCategories = async () => {
    const res = await axios.get("/api/inventory/categories/", getAuthHeaders());
    return res.data;
};

export const createCategory = async (data) => {
    const res = await axios.post("/api/inventory/categories/", data, getAuthHeaders());
    return res.data;
};

export const updateCategory = async (id, data) => {
    const res = await axios.put(`/api/inventory/categories/${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteCategory = async (id) => {
    const res = await axios.delete(`/api/inventory/categories/${id}/`, getAuthHeaders());
    return res.data;
};

export const getProducts = async () => {
    const res = await axios.get("/api/inventory/products/", getAuthHeaders());
    return res.data;
};

export const createProduct = async (data) => {
    const res = await axios.post("/api/inventory/products/", data, getAuthHeaders());
    return res.data;
};

export const updateProduct = async (id, data) => {
    const res = await axios.put(`/api/inventory/products/${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteProduct = async (id) => {
    const res = await axios.delete(`/api/inventory/products/${id}/`, getAuthHeaders());
    return res.data;
};

export const getInventories = async () => {
    const res = await axios.get("/api/inventory/inventories/", getAuthHeaders());
    return res.data;
};

export const getLowStockAlerts = async () => {
    const res = await axios.get("/api/inventory/inventories/low_stock_alerts/", getAuthHeaders());
    return res.data;
};

export const getMovements = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/inventory/movements/${params ? `?${params}` : ''}`;
    const res = await axios.get(url, getAuthHeaders());
    return res.data;
};


export const createMovement = async (data) => {
    const res = await axios.post("/api/inventory/movements/", data, getAuthHeaders());
    return res.data;
};

export const getCompanies = async () => {
    const res = await axios.get("/api/companies/", getAuthHeaders());
    return res.data;
};

export const getBranches = async () => {
    const res = await axios.get("/api/companies/branches/", getAuthHeaders());
    return res.data;
};

export const createBranch = async (data) => {
    const res = await axios.post("/api/companies/branches/", data, getAuthHeaders());
    return res.data;
};

export const updateBranch = async (id, data) => {
    const res = await axios.put(`/api/companies/branches/${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteBranch = async (id) => {
    const res = await axios.delete(`/api/companies/branches/${id}/`, getAuthHeaders());
    return res.data;
};

export const getSales = async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/inventory/sales/${params ? `?${params}` : ''}`;
    const res = await axios.get(url, getAuthHeaders());
    return res.data;
};

export const getSalesByClient = async (document) => {
    const res = await axios.get(`/api/inventory/sales/?client_document=${document}`, getAuthHeaders());
    return res.data;
};

export const createSale = async (data) => {
    const res = await axios.post("/api/inventory/sales/", data, getAuthHeaders());
    return res.data;
};

export const sendInvoiceEmail = async (saleId, email = null) => {
    const payload = email ? { email } : {};
    const res = await axios.post(`/api/inventory/sales/${saleId}/send_email/`, payload, getAuthHeaders());
    return res.data;
};

// --- NEW PROVIDERS API ---
export const getProviders = async () => {
    const res = await axios.get("/api/inventory/providers/", getAuthHeaders());
    return res.data;
};

export const createProvider = async (data) => {
    const res = await axios.post("/api/inventory/providers/", data, getAuthHeaders());
    return res.data;
};

export const updateProvider = async (id, data) => {
    const res = await axios.put(`/api/inventory/providers/${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteProvider = async (id) => {
    const res = await axios.delete(`/api/inventory/providers/${id}/`, getAuthHeaders());
    return res.data;
};

// --- NEW ENTRIES API ---
export const getEntries = async () => {
    const res = await axios.get("/api/inventory/entries/", getAuthHeaders());
    return res.data;
};

export const createEntry = async (data) => {
    const res = await axios.post("/api/inventory/entries/", data, getAuthHeaders());
    return res.data;
};

// --- DASHBOARD ALERTS ---
export const getDashboardAlerts = async () => {
    const res = await axios.get("/api/inventory/products/dashboard_alerts/", getAuthHeaders());
    return res.data;
};

// --- NEW CLIENTS API ---
export const getClientByDocument = async (idDocument) => {
    const res = await axios.get(`/api/companies/clients/?id_document=${idDocument}`, getAuthHeaders());
    return res.data;
};

// --- COMPANY CRUD ---
export const createCompany = async (data) => {
    const res = await axios.post("/api/companies/", data, getAuthHeaders());
    return res.data;
};

export const updateCompany = async (id, data) => {
    const res = await axios.put(`/api/companies/${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteCompany = async (id) => {
    const res = await axios.delete(`/api/companies/${id}/`, getAuthHeaders());
    return res.data;
};

// --- EMPLOYEES ---
export const getEmployees = async (companyId = null) => {
    const url = companyId ? `/api/users/employees/?company=${companyId}` : "/api/users/employees/";
    const res = await axios.get(url, getAuthHeaders());
    return res.data;
};

export const createEmployee = async (data) => {
    const res = await axios.post("/api/users/employees/", data, getAuthHeaders());
    return res.data;
};

export const updateEmployee = async (id, data) => {
    const res = await axios.patch(`/api/users/employees/${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteEmployee = async (id) => {
    const res = await axios.delete(`/api/users/employees/${id}/`, getAuthHeaders());
    return res.data;
};

export const importProductsExcel = async (formData) => {
    const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
    const res = await axios.post("/api/inventory/products/import_excel/", formData, {
        headers: {
            "Authorization": `Bearer ${tokens.access}`,
            "Content-Type": "multipart/form-data"
        }
    });
    return res.data;
};
