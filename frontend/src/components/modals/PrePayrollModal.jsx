import React, { useState, useEffect } from 'react';
import { FileText, Download, X } from 'lucide-react';
import { api } from '../../services/api';

export default function PrePayrollModal({ 
  isOpen, 
  onClose, 
  showToast 
}) {
  const [prePayrollMonth, setPrePayrollMonth] = useState(new Date().getMonth() + 1);
  const [prePayrollYear, setPrePayrollYear] = useState(new Date().getFullYear());
  const [prePayrollData, setPrePayrollData] = useState([]);
  const [isPrePayrollLoading, setIsPrePayrollLoading] = useState(false);

  const fetchPrePayrollData = async (month, year) => {
    setIsPrePayrollLoading(true);
    try {
      const data = await api.get(`/presencia/prenomina?mes=${month}&anio=${year}`);
      setPrePayrollData(data);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al cargar pre-nóminas", "error");
    } finally {
      setIsPrePayrollLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrePayrollData(prePayrollMonth, prePayrollYear);
    }
  }, [isOpen, prePayrollMonth, prePayrollYear]);

  const exportPrePayrollToCSV = () => {
    if (!prePayrollData || prePayrollData.length === 0) {
      showToast("No hay datos para exportar", "error");
      return;
    }
    
    const headers = [
      "ID Empleado",
      "Nombre Empleado",
      "NIF",
      "NASS",
      "IBAN",
      "Salario Base (€)",
      "Horas Contrato (Mes)",
      "Horas Planificadas",
      "Horas Trabajadas (Reales)",
      "Horas Extra",
      "Dias Trabajados",
      "Dias de Baja",
      "Dias de Permiso",
      "Dias de Vacaciones",
      "Dias de Falta"
    ];
    
    const rows = prePayrollData.map(emp => [
      emp.empleado_id,
      emp.empleado_nombre,
      emp.nif || "",
      emp.nass || "",
      emp.iban || "",
      emp.salario_base.toFixed(2),
      emp.horas_contrato_mes.toFixed(2),
      emp.horas_planificadas.toFixed(2),
      emp.horas_trabajadas.toFixed(2),
      emp.horas_extra.toFixed(2),
      emp.dias_trabajados,
      emp.dias_baja,
      emp.dias_permiso,
      emp.dias_vacaciones,
      emp.dias_falta
    ]);
    
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(val => {
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""').replace(/;/g, ',')}"`;
        }
        return val;
      }).join(";"))
    ].join("\n");
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const filename = `PreNomina_AterpeBar_${prePayrollYear}_${prePayrollMonth.toString().padStart(2, '0')}.csv`;
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Informe de pre-nóminas exportado con éxito", "success");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-7xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh] text-left text-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/50 gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-100 tracking-tight flex items-center">
              <FileText className="mr-3 text-emerald-500" size={28}/> 
              Resumen Mensual de Pre-Nóminas
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Resumen de horas reales, extras, bajas e identificaciones para tu gestor laboral
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={exportPrePayrollToCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md flex items-center transition-all cursor-pointer disabled:opacity-40"
              disabled={isPrePayrollLoading || prePayrollData.length === 0}
            >
              <Download size={14} className="mr-2"/> Exportar CSV Gestoría
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="bg-slate-950/40 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-355">
          <div className="flex items-center gap-2">
            <span>Mes:</span>
            <select 
              value={prePayrollMonth}
              onChange={(e) => setPrePayrollMonth(parseInt(e.target.value))}
              className="border border-slate-700 p-2 rounded-xl bg-slate-800 text-slate-200 font-bold outline-none cursor-pointer"
            >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((mName, idx) => (
                <option key={mName} value={idx + 1}>{mName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span>Año:</span>
            <select 
              value={prePayrollYear}
              onChange={(e) => setPrePayrollYear(parseInt(e.target.value))}
              className="border border-slate-700 p-2 rounded-xl bg-slate-800 text-slate-200 font-bold outline-none cursor-pointer"
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {isPrePayrollLoading && (
            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider animate-pulse ml-auto">Actualizando datos...</span>
          )}
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isPrePayrollLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generando informe consolidado...</p>
            </div>
          ) : prePayrollData.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest border-2 border-dashed border-slate-800 rounded-[28px] bg-slate-900/10">
              No se encontraron datos de personal para este periodo
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-[24px] bg-slate-950/20">
              <table className="min-w-full divide-y divide-slate-800 text-xs">
                <thead className="bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-4 text-left font-black text-slate-450 uppercase tracking-wider">Empleado</th>
                    <th className="px-5 py-4 text-left font-black text-slate-455 uppercase tracking-wider">NIF / NASS</th>
                    <th className="px-5 py-4 text-left font-black text-slate-455 uppercase tracking-wider">IBAN Transferencia</th>
                    <th className="px-5 py-4 text-right font-black text-slate-455 uppercase tracking-wider">S. Base</th>
                    <th className="px-5 py-4 text-right font-black text-slate-455 uppercase tracking-wider">H. Contrato</th>
                    <th className="px-5 py-4 text-right font-black text-slate-455 uppercase tracking-wider">H. Planif</th>
                    <th className="px-5 py-4 text-right font-black text-slate-455 uppercase tracking-wider">H. Reales</th>
                    <th className="px-5 py-4 text-right font-black text-slate-455 uppercase tracking-wider">H. Extra</th>
                    <th className="px-5 py-4 text-center font-black text-slate-455 uppercase tracking-wider">D. Trab.</th>
                    <th className="px-5 py-4 text-center font-black text-slate-455 uppercase tracking-wider">Bajas (IT)</th>
                    <th className="px-5 py-4 text-center font-black text-slate-455 uppercase tracking-wider">Permisos</th>
                    <th className="px-5 py-4 text-center font-black text-slate-455 uppercase tracking-wider">Vacaciones</th>
                    <th className="px-5 py-4 text-center font-black text-slate-455 uppercase tracking-wider">Faltas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                  {prePayrollData.map(emp => {
                    const isOver = emp.horas_trabajadas > emp.horas_planificadas;
                    return (
                      <tr key={emp.empleado_id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="px-5 py-4 font-black text-slate-200 text-left">
                          <div>{emp.empleado_nombre}</div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 font-mono">ID: {emp.empleado_id}</div>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-400 text-left">
                          <div>NIF: {emp.nif || '—'}</div>
                          <div className="text-[10px] text-slate-500">NASS: {emp.nass || '—'}</div>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-400 text-left font-mono">
                          {emp.iban ? emp.iban.replace(/(.{4})/g, '$1 ') : '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-300">{(emp.salario_base || 0).toFixed(2)}€</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-400">{emp.horas_contrato_mes.toFixed(1)}h</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-400">{emp.horas_planificadas.toFixed(1)}h</td>
                        <td className="px-5 py-4 text-right font-black text-indigo-400">{emp.horas_trabajadas.toFixed(1)}h</td>
                        <td className={`px-5 py-4 text-right font-black ${isOver ? 'text-rose-500' : 'text-slate-600'}`}>
                          {emp.horas_extra > 0 ? `+${emp.horas_extra.toFixed(1)}h` : '0.0h'}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-300">{emp.dias_trabajados}d</td>
                        <td className="px-5 py-4 text-center">
                          {emp.dias_baja > 0 ? (
                            <span className="px-2 py-1 bg-rose-950/40 text-rose-400 border border-rose-900/50 rounded-lg font-black text-[10px]">{emp.dias_baja}d</span>
                          ) : (
                            <span className="text-slate-600 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {emp.dias_permiso > 0 ? (
                            <span className="px-2 py-1 bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 rounded-lg font-black text-[10px]">{emp.dias_permiso}d</span>
                          ) : (
                            <span className="text-slate-600 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {emp.dias_vacaciones > 0 ? (
                            <span className="px-2 py-1 bg-blue-950/40 text-blue-400 border border-blue-900/50 rounded-lg font-black text-[10px]">{emp.dias_vacaciones}d</span>
                          ) : (
                            <span className="text-slate-600 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {emp.dias_falta > 0 ? (
                            <span className="px-2 py-1 bg-amber-950/40 text-amber-400 border border-amber-900/50 rounded-lg font-black text-[10px]">{emp.dias_falta}d</span>
                          ) : (
                            <span className="text-slate-600 font-bold">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {!isPrePayrollLoading && prePayrollData.length > 0 && (
          <div className="p-6 border-t border-slate-800 bg-slate-950/30 flex justify-between items-center text-xs font-black text-slate-500 uppercase tracking-wider">
            <div>Total Empleados: <span className="text-slate-350 font-bold">{prePayrollData.length}</span></div>
            <div className="flex gap-6">
              <div>Total Horas Reales: <span className="text-indigo-400 font-bold">{prePayrollData.reduce((acc, curr) => acc + curr.horas_trabajadas, 0).toFixed(1)}h</span></div>
              <div>Total Horas Extra: <span className="text-rose-400 font-bold">{prePayrollData.reduce((acc, curr) => acc + curr.horas_extra, 0).toFixed(1)}h</span></div>
              <div>Total Bajas IT: <span className="text-rose-500 font-bold">{prePayrollData.reduce((acc, curr) => acc + curr.dias_baja, 0)} días</span></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
