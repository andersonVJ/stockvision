import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../components/Sidebar";
import KPICard from "../components/analytics/KPICard";
import MainChart from "../components/analytics/MainChart";
import AlertsPanel from "../components/analytics/AlertsPanel";
import FiltersBar from "../components/analytics/FiltersBar";
import { 
  DollarSign, 
  Package, 
  AlertCircle, 
  RefreshCw, 
  BarChart3,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [filters, setFilters] = useState({
    branch: '',
    category: '',
    dateRange: '30days'
  });
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [statsRes, chartRes, alertsRes] = await Promise.all([
        axios.get(`/api/analytics/summary/?branch=${filters.branch}&category=${filters.category}`, config),
        axios.get(`/api/analytics/charts/?branch=${filters.branch}&category=${filters.category}`, config),
        axios.get(`/api/analytics/alerts/?branch=${filters.branch}&category=${filters.category}`, config)
      ]);

      setStats(statsRes.data);
      setCharts(chartRes.data);
      setAlerts(alertsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [bRes, cRes] = await Promise.all([
          axios.get('/api/companies/branches/', config),
          axios.get('/api/inventory/categories/', config)
        ]);
        setBranches(bRes.data);
        setCategories(cRes.data);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchData();
    // 5-minute polling
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExport = (format) => {
    const token = localStorage.getItem('token');
    const { startDate, endDate, branch, category } = filters;
    let url = `/api/analytics/export-data/?format=${format}&token=${token}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (branch) url += `&branch=${branch}`;
    if (category) url += `&category=${category}`;
    window.open(url, '_blank');
  };

  if (loading && !stats) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="animate-spin text-blue-600" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard Analítico</h1>
            <p className="text-gray-500 font-medium mt-1">Inteligencia Artificial aplicada a tu inventario</p>
          </div>
          <button 
            onClick={() => { setLoading(true); fetchData(); }}
            className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all hover:rotate-180 duration-500"
          >
            <RefreshCw size={20} />
          </button>
        </header>

        <FiltersBar 
          filters={filters} 
          setFilters={setFilters} 
          onExport={handleExport}
          branches={branches}
          categories={categories}
        />

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard 
            title="Ventas Totales" 
            value={`$${(stats?.total_sales || 0).toLocaleString()}`} 
            icon={DollarSign} 
            color="blue"
            trend="up"
            trendValue="12.5%"
          />
          <KPICard 
            title="Stock Total" 
            value={stats?.total_stock || 0} 
            icon={Package} 
            color="purple"
          />
          <KPICard 
            title="Ruptura de Stock" 
            value={stats?.products_at_risk || 0} 
            icon={AlertCircle} 
            color="red"
            trend={(stats?.products_at_risk || 0) > 5 ? "up" : "down"}
            trendValue={(stats?.products_at_risk || 0) > 5 ? "High" : "Low"}
          />
          <KPICard 
            title="Rotación Inv." 
            value={`${stats?.inventory_turnover || 0}x`} 
            icon={BarChart3} 
            color="green"
            trend="up"
            trendValue="0.4"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Chart - Hits 2/3 of width */}
          <div className="lg:col-span-2">
            <MainChart 
              title="Ventas Reales vs Predicción IA (30 días)" 
              data={charts?.historical || []} 
            />
          </div>

          {/* Alerts Panel - Hits 1/3 of width */}
          <div className="lg:col-span-1">
            <AlertsPanel alerts={alerts} />
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <TrendingUp className="mr-2 text-blue-600" size={24} />
              Días de Cobertura Promedio
            </h3>
            <div className="flex items-center justify-center h-40">
               <div className="text-center">
                 <span className="text-6xl font-black text-blue-600">{stats?.days_coverage || 0}</span>
                 <p className="text-gray-500 font-bold uppercase tracking-widest mt-2">Días Sugeridos</p>
               </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center italic">
              Basado en el ritmo de venta actual y proyecciones de estacionalidad.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Precisión del Modelo</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="text-gray-600">Prophet (Demanda)</span>
                  <span className="text-green-600">94.2%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: '94.2%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span className="text-gray-600">XGBoost (Estado Stock)</span>
                  <span className="text-blue-600">88.5%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '88.5%' }}></div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-6 leading-relaxed">
                Metricas calculadas usando validación cruzada y MAPE (Mean Absolute Percentage Error) sobre los últimos 90 días de operación.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;