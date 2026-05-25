import axios from "axios";

export const login = async (username, password) => {

  try {

    const response = await axios.post(
      "/api/token/",
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