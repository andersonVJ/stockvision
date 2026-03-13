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
    const res = await axios.get("http://127.0.0.1:8000/api/inventory/categories/", getAuthHeaders());
    return res.data;
};

export const createCategory = async (data) => {
    const res = await axios.post("http://127.0.0.1:8000/api/inventory/categories/", data, getAuthHeaders());
    return res.data;
};

export const getProducts = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/inventory/products/", getAuthHeaders());
    return res.data;
};

export const createProduct = async (data) => {
    const res = await axios.post("http://127.0.0.1:8000/api/inventory/products/", data, getAuthHeaders());
    return res.data;
};

export const getInventories = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/inventory/inventories/", getAuthHeaders());
    return res.data;
};

export const getLowStockAlerts = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/inventory/inventories/low_stock_alerts/", getAuthHeaders());
    return res.data;
};

export const getMovements = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/inventory/movements/", getAuthHeaders());
    return res.data;
};

export const createMovement = async (data) => {
    const res = await axios.post("http://127.0.0.1:8000/api/inventory/movements/", data, getAuthHeaders());
    return res.data;
};

export const getBranches = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/companies/branches/", getAuthHeaders());
    return res.data;
};

export const createBranch = async (data) => {
    const res = await axios.post("http://127.0.0.1:8000/api/companies/branches/", data, getAuthHeaders());
    return res.data;
};

export const updateBranch = async (id, data) => {
    const res = await axios.put(`http://127.0.0.1:8000/api/companies/branches/${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteBranch = async (id) => {
    const res = await axios.delete(`http://127.0.0.1:8000/api/companies/branches/${id}/`, getAuthHeaders());
    return res.data;
};

export const getSales = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/inventory/sales/", getAuthHeaders());
    return res.data;
};

export const createSale = async (data) => {
    const res = await axios.post("http://127.0.0.1:8000/api/inventory/sales/", data, getAuthHeaders());
    return res.data;
};
