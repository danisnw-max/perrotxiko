import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../services/api';

const QuioscoTab = ({ employees, workSchedules, showToast }) => {
  const [step, setStep] = useState(1);
  const [selectedOrigenId, setSelectedOrigenId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  
  const [myShifts, setMyShifts] = useState([]);
  
  // Available shifts for selected employee in the future
  useEffect(() => {
    if (selectedOrigenId) {
      const today = new Date().toISOString().split('T')[0];
      const shifts = workSchedules.filter(s => 
        s.empleado_id === selectedOrigenId && 
        s.fecha >= today && 
        !['Vacaciones', 'Libre Disposición', 'Baja', 'Permiso'].includes(s.turno)
      ).sort((a, b) => a.fecha.localeCompare(b.fecha));
      setMyShifts(shifts);
    } else {
      setMyShifts([]);
    }
    setSelectedShiftId('');
  }, [selectedOrigenId, workSchedules]);

  const handleSubmit = async () => {
    if (!selectedOrigenId || !selectedShiftId || !selectedDestinoId) {
      showToast("Faltan datos por seleccionar", "error");
      return;
    }
    
    try {
      await api.post('/cambios-turno/', {
        empleado_origen_id: selectedOrigenId,
        empleado_destino_id: selectedDestinoId,
        turno_origen_id: parseInt(selectedShiftId),
        turno_destino_id: null,
        notas: "Solicitado desde el Quiosco"
      });
      
      showToast("Solicitud enviada al encargado correctamente", "success");
      setStep(1);
      setSelectedOrigenId('');
      setSelectedShiftId('');
      setSelectedDestinoId('');
    } catch (err) {
      showToast("Error al enviar la solicitud", "error");
    }
  };

  const activeEmployees = employees.filter(e => e.estado === 'Activo');

  return (
    <div className="max-w-4xl mx-auto space-y-8 flex-1 flex flex-col text-left py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-slate-100 tracking-tight flex items-center justify-center gap-4">
          <ArrowRightLeft size={36} className="text-indigo-400" />
          Quiosco de Empleados
        </h1>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-3">Portal de Autogestión - Solicitar Cambios de Turno</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
        
        {/* Progress bar */}
        <div className="flex gap-2 mb-10">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>
          <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <h2 className="text-2xl font-black text-slate-100">1. ¿Quién eres?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activeEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => { setSelectedOrigenId(emp.id); setStep(2); }}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-indigo-950/30 transition-all cursor-pointer text-left group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-indigo-300">{emp.nombre}</div>
                  <div className="text-xs text-slate-500 mt-1">{emp.puesto}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => setStep(1)} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-white flex items-center gap-1">
              ? Volver
            </button>
            <h2 className="text-2xl font-black text-slate-100">2. ¿Qué turno quieres ceder?</h2>
            
            {myShifts.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400">
                No tienes turnos asignados a partir de hoy.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                {myShifts.map(shift => {
                  const dayName = new Date(shift.fecha).toLocaleDateString('es-ES', { weekday: 'long' });
                  const dateNum = new Date(shift.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                  return (
                    <button
                      key={shift.id}
                      onClick={() => { setSelectedShiftId(shift.id); setStep(3); }}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-amber-500/50 hover:bg-amber-950/30 transition-all cursor-pointer text-left group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-black text-amber-400 uppercase text-xs">{dayName} {dateNum}</div>
                          <div className="font-bold text-slate-200 mt-1">{shift.turno}</div>
                        </div>
                        <div className="font-mono text-sm bg-slate-900 px-2 py-1 rounded text-slate-400 font-bold border border-slate-800 group-hover:border-amber-900/50">
                          {shift.hora_inicio} - {shift.hora_fin}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => setStep(2)} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-white flex items-center gap-1">
              ? Volver
            </button>
            <h2 className="text-2xl font-black text-slate-100">3. ¿A quién le cedes el turno?</h2>
            <p className="text-sm text-slate-400">Asegúrate de haber hablado con esta persona antes.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {activeEmployees.filter(e => e.id !== selectedOrigenId).map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedDestinoId(emp.id)}
                  className={`p-4 border rounded-2xl transition-all cursor-pointer text-left ${selectedDestinoId === emp.id ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-950 border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900'}`}
                >
                  <div className={`font-bold ${selectedDestinoId === emp.id ? 'text-emerald-300' : 'text-slate-200'}`}>{emp.nombre}</div>
                  <div className="text-xs text-slate-500 mt-1">{emp.puesto}</div>
                </button>
              ))}
            </div>

            <button 
              disabled={!selectedDestinoId}
              onClick={handleSubmit}
              className="w-full py-5 bg-indigo-650 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center transition-all cursor-pointer"
            >
              Enviar Solicitud a Gerencia
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default QuioscoTab;
