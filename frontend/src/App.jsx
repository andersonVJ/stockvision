import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import GestionEmpleados from "./pages/GestionEmpleados";
import AutoLogout from "./components/AutoLogout";

function App() {
  return (
    <BrowserRouter>
      <AutoLogout />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/empleados" element={<GestionEmpleados />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;