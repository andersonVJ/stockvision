export default function Welcome() {

  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">

      <div className="bg-white p-10 rounded-lg shadow-md text-center">

        <h1 className="text-3xl font-bold mb-4">
          Bienvenido a StockVision
        </h1>

        <p className="text-lg">
          Usuario: <span className="font-semibold">{user?.username}</span>
        </p>

        <p className="text-lg">
          Rol: <span className="font-semibold">{user?.role}</span>
        </p>

      </div>

    </div>
  );
}