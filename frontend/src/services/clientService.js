import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/companies/clients/";

const getAuthHeaders = () => {
    const tokens = JSON.parse(localStorage.getItem("tokens") || "{}");
    return {
        headers: {
            "Authorization": `Bearer ${tokens.access}`
        }
    };
};

export const getClients = async (search = "") => {
    const url = search ? `${API_URL}?search=${encodeURIComponent(search)}` : API_URL;
    const res = await axios.get(url, getAuthHeaders());
    return res.data;
};

export const getClientByDocument = async (idDocument) => {
    const res = await axios.get(`${API_URL}?id_document=${encodeURIComponent(idDocument)}`, getAuthHeaders());
    return res.data;
};

export const createClient = async (data) => {
    const res = await axios.post(API_URL, data, getAuthHeaders());
    return res.data;
};

export const updateClient = async (id, data) => {
    const res = await axios.put(`${API_URL}${id}/`, data, getAuthHeaders());
    return res.data;
};

export const deleteClient = async (id) => {
    const res = await axios.delete(`${API_URL}${id}/`, getAuthHeaders());
    return res.data;
};
