import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Plus, Calendar, Trash2, FileText, Upload, Download } from 'lucide-react';
import { api } from '../../services/api';

export default function IncidenciasEmpleadoModal({
  isOpen,
  onClose,
  employee,
  showToast,
  onSuccess
}) {
  const [incidents, setIncidents] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);

  // Form states
  const [categoria, setCategoria] = useState('Baja');
  const [tipo, setTipo] = useState('Común');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [retribuido, setRetribuido] = useState(true);
  const [justificado, setJustificado] = useState(true);

  const fetchIncidents = async () => {
    if (!employee) return;
    try {
      const data = await api.get(`/empleados/${employee.id}/incidencias`);
      setIncidents(data);
    } catch (e) {
      console.error(e);
      showToast("Error al cargar incidencias", "error");
    }
  };

  useEffect(() => {
    if (isOpen && employee) {
      fetchIncidents();
      setIsAdding(false);
      resetForm();
    }
  }, [isOpen, employee]);

  const resetForm = () => {
    setCategoria('Baja');
    setTipo('Común');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setFechaFin(new Date().toISOString().split('T')[0]);
    setHoraInicio('');
    setHoraFin('');
    setDescripcion('');
    setRetribuido(true);
    setJustificado(true);
    setFileToUpload(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fechaInicio) {
      showToast("La fecha de inicio es requerida", "error");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        empleado_id: employee.id,
        categoria,
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        horas_totales: 0.0,
        retribuido,
        justificado,
        estado: 'Aprobado',
        descripcion
      };

      const newInc = await api.post('/empleados/incidencias', payload);
      
      // If there is a file to upload
      if (fileToUpload) {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        await api.post(`/empleados/incidencias/${newInc.id}/upload`, formData);
      }

      showToast("Incidencia registrada correctamente", "success");
      fetchIncidents();
      setIsAdding(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al crear incidencia", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta incidencia? Se restaurarán los horarios correspondientes.")) return;
    try {
      await api.delete(`/empleados/incidencias/${id}`);
      showToast("Incidencia eliminada", "success");
      fetchIncidents();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar incidencia", "error");
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="text-left">
            <h3 className="text-xl font-black text-slate-100 tracking-tight flex items-center">
              <ShieldAlert className="mr-3 text-rose-500" size={24}/>
              Ausencias e Incidencias: {employee.nombre}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de bajas, vacaciones, permisos y faltas de asistencia</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 rounded-xl transition-all cursor-pointer"
          >
            <X size={18}/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: List of Incidents */}
          <div className="w-full md:w-1/2 p-6 border-r border-slate-800 flex flex-col overflow-y-auto max-h-[40vh] md:max-h-[none]">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Historial Reciente</h4>
              {!isAdding && (
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="py-1.5 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all cursor-pointer"
                >
                  <Plus size={14} className="mr-1"/> Añadir Incidencia
                </button>
              )}
            </div>

            <div className="space-y-3 flex-1">
              {incidents.map(inc => {
                let badgeClass = "bg-rose-950/40 text-rose-400 border border-rose-900/50";
                if (inc.categoria === 'Permiso') badgeClass = "bg-blue-950/40 text-blue-400 border border-blue-900/50";
                if (inc.categoria === 'Falta') badgeClass = "bg-amber-950/40 text-amber-400 border border-amber-900/50";
                
                return (
                  <div key={inc.id} className="p-4 bg-slate-850 rounded-2xl border border-slate-800 text-left relative group">
                    <button 
                      onClick={() => handleDelete(inc.id)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-all cursor-pointer"
                      title="Eliminar incidencia"
                    >
                      <Trash2 size={12}/>
                    </button>
                    
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClass}`}>
                        {inc.categoria}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {inc.fecha_inicio} {inc.fecha_fin ? `al ${inc.fecha_fin}` : ''}
                      </span>
                    </div>

                    <h5 className="font-bold text-slate-200 text-sm">{inc.tipo}</h5>
                    {inc.descripcion && <p className="text-xs text-slate-400 mt-1">{inc.descripcion}</p>}
                    
                    <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-slate-800/50 text-[10px] text-slate-400">
                      <span>Retribuido: <strong>{inc.retribuido ? 'Sí' : 'No'}</strong></span>
                      <span>Justificado: <strong>{inc.justificado ? 'Sí' : 'No'}</strong></span>
                    </div>

                    {inc.documento_adjunto && (
                      <a 
                        href={`http://localhost:8000/uploads/justificantes/${inc.documento_adjunto}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-2.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-[10px] font-bold flex items-center w-fit gap-1.5 border border-slate-700"
                      >
                        <FileText size={12} className="text-indigo-400"/> ver Justificante
                      </a>
                    )}
                  </div>
                );
              })}
              
              {incidents.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-10 text-slate-500">
                  <Calendar size={32} className="mb-2 opacity-30"/>
                  <p className="text-xs italic">Sin incidencias registradas</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Add Form */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto max-h-[50vh] md:max-h-[none] bg-slate-950/20">
            {isAdding ? (
              <form onSubmit={handleSave} className="space-y-4 text-left">
                <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wider pb-2 border-b border-slate-800">Nueva Incidencia</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría</label>
                    <select 
                      value={categoria} 
                      onChange={(e) => {
                        setCategoria(e.target.value);
                        if (e.target.value === 'Baja') setTipo('Común');
                        else if (e.target.value === 'Permiso') setTipo('Vacaciones');
                        else setTipo('Injustificada');
                      }}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    >
                      <option value="Baja">Baja Médica</option>
                      <option value="Permiso">Permiso / Vacaciones</option>
                      <option value="Falta">Falta / Ausencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo Específico</label>
                    {categoria === 'Baja' ? (
                      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none">
                        <option value="Común">Enfermedad Común</option>
                        <option value="Profesional">Accidente Laboral</option>
                        <option value="Maternidad">Maternidad/Paternidad</option>
                      </select>
                    ) : categoria === 'Permiso' ? (
                      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none">
                        <option value="Vacaciones">Vacaciones</option>
                        <option value="Asuntos propios">Asuntos Propios (LD)</option>
                        <option value="Médico">Visita Médica</option>
                        <option value="Examen">Examen / Estudios</option>
                        <option value="Matrimonio">Matrimonio</option>
                      </select>
                    ) : (
                      <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none">
                        <option value="Injustificada">Injustificada</option>
                        <option value="Retraso">Retraso</option>
                        <option value="Huelga">Huelga</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Inicio</label>
                    <input 
                      type="date" 
                      value={fechaInicio} 
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Fin</label>
                    <input 
                      type="date" 
                      value={fechaFin} 
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Inicio (Opcional)</label>
                    <input 
                      type="time" 
                      value={horaInicio} 
                      onChange={(e) => setHoraInicio(e.target.value)}
                      placeholder="HH:MM"
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Fin (Opcional)</label>
                    <input 
                      type="time" 
                      value={horaFin} 
                      onChange={(e) => setHoraFin(e.target.value)}
                      placeholder="HH:MM"
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-6 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-350">
                    <input 
                      type="checkbox" 
                      checked={retribuido} 
                      onChange={(e) => setRetribuido(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0 w-4 h-4"
                    />
                    ¿Retribuido?
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-350">
                    <input 
                      type="checkbox" 
                      checked={justificado} 
                      onChange={(e) => setJustificado(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0 w-4 h-4"
                    />
                    ¿Justificado?
                  </label>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción / Observaciones</label>
                  <textarea 
                    value={descripcion} 
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={2}
                    className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    placeholder="Ej. Justificante médico de cabecera adjunto..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Adjuntar Documento (.pdf, .png, .jpg)</label>
                  <div className="border-2 border-dashed border-slate-800 hover:border-indigo-600/50 transition-colors p-4 rounded-xl text-center relative bg-slate-900/30">
                    <input 
                      type="file" 
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFileToUpload(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center">
                      <Upload size={20} className="text-slate-500 mb-1"/>
                      <span className="text-xs font-bold text-slate-350">
                        {fileToUpload ? fileToUpload.name : 'Arrastra o selecciona un archivo'}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5">Tamaño máximo 5MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Registrando...' : 'Guardar Registro'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsAdding(false); resetForm(); }}
                    className="py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-16 text-slate-500 text-center">
                <ShieldAlert size={48} className="mb-3 text-slate-650 opacity-40"/>
                <h5 className="font-bold text-slate-350">Añadir Incidencia</h5>
                <p className="text-xs max-w-xs mt-1.5 leading-relaxed">Registra bajas médicas de cabecera o permisos vacacionales. Al guardar la incidencia aprobada, se liberará al trabajador de los cuadrantes en las fechas seleccionadas.</p>
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="mt-6 py-2.5 px-5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer"
                >
                  Registrar Incidencia
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
