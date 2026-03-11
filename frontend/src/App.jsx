import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import GestionEmpleados from "./pages/GestionEmpleados";
import AutoLogout from "./components/AutoLogout";
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"

function App() {
  return (
    <BrowserRouter>
      <AutoLogout />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/empleados" element={<GestionEmpleados />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;