import { useState } from "react";
import axios from "axios";
import Logo from "../components/Logo";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {

    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {

      await axios.post(
        "http://127.0.0.1:8000/api/companies/password-reset/",
        { email }
      );

      setSuccess(true);

    } catch {

      setMessage("No existe una cuenta con ese correo");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="relative flex items-center justify-center min-h-screen bg-white overflow-hidden">

      {/* BOTÓN VOLVER */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center justify-center w-12 h-12 
        rounded-full backdrop-blur-md bg-white/60 border border-white/40 
        shadow-lg hover:scale-110 hover:bg-blue-100 transition duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      {/* FONDOS */}
      <div className="absolute w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-40 top-10 left-10 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-green-200 rounded-full blur-3xl opacity-40 bottom-10 right-10 animate-pulse"></div>

      {/* CARD */}
      <div className="relative bg-white p-10 rounded-2xl shadow-xl w-96 border border-gray-100">

        {!success ? (

          <>
            {/* TITULO */}
            <h2 className="text-3xl font-bold text-center text-gray-800">
              Recuperar Contraseña
            </h2>

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

            {message && (
              <div className="mt-4 text-center text-sm text-gray-600">
                {message}
              </div>
            )}

          </>

        ) : (

          /* PANTALLA DE ÉXITO */

          <div className="flex flex-col items-center text-center gap-4">

            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-green-100">

              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>

            </div>

            <h2 className="text-2xl font-bold text-gray-800">
              Correo enviado
            </h2>

            <p className="text-gray-500 text-sm">
              Te enviamos un enlace para restablecer tu contraseña.
              Revisa tu bandeja de entrada.
            </p>

            <button
              onClick={() => navigate("/")}
              className="mt-4 bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition"
            >
              Volver al login
            </button>

          </div>

        )}

      </div>

    </div>
  );
}