import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import Logo from "../components/Logo";

export default function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      const response = await login(username, password);

      // Protección extra
      if (!response || !response.access) {
        setError("Usuario o contraseña incorrectos");
        return;
      }

      localStorage.setItem("token", response.access);
      localStorage.setItem("tokens", JSON.stringify(response));

      if (response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
      }

      navigate("/inicio");

    } catch (err) {

      console.error("Login error:", err);

      if (err?.response?.status === 401 || err?.response?.status === 400) {
        setError("Usuario o contraseña incorrectos");
      } else if (err?.response?.status >= 500) {
        setError("Error del servidor");
      } else {
        setError("No se pudo conectar con el servidor");
      }

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-blue-50 to-green-50 overflow-hidden">

      {/* BURBUJAS FLOTANTES */}
      <div className="absolute w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40 top-10 left-10 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-40 bottom-10 right-10 animate-pulse"></div>

      <div className="relative bg-white p-10 rounded-2xl shadow-xl w-96 border border-gray-100 animate-fade-in">

        {/* TITULO */}
        <h2 className="text-3xl font-bold text-center text-gray-800">
          StockVision
        </h2>

        {/* SUBTITULO */}
        <p className="text-center text-gray-500 text-sm mt-1 mb-3">
          Sistema de gestión de inventarios
        </p>

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <div className="scale-150">
            <Logo />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
            type="text"
            placeholder="Usuario"
            className="border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-3 rounded-lg font-semibold hover:scale-105 transition flex items-center justify-center"
          >

            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Ingresar"
            )}

          </button>

        </form>

        {/* RECUPERAR CONTRASEÑA */}
        <div className="text-center mt-4">

          <Link
            to="/forgot-password"
            className="text-sm text-gray-500 hover:text-blue-500 transition"
          >
            ¿Olvidaste tu contraseña?
          </Link>

        </div>

      </div>

    </div>

  );

}