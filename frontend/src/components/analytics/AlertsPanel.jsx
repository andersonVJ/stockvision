import React from 'react';
import { AlertTriangle, CheckCircle, Info, ArrowRight } from 'lucide-react';

const getStatusConfig = (code) => {
  switch (code) {
    case 'CRITICAL':
      return { 
        icon: AlertTriangle, 
        color: 'text-red-600', 
        bg: 'bg-red-50', 
        border: 'border-red-100',
        label: 'Riesgo de Ruptura' 
      };
    case 'LOW_ROTATION':
      return { 
        icon: Info, 
        color: 'text-orange-600', 
        bg: 'bg-orange-50', 
        border: 'border-orange-100',
        label: 'Sobre-stock / Baja Rotación' 
      };
    default:
      return { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bg: 'bg-green-50', 
        border: 'border-green-100',
        label: 'Estable' 
      };
  }
};

const AlertsPanel = ({ alerts = [] }) => {

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800">Alertas Inteligentes</h3>
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase">
          AI Analysis
        </span>
      </div>
      <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
        {(!Array.isArray(alerts) || alerts.length === 0) ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="mx-auto mb-3 text-green-400" size={40} />
            <p>No hay alertas críticas en este momento.</p>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const config = getStatusConfig(alert?.xgboost_classification?.state_code);
            const Icon = config.icon;
            return (
              <div key={idx} className={`p-5 flex gap-4 hover:bg-gray-50 transition-colors`}>
                <div className={`p-3 rounded-xl ${config.bg} ${config.color} h-fit`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-900">{alert?.product_name || 'Producto Desconocido'}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${config.bg} ${config.color} border ${config.border}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Stock actual: <span className="font-semibold">{alert?.current_stock ?? 0}</span> units. 
                    Demanda proyectada: <span className="font-semibold">{alert?.prophet_forecast?.next_30_days_demand ?? 0}</span>.
                  </p>
                  <div className="space-y-2">
                    {(alert?.xgboost_classification?.recommendations || []).map((rec, rIdx) => (
                      <div key={rIdx} className="flex items-center text-sm text-blue-700 bg-blue-50/50 p-2 rounded-lg">
                        <ArrowRight size={14} className="mr-2 flex-shrink-0" />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
