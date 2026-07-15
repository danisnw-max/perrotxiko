import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, X, Calendar } from 'lucide-react';
import { api } from '../../services/api';

export default function AuditoriaFichajesModal({
  isOpen,
  onClose,
  employees,
  showToast,
  onSuccess
}) {
  const [fichajes, setFichajes] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);

  // Form states for manual punch
  const [newEmpId, setNewEmpId] = useState('');
  const [newFecha, setNewFecha] = useState(new Date().toISOString().split('T')[0]);
  const [newHora, setNewHora] = useState('');
  const [newTipo, setNewTipo] = useState('Entrada');
  const [newNotas, setNewNotas] = useState('');

  const fetchFichajes = async () => {
    setIsLoading(true);
    try {
      let query = `?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      if (selectedEmpId) query += `&empleado_id=${selectedEmpId}`;
      const data = await api.get(`/presencia/fichajes${query}`);
      setFichajes(data);
    } catch (e) {
      console.error(e);
      showToast("Error al cargar fichajes", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFichajes();
    }
  }, [isOpen, selectedEmpId, fechaInicio, fechaFin]);

  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!newEmpId || !newFecha || !newHora || !newTipo) {
      showToast("Por favor rellene todos los campos", "error");
      return;
    }
    try {
      const payload = {
        empleado_id: newEmpId,
        fecha: newFecha,
        hora: newHora + ":00",
        tipo: newTipo,
        dispositivo: 'Manual',
        notas: newNotas || 'Ajuste manual de Administrador'
      };
      await api.post('/presencia/manual', payload);
      showToast("Fichaje manual creado correctamente", "success");
      setIsAdding(false);
      setNewNotas('');
      setNewHora('');
      fetchFichajes();
      onSuccess?.();
    } catch (e) {
      console.error(e);
      showToast("Error al guardar fichaje manual", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro de fichaje?")) return;
    try {
      await api.delete(`/presencia/${id}`);
      showToast("Registro eliminado con éxito", "success");
      fetchFichajes();
      onSuccess?.();
    } catch (e) {
      console.error(e);
      showToast("Error al eliminar registro", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] text-left text-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="text-xl font-black text-slate-100 tracking-tight flex items-center">
              <Clock className="mr-3 text-indigo-500" size={24}/>
              Auditoría y Corrección de Fichajes
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Supervisión del registro horario oficial - Modificación de horas reales</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 rounded-xl transition-all cursor-pointer"
          >
            <X size={18}/>
          </button>
        </div>

        {/* Filters bar */}
        <div className="bg-slate-950/40 p-4 border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <span>Empleado:</span>
            <select 
              value={selectedEmpId} 
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="border border-slate-700 p-2 rounded-xl bg-slate-800 text-slate-200 outline-none cursor-pointer"
            >
              <option value="">Todos los empleados</option>
              {employees.filter(e => e.estado === 'Activo').map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span>Desde:</span>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border border-slate-700 p-2 rounded-xl bg-slate-800 text-slate-200 outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span>Hasta:</span>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-slate-700 p-2 rounded-xl bg-slate-800 text-slate-200 outline-none font-mono"
            />
          </div>

          {!isAdding && (
            <button 
              onClick={() => {
                setNewEmpId(selectedEmpId || (employees.length > 0 ? employees[0].id : ''));
                setIsAdding(true);
              }}
              className="ml-auto py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all cursor-pointer"
            >
              <Plus size={14} className="mr-1.5"/> Fichaje Manual
            </button>
          )}
        </div>

        {/* Content area split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Side: Punch List grouped by day/employee */}
          <div className="w-full md:w-2/3 p-6 flex flex-col overflow-y-auto max-h-[45vh] md:max-h-[none]">
            <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wider mb-4">Punches Registrados</h4>
            
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {fichajes.map((fGroup, gIdx) => (
                  <div key={gIdx} className="p-4 bg-slate-850 rounded-2xl border border-slate-800 text-left">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
                      <div>
                        <h5 className="font-black text-slate-200 text-sm">{fGroup.empleado_nombre}</h5>
                        <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">{fGroup.fecha}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total: {fGroup.horas_trabajadas.toFixed(2)}h</span>
                        <p className="text-[8px] text-slate-500 font-bold mt-0.5">Punches: {fGroup.fichajes.length}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fGroup.fichajes.map(f => {
                        let tagColor = "bg-emerald-950/40 text-emerald-400 border-emerald-900/50";
                        if (f.tipo.includes("Salida")) tagColor = "bg-rose-950/40 text-rose-400 border-rose-900/50";
                        if (f.tipo.includes("Pausa")) tagColor = "bg-amber-950/40 text-amber-400 border-amber-900/50";
                        
                        return (
                          <div key={f.id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
                            <div className="text-left">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${tagColor}`}>
                                {f.tipo}
                              </span>
                              <span className="font-mono font-bold text-slate-300 ml-2">{f.hora}</span>
                              {f.notas && <p className="text-[9px] italic text-slate-550 mt-1 max-w-[200px] truncate" title={f.notas}>{f.notas}</p>}
                            </div>
                            
                            <button 
                              onClick={() => handleDelete(f.id)}
                              className="p-1 hover:text-rose-500 text-slate-500 transition-colors cursor-pointer"
                              title="Borrar fichaje"
                            >
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {fichajes.length === 0 && (
                  <div className="py-20 text-center text-slate-500 border border-slate-800 border-dashed rounded-2xl bg-slate-900/20">
                    <Calendar size={32} className="mx-auto mb-2 opacity-30"/>
                    <p className="text-xs italic">No hay registros de jornada para este periodo</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Manual Punch Register */}
          <div className="w-full md:w-1/3 p-6 bg-slate-950/20 overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800">
            {isAdding ? (
              <form onSubmit={handleSaveManual} className="space-y-4 text-left">
                <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wider pb-2 border-b border-slate-800">Fichaje Manual</h4>
                
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Empleado</label>
                  <select 
                    value={newEmpId} 
                    onChange={(e) => setNewEmpId(e.target.value)}
                    className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                  >
                    <option value="">-- Selecciona --</option>
                    {employees.filter(e => e.estado === 'Activo').map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha</label>
                  <input 
                    type="date" 
                    value={newFecha} 
                    onChange={(e) => setNewFecha(e.target.value)}
                    className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora (HH:MM)</label>
                    <input 
                      type="time" 
                      value={newHora} 
                      onChange={(e) => setNewHora(e.target.value)}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo Evento</label>
                    <select 
                      value={newTipo} 
                      onChange={(e) => setNewTipo(e.target.value)}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    >
                      <option value="Entrada">Entrada</option>
                      <option value="Inicio Pausa">Inicio Pausa</option>
                      <option value="Fin Pausa">Fin Pausa</option>
                      <option value="Salida">Salida</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notas / Justificación</label>
                  <textarea 
                    value={newNotas} 
                    onChange={(e) => setNewNotas(e.target.value)}
                    rows={3}
                    placeholder="Ej. Olvido fichar al salir de su turno..."
                    className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                  ></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer"
                  >
                    Guardar Fichaje
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsAdding(false); setNewNotas(''); setNewHora(''); }}
                    className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-16 text-slate-500 text-center">
                <Clock size={48} className="mb-3 text-slate-650 opacity-40"/>
                <h5 className="font-bold text-slate-350">Ajuste Horario Manual</h5>
                <p className="text-xs max-w-xs mt-1.5 leading-relaxed text-slate-400">Si un empleado olvida registrar un fichaje de entrada o salida, puedes ingresarlo manualmente aquí como Administrador. Los tiempos se recalcularán automáticamente en el informe de pre-nóminas.</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-6 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer"
                >
                  Registrar Fichaje Manual
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
