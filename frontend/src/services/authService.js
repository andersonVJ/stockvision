import axios from "axios";

export const login = async (username, password) => {

  try {

    const response = await axios.post(
      "http://127.0.0.1:8000/api/token/",
      {
        username,
        password
      }
    );

    return response.data;

  } catch (error) {

    // reenviamos el error original de axios
    throw error;

  }

};