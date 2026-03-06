import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import Logo from "../components/Logo";

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {

      const response = await login(username, password);

      localStorage.setItem("token", response.access);
      localStorage.setItem("user", JSON.stringify(response.user));

      navigate("/inicio");

    } catch (error) {

      console.error("Login failed:", error);
      alert("Credenciales incorrectas");

    } finally {

      setLoading(false);

    }
  };

  return (

    <div className="flex items-center justify-center min-h-screen 
    bg-gradient-to-br from-white via-blue-50 to-green-50">

      <div className="bg-white p-10 rounded-2xl shadow-xl w-96 border border-gray-100">

        {/* Titulo */}
        <h2 className="text-3xl font-bold text-center text-gray-800">
          StockVision
        </h2>

        {/* Subtitulo */}
        <p className="text-center text-gray-500 text-sm mt-1 mb-3">
          Sistema de gestión de inventario
        </p>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="scale-150">
            <Logo />
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
            type="text"
            placeholder="Usuario"
            className="border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-green-500 
            text-white p-3 rounded-lg font-semibold 
            hover:scale-105 transition-transform duration-200
            flex items-center justify-center gap-2"
          >

            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Ingresando...
              </>
            ) : (
              "Ingresar"
            )}

          </button>

        </form>

        {/* Olvidaste contraseña */}
        <p className="text-sm text-center mt-4 text-gray-500 hover:text-blue-500 cursor-pointer">
          ¿Olvidaste tu contraseña?
        </p>

      </div>

    </div>
  );
}