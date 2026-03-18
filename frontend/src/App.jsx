import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import GestionEmpleados from "./pages/GestionEmpleados";
import AutoLogout from "./components/AutoLogout";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Inventario from "./pages/Inventario";
import Pedidos from "./pages/Pedidos";
import GestionSedes from "./pages/GestionSedes";
import PuntoDeVenta from "./pages/PuntoDeVenta";
import HistorialVentas from "./pages/HistorialVentas";
import GestionProveedores from "./pages/GestionProveedores";

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
        <Route path="/inventory" element={<Inventario />} />
        <Route path="/orders" element={<Pedidos />} />
        <Route path="/sedes" element={<GestionSedes />} />
        <Route path="/proveedores" element={<GestionProveedores />} />
        <Route path="/pos" element={<PuntoDeVenta />} />
        <Route path="/ventas" element={<HistorialVentas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;