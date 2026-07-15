import React, { useState, useEffect } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { api } from '../../services/api';

export default function FichajePinPadModal({ 
  isOpen, 
  onClose, 
  employees, 
  showToast, 
  onSuccess 
}) {
  const [presenceEmployeeId, setPresenceEmployeeId] = useState('');
  const [presencePin, setPresencePin] = useState('');
  const [presenceEmployeeState, setPresenceEmployeeState] = useState(null);
  const [isFetchingPresenceState, setIsFetchingPresenceState] = useState(false);

  const fetchPresenceState = async (empId) => {
    setIsFetchingPresenceState(true);
    try {
      const data = await api.get(`/presencia/estado/${empId}`);
      setPresenceEmployeeState(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingPresenceState(false);
    }
  };

  useEffect(() => {
    if (presenceEmployeeId) {
      fetchPresenceState(presenceEmployeeId);
    } else {
      setPresenceEmployeeState(null);
    }
    setPresencePin('');
  }, [presenceEmployeeId]);

  const handlePresenceAction = async (tipo) => {
    if (!presenceEmployeeId || presencePin.length !== 4) return;
    try {
      const data = await api.post('/presencia/fichar', {
        empleado_id: presenceEmployeeId,
        pin: presencePin,
        tipo: tipo,
        dispositivo: 'TPV'
      });
      showToast(`Fichaje de ${tipo} registrado con éxito a las ${data.hora}`, "success");
      setPresencePin('');
      setPresenceEmployeeId('');
      onSuccess?.();
      onClose();
    } catch (e) {
      console.error(e);
      if (e.status === 403) {
        showToast("PIN Incorrecto", "error");
        setPresencePin('');
      } else {
        showToast(e.message || "Error al registrar fichaje", "error");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="text-left">
            <h3 className="text-xl font-black text-slate-100 tracking-tight flex items-center">
              <CalendarClock className="mr-3 text-indigo-500 animate-pulse" size={24}/>
              Fichar Presencia
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control diario de jornada - Registro obligatorio</p>
          </div>
          <button 
            type="button" 
            onClick={() => { 
              onClose(); 
              setPresenceEmployeeId(''); 
              setPresencePin(''); 
            }} 
            className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 rounded-xl transition-all cursor-pointer"
          >
            <X size={18}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Employee Selection */}
          <div className="text-left">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Selecciona tu Nombre</label>
            <select 
              value={presenceEmployeeId} 
              onChange={(e) => setPresenceEmployeeId(e.target.value)}
              className="w-full border border-slate-700 p-3.5 rounded-2xl bg-slate-850 font-bold text-slate-200 outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="" className="bg-slate-900 text-slate-200">-- Elige empleado --</option>
              {employees.filter(e => e.estado === 'Activo').map(e => (
                <option key={e.id} value={e.id} className="bg-slate-900 text-slate-200">{e.nombre} ({e.puesto})</option>
              ))}
            </select>
          </div>

          {presenceEmployeeId && (
            <>
              {/* Status Indicator */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex justify-between items-center text-left">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado Actual</p>
                  <h4 className="text-lg font-black text-slate-100 mt-1">
                    {isFetchingPresenceState ? 'Cargando...' : presenceEmployeeState?.estado || 'Fuera'}
                  </h4>
                  {presenceEmployeeState?.ultimo_fichaje && (
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 font-mono">
                      Último evento: {presenceEmployeeState.ultimo_fichaje.tipo} a las {presenceEmployeeState.ultimo_fichaje.hora}
                    </p>
                  )}
                </div>
                <span className={`w-3.5 h-3.5 rounded-full ${
                  presenceEmployeeState?.estado === 'Dentro' ? 'bg-emerald-500 animate-pulse' : 
                  presenceEmployeeState?.estado === 'En Pausa' ? 'bg-amber-500 animate-pulse' : 'bg-slate-600'
                }`}></span>
              </div>

              {/* PIN Display */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Introduce tu PIN (4 dígitos)</p>
                <div className="flex justify-center gap-4 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div 
                      key={idx} 
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        presencePin.length > idx ? 'bg-indigo-500 border-indigo-500 scale-110 shadow-md shadow-indigo-500/20' : 'border-slate-700'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button 
                    key={num} 
                    type="button"
                    onClick={() => presencePin.length < 4 && setPresencePin(presencePin + num)}
                    className="h-12 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-200 active:scale-95 rounded-xl font-black text-lg transition-all shadow-sm cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  type="button"
                  onClick={() => setPresencePin('')}
                  className="h-12 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 active:scale-95 rounded-xl font-black text-sm transition-all border border-rose-900/50 cursor-pointer"
                >
                  C
                </button>
                <button 
                  type="button"
                  onClick={() => presencePin.length < 4 && setPresencePin(presencePin + '0')}
                  className="h-12 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-200 active:scale-95 rounded-xl font-black text-lg transition-all shadow-sm cursor-pointer"
                >
                  0
                </button>
                <button 
                  type="button"
                  onClick={() => setPresencePin(presencePin.slice(0, -1))}
                  className="h-12 bg-slate-800 border border-slate-700 hover:bg-slate-700 active:scale-95 text-slate-400 rounded-xl font-black text-lg transition-all flex items-center justify-center cursor-pointer"
                >
                  ←
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {presencePin.length === 4 ? (
                  <div className="flex flex-col gap-2">
                    {(!presenceEmployeeState || presenceEmployeeState.estado === 'Fuera') && (
                      <button 
                        type="button" 
                        onClick={() => handlePresenceAction('Entrada')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer"
                      >
                        🚪 Fichar Entrada
                      </button>
                    )}
                    {presenceEmployeeState?.estado === 'Dentro' && (
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => handlePresenceAction('Inicio Pausa')}
                          className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-md flex items-center justify-center transition-all cursor-pointer"
                        >
                          ☕ Iniciar Pausa
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handlePresenceAction('Salida')}
                          className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-md flex items-center justify-center transition-all cursor-pointer"
                        >
                          🏁 Fichar Salida
                        </button>
                      </div>
                    )}
                    {presenceEmployeeState?.estado === 'En Pausa' && (
                      <button 
                        type="button" 
                        onClick={() => handlePresenceAction('Fin Pausa')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer"
                      >
                        🚪 Volver de Pausa
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center py-2">
                    Escribe tu PIN de 4 dígitos para desbloquear acciones
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
