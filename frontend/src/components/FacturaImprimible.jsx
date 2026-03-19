import React, { forwardRef } from 'react';
import Logo from './Logo';

const FacturaImprimible = forwardRef(({ saleData, user }, ref) => {
  if (!saleData) return null;

  return (
    <div ref={ref} className="bg-white p-8 w-full max-w-md mx-auto text-slate-800 text-sm font-mono shadow-xl rounded-lg">
      
      {/* Cabecera / Logo */}
      <div className="flex flex-col items-center border-b border-dashed border-slate-300 pb-4 mb-4">
        <div className="scale-150 mb-2">
           <Logo />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-widest mt-2 text-center">StockVision</h2>
        <p className="text-xs text-center text-slate-500 uppercase mt-1 tracking-wider">Gestión Inteligente y Ventas</p>
        <p className="text-xs text-center mt-3 font-semibold">TICKET DE VENTA</p>
        <p className="text-xs uppercase font-bold text-slate-500 mt-1">Sede: {saleData.branch_name}</p>
      </div>

      {/* Datos del Ticket */}
      <div className="mb-4 pb-4 border-b border-dashed border-slate-300 text-xs space-y-1">
        <p><strong>FECHA:</strong> {new Date().toLocaleString()}</p>
        <p><strong>Nº ORDEN:</strong> {saleData.id || "Pendiente de Reg."}</p>
        <p><strong>LE ATIENDE:</strong> {user.first_name} {user.last_name}</p>
        {saleData.client_name && (
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
             <p><strong>CLIENTE:</strong> {saleData.client_name}</p>
             <p><strong>DOC/NIT:</strong> {saleData.client_document}</p>
          </div>
        )}
      </div>

      {/* Detalle de Productos */}
      <div className="mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="text-left py-1">CANT</th>
              <th className="text-left py-1">DESCRIPCIÓN</th>
              <th className="text-right py-1">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            {saleData.items.map((item, index) => (
              <tr key={index}>
                <td className="py-2.5 align-top font-bold">{item.quantity}</td>
                <td className="py-2.5 pr-2">
                  <span className="block font-bold">{item.name}</span>
                  <span className="text-[10px] text-slate-500">{item.sku}</span>
                  <br />
                  <span className="text-[10px] text-slate-500">
                     {item.quantity} x {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.price)}
                  </span>
                </td>
                <td className="py-2.5 align-top text-right font-bold">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="border-t border-dashed border-slate-300 pt-4 mb-6">
         <div className="flex justify-between items-center text-lg font-black uppercase tracking-wider">
           <span>Total M.N</span>
           <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(saleData.total)}</span>
         </div>
         <p className="text-[10px] text-slate-400 text-right mt-1">IVA INCLUIDO EN PRODUCTOS APLICABLES</p>
      </div>

      {/* Políticas / Pie de Página */}
      <div className="text-center text-[10px] space-y-2 text-slate-600">
         <p className="font-bold">✨ ¡GRACIAS POR SU COMPRA! ✨</p>
         <p className="px-4">Estimado cliente, las devoluciones se aceptarán únicamente dentro de los primeros 15 días posteriores a su compra presentando este recibo.</p>
         <p className="text-[9px] uppercase tracking-widest text-slate-400 mt-4 border-t border-slate-200 pt-4">StockVision POS System v1</p>
      </div>

    </div>
  );
});

export default FacturaImprimible;
