import React from 'react';
import { Filter, Calendar, MapPin, Tag, Download } from 'lucide-react';

const FiltersBar = ({ filters, setFilters, onExport, branches = [], categories = [] }) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4 mb-8">
      <div className="flex items-center text-gray-500 mr-2">
        <Filter size={20} className="mr-2" />
        <span className="font-bold text-sm uppercase tracking-wider">Filtros</span>
      </div>

      <div className="flex-1 flex flex-wrap gap-4">
        {/* Sede Selector */}
        <div className="relative flex-1 min-w-[200px]">
          <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            value={filters.branch}
            onChange={(e) => setFilters({...filters, branch: e.target.value})}
          >
            <option value="">Todas las Sedes</option>
            {Array.isArray(branches) && branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>

        {/* Categoria Selector */}
        <div className="relative flex-1 min-w-[200px]">
          <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">Todas las Categorias</option>
            {Array.isArray(categories) && categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="relative flex-[2] min-w-[300px] flex gap-2">
          <div className="relative flex-1">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="date" 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div className="relative flex-1">
            <input 
              type="date" 
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.endDate || ''}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onExport('excel')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Excel
        </button>
        <button 
          onClick={() => onExport('csv')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 transition-colors"
        >
          <Download size={16} />
          CSV
        </button>
      </div>
    </div>
  );
};

export default FiltersBar;
