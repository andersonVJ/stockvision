import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BarChartSedes = ({ data, title }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-6">{title}</h3>
      <div className="h-80 w-full">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
              <XAxis type="number" tick={{fill: '#9CA3AF', fontSize: 12}} axisLine={false} tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{fill: '#4B5563', fontSize: 13, fontWeight: 500}} 
                axisLine={false} 
                tickLine={false} 
                width={100} 
              />
              <Tooltip 
                cursor={{fill: '#F9FAFB'}} 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas Totales']}
              />
              <Bar dataKey="ventas" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No hay datos de ventas por sede
          </div>
        )}
      </div>
    </div>
  );
};

export default BarChartSedes;
