import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      
      {/* Barra lateral */}
      <Sidebar />

      {/* Contenido */}
      <div className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 border-b pb-4">
          Dashboard
        </h2>
      </div>

    </div>
  );
}