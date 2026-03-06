import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import Dashboard from "./pages/Dashboard";
import AutoLogout from "./components/AutoLogout";

function App() {
  return (
    <BrowserRouter>
      <AutoLogout />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;