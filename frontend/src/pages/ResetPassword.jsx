import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from "../components/Logo";

export default function ResetPassword() {

  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [time, setTime] = useState(900);

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

  // REDIRECCIÓN AUTOMÁTICA
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

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

      setSuccess(true);

    } catch {

      setMessage("El enlace expiró o es inválido");

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
              Contraseña actualizada
            </h2>

            <p className="text-gray-500 text-sm">
              Tu contraseña fue cambiada correctamente.
              Serás redirigido al login en unos segundos.
            </p>

          </div>

        )}

      </div>

    </div>

  );
}