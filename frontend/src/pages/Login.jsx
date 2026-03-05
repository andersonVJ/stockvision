import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await login(username, password);

      localStorage.setItem("token", response.access);
      localStorage.setItem("user", JSON.stringify(response.user));

      navigate("/welcome");

    } catch (error) {
      alert("Credenciales incorrectas");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">

      <div className="bg-white p-8 rounded-lg shadow-md w-80">

        <h2 className="text-2xl font-bold text-center mb-6">
          StockVision
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
            type="text"
            placeholder="Usuario"
            className="border p-2 rounded"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="border p-2 rounded"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Ingresar
          </button>

        </form>

      </div>

    </div>
  );
}