import { useState } from "react";
import axios from "axios";
import Logo from "../components/Logo";

export default function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {

      await axios.post(
        "http://127.0.0.1:8000/api/companies/password-reset/",
        { email }
      );

      setMessage("Revisa tu correo para recuperar tu contraseña");

    } catch {

      setMessage("No existe una cuenta con ese correo");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="relative flex items-center justify-center min-h-screen bg-white overflow-hidden">

      {/* ANIMACIÓN FLOTANTE DE FONDO */}
      <div className="absolute w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40 top-10 left-10 animate-pulse"></div>

      <div className="absolute w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-40 bottom-10 right-10 animate-pulse"></div>

      {/* CARD */}
      <div className="relative bg-white p-10 rounded-2xl shadow-xl w-96 border border-gray-100 animate-fade-in">

        {/* TITULO */}
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Recuperar Contraseña
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

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
            type="email"
            placeholder="Correo electrónico"
            required
            className="border border-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-3 rounded-lg font-semibold hover:scale-105 transition flex items-center justify-center gap-2"
          >

            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enviando...
              </>
            ) : (
              "Enviar enlace"
            )}

          </button>

        </form>

        {/* MENSAJE */}
        {message && (

          <div className="mt-4 text-center text-sm text-gray-600 animate-fade-in">
            {message}
          </div>

        )}

      </div>

    </div>

  );

}