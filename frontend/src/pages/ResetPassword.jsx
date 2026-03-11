import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Logo from "../components/Logo";

export default function ResetPassword() {

  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [time, setTime] = useState(900); // 15 minutos

  useEffect(() => {

    const interval = setInterval(() => {

      setTime((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });

    }, 1000);

    return () => clearInterval(interval);

  }, []);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  const handleSubmit = async (e) => {

    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {

      await axios.post(
        "http://127.0.0.1:8000/api/companies/password-reset-confirm/",
        {
          token,
          password
        }
      );

      setMessage("Contraseña actualizada correctamente");

    } catch {

      setMessage("El enlace expiró o es inválido");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="relative flex items-center justify-center min-h-screen bg-white overflow-hidden">

      {/* BURBUJAS FLOTANTES */}
      <div className="absolute w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40 top-10 left-10 animate-pulse"></div>

      <div className="absolute w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-40 bottom-10 right-10 animate-pulse"></div>

      {/* CARD */}
      <div className="relative bg-white p-10 rounded-2xl shadow-xl w-96 border border-gray-100 animate-fade-in">

        <h2 className="text-3xl font-bold text-center text-gray-800">
          Nueva contraseña
        </h2>

        <p className="text-center text-gray-500 text-sm mt-1 mb-3">
          Sistema de gestión de inventarios
        </p>

        <div className="flex justify-center mb-6">
          <div className="scale-150">
            <Logo />
          </div>
        </div>

        {/* CONTADOR */}
        <div className="text-center text-yellow-600 text-sm mb-4">

          El enlace expira en

          <span className="font-bold ml-1">
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>

        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
            type="password"
            placeholder="Nueva contraseña"
            required
            className="border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-3 rounded-lg font-semibold hover:scale-105 transition flex items-center justify-center gap-2"
          >

            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              "Cambiar contraseña"
            )}

          </button>

        </form>

        {message && (

          <div className="mt-4 text-center text-sm text-gray-600 animate-fade-in">
            {message}
          </div>

        )}

      </div>

    </div>

  );
}