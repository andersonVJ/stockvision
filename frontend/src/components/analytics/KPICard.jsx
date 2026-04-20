import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, trend, trendValue, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div className={`p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors[color]} border`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
};

export default KPICard;
