import axios from "axios";

const getAuthHeaders = () => {
    const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
    return {
        headers: {
            "Authorization": `Bearer ${tokens.access}`
        }
    };
};

export const getOrders = async () => {
    const res = await axios.get("http://127.0.0.1:8000/api/inventory/orders/", getAuthHeaders());
    return res.data;
};

export const createOrder = async (data) => {
    const res = await axios.post("http://127.0.0.1:8000/api/inventory/orders/", data, getAuthHeaders());
    return res.data;
};

export const approveOrder = async (orderId) => {
    const res = await axios.post(`http://127.0.0.1:8000/api/inventory/orders/${orderId}/approve/`, {}, getAuthHeaders());
    return res.data;
};

export const deliverOrder = async (orderId, itemsData) => {
    const res = await axios.post(`http://127.0.0.1:8000/api/inventory/orders/${orderId}/deliver/`, { items: itemsData }, getAuthHeaders());
    return res.data;
};

export const rejectOrder = async (orderId) => {
    const res = await axios.post(`http://127.0.0.1:8000/api/inventory/orders/${orderId}/reject/`, {}, getAuthHeaders());
    return res.data;
};
