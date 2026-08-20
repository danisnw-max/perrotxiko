import React from 'react';
import { CalendarRange, Sparkles, Users, Clock, CalendarDays, ChevronLeft, ChevronRight, Trash2, Store, FileText, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { api } from '../services/api';

const SchedulerTab = ({
  selectedWeek,
  setSelectedWeek,
  scheduleViewMode,
  setScheduleViewMode,
  setGenerateMonth,
  setGenerateYear,
  setIsGenerateModalOpen,
  employees,
  setEmployeeForm,
  setEditingEmployeeId,
  setIsEmployeeModalOpen,
  fetchFestivos,
  setIsFestivosModalOpen,
  setIsCierresTiendaModalOpen,
  getWeeklyHoursSummary,
  setSelectedPrefsEmployee,
  fetchEmployeeRestrictions,
  fetchFixedSchedules,
  fetchEmployeeVacations,
  setIsEmployeePrefsModalOpen,
  setIsEmployeeHoursModalOpen,
  storeHours,
  workSchedules,
  festivos,
  getDaysOfWeek,
  getDaysOfMonth,
  calculateShiftHours,
  setShiftForm,
  setIsShiftModalOpen,
  handleDeleteShift,
  setIsPresenceAuditModalOpen,
  setIsPrePayrollModalOpen,
  showToast,
  loadSchedules,
  coberturas,
  loadConfig,
  turnos,
}) => {
  const [monthlyFilter, setMonthlyFilter] = React.useState('trabajando'); // 'trabajando' or 'ausencias'
  const [isSwapRequestsModalOpen, setIsSwapRequestsModalOpen] = React.useState(false);
  const [swapRequests, setSwapRequests] = React.useState([]);

  const [isDemandModalOpen, setIsDemandModalOpen] = React.useState(false);
  const [selectedDemandDate, setSelectedDemandDate] = React.useState('');
  const [demandForm, setDemandForm] = React.useState({
    useTemplate: true,
    coberturas: {}
  });

  const fetchSwapRequests = async () => {
    try {
      const data = await api.get('/cambios-turno?estado=Pendiente');
      setSwapRequests(data);
      setIsSwapRequestsModalOpen(true);
    } catch (e) {
      showToast("Error al obtener solicitudes de cambio", "error");
    }
  };

  const handleUpdateSwapStatus = async (id, status) => {
    try {
      await api.put(`/cambios-turno/${id}/estado`, { estado: status });
      showToast(`Solicitud ${status === 'Aprobado' ? 'aprobada' : 'rechazada'} correctamente`, "success");
      const data = await api.get('/cambios-turno?estado=Pendiente');
      setSwapRequests(data);
      loadSchedules();
    } catch (e) {
      showToast("Error al procesar la solicitud", "error");
    }
  };

  const getBackendWeekday = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const openDemandModal = (dateStr) => {
    setSelectedDemandDate(dateStr);
    const dateCobs = (coberturas || []).filter(c => c.fecha === dateStr);
    const roles = ['Sala', 'Barra', 'Cocinero', 'Encargado', 'Limpieza'];
    const turns = turnos.length > 0 ? turnos.map(t => t.nombre) : ['Mañana', 'Tarde', 'Noche'];
    
    let initialCoberturas = {};
    turns.forEach(t => {
      initialCoberturas[t] = {};
      roles.forEach(r => {
        initialCoberturas[t][r] = 0;
      });
    });

    let useTemplate = true;

    if (dateCobs.length > 0) {
      useTemplate = false;
      dateCobs.forEach(c => {
        if (initialCoberturas[c.turno]) {
          initialCoberturas[c.turno][c.puesto] = c.cantidad;
        }
      });
    } else {
      const weekday = getBackendWeekday(dateStr);
      const weekdayCobs = (coberturas || []).filter(c => c.dia_semana === weekday && (!c.fecha || c.fecha === ''));
      weekdayCobs.forEach(c => {
        if (initialCoberturas[c.turno]) {
          initialCoberturas[c.turno][c.puesto] = c.cantidad;
        }
      });
    }

    setDemandForm({
      useTemplate,
      coberturas: initialCoberturas
    });
    setIsDemandModalOpen(true);
  };

  const handleSaveDemand = async () => {
    try {
      let payload = {
        fecha: selectedDemandDate,
        coberturas: []
      };

      if (!demandForm.useTemplate) {
        Object.entries(demandForm.coberturas).forEach(([turno, rolesObj]) => {
          Object.entries(rolesObj).forEach(([puesto, cantidad]) => {
            if (cantidad > 0) {
              payload.coberturas.push({
                turno,
                puesto,
                cantidad: parseInt(cantidad) || 0,
                descripcion: "Refuerzo especial",
                temporada_id: null
              });
            }
          });
        });
      }

      await api.post('/configuracion/coberturas/dia', payload);
      showToast("Demanda del día actualizada correctamente", "success");
      setIsDemandModalOpen(false);
      
      if (loadConfig) await loadConfig();
      if (loadSchedules) await loadSchedules();
    } catch (e) {
      showToast("Error al guardar la demanda", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Control Panel */}
      <div className="bg-slate-900/60 p-6 rounded-[28px] border border-slate-800 shadow-xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 text-left">
        <div className="flex items-center">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-3.5 rounded-2xl text-indigo-400 mr-4 shadow-md">
            <CalendarRange size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-100 tracking-tight">Planificación de Turnos</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Organización del personal y coberturas del Bar</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => {
              const d = new Date(selectedWeek);
              setGenerateMonth(d.getMonth() + 1);
              setGenerateYear(d.getFullYear());
              setIsGenerateModalOpen(true);
            }} 
            className="py-2.5 px-4.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center transition-all cursor-pointer"
          >
            <Sparkles size={14} className="mr-1.5"/> Auto-Generar Horario
          </button>
          


          <button 
            onClick={() => { fetchFestivos(); setIsFestivosModalOpen(true); }} 
            className="py-2.5 px-4.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-350 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <CalendarDays size={14} className="mr-1.5 text-rose-500"/> Festivos
          </button>

          <button 
            onClick={() => setIsCierresTiendaModalOpen(true)} 
            className="py-2.5 px-4.5 bg-slate-800 border border-slate-700 hover:bg-rose-950/20 hover:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Store size={14} className="mr-1.5 text-rose-500"/> Cierres Local
          </button>
          
          <button 
            onClick={() => setIsPresenceAuditModalOpen(true)} 
            className="py-2.5 px-4.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center transition-all cursor-pointer"
          >
            <Clock size={14} className="mr-1.5"/> Fichajes
          </button>

          <button 
            onClick={() => setIsPrePayrollModalOpen(true)} 
            className="py-2.5 px-4.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center transition-all cursor-pointer"
          >
            <FileText size={14} className="mr-1.5 text-emerald-400"/> Pre-Nóminas
          </button>

          <button 
            onClick={fetchSwapRequests} 
            className="py-2.5 px-4.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center transition-all cursor-pointer"
          >
            <ArrowRightLeft size={14} className="mr-1.5"/> Cambios Turno
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Left Panel: Employee balance cards */}
        <div className="xl:col-span-1 bg-slate-900/60 p-6 rounded-[28px] border border-slate-800 h-fit space-y-6">
          <h4 className="font-black text-slate-200 text-sm uppercase tracking-wider pb-4 border-b border-slate-800 text-left">
            {scheduleViewMode === 'weekly' ? 'Horas de esta Semana' : 'Horas de este Mes'}
          </h4>
          <div className="space-y-4">
            {getWeeklyHoursSummary().map(emp => {
              const pct = Math.min(100, (emp.scheduled / emp.contract) * 100);
              const isOver = emp.scheduled > emp.contract;
              const isUnder = emp.scheduled < emp.contract;
              return (
                <div 
                  key={emp.id} 
                  onClick={() => {
                    const fullEmp = employees.find(e => e.id === emp.id);
                    if (fullEmp) {
                      setSelectedPrefsEmployee(fullEmp);
                      setIsEmployeeHoursModalOpen(true);
                    }
                  }}
                  className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all space-y-2 text-left"
                  title="Gestionar preferencias y restricciones del empleado"
                >
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-200">{emp.name}</span>
                      <span className="font-bold text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">{emp.puesto}</span>
                    </div>
                    <span className={`font-mono font-black ${isOver ? 'text-rose-400' : isUnder ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {emp.scheduled.toFixed(1)}h / {emp.contract}h
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-rose-500' : isUnder ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
            {employees.filter(e => e.estado === 'Activo').length === 0 && (
              <p className="text-xs text-slate-500 font-bold italic text-left">No hay empleados activos configurados.</p>
            )}
          </div>
        </div>

        {/* Right Panel: Calendar Planner */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Week/Month Selector bar */}
          <div className="flex flex-col xl:flex-row justify-between items-center bg-slate-900/60 p-5 rounded-[24px] border border-slate-800 gap-4 text-left">
            <div className="flex gap-2 w-full xl:w-auto">
              <button 
                onClick={() => setScheduleViewMode('weekly')} 
                className={`flex-1 xl:flex-none py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  scheduleViewMode === 'weekly' ? 'bg-indigo-650 text-white shadow-lg' : 'bg-slate-850 hover:bg-slate-800 text-slate-400'
                }`}
              >
                Semanal
              </button>
              <button 
                onClick={() => setScheduleViewMode('monthly')} 
                className={`flex-1 xl:flex-none py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  scheduleViewMode === 'monthly' ? 'bg-indigo-650 text-white shadow-lg' : 'bg-slate-850 hover:bg-slate-800 text-slate-400'
                }`}
              >
                Mensual
              </button>
            </div>

            <div className="flex items-center justify-between w-full xl:w-auto gap-3">
              <button 
                onClick={() => {
                  const d = new Date(selectedWeek);
                  if (scheduleViewMode === 'monthly') {
                    d.setDate(d.getDate() + 6);
                    d.setDate(15);
                    d.setMonth(d.getMonth() - 1);
                    d.setDate(1);
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    d.setDate(diff);
                  } else {
                    d.setDate(d.getDate() - 7);
                  }
                  setSelectedWeek(d.toISOString().split('T')[0]);
                }} 
                className="p-2.5 bg-slate-850 hover:bg-slate-800 rounded-xl text-slate-400 border border-slate-800 cursor-pointer"
              >
                <ChevronLeft size={16}/>
              </button>
              <span className="font-black text-slate-200 tracking-tight text-sm min-w-[200px] xl:min-w-[260px] text-center">
                {scheduleViewMode === 'weekly' ? (
                  <>Semana del {new Date(selectedWeek).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al {new Date(new Date(selectedWeek).setDate(new Date(selectedWeek).getDate() + 6)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                ) : (
                  <>{new Date(new Date(selectedWeek).setDate(new Date(selectedWeek).getDate() + 6)).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</>
                )}
              </span>
              <button 
                onClick={() => {
                  const d = new Date(selectedWeek);
                  if (scheduleViewMode === 'monthly') {
                    d.setDate(d.getDate() + 6);
                    d.setDate(15);
                    d.setMonth(d.getMonth() + 1);
                    d.setDate(1);
                    const day = d.getDay();
                    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                    d.setDate(diff);
                  } else {
                    d.setDate(d.getDate() + 7);
                  }
                  setSelectedWeek(d.toISOString().split('T')[0]);
                }} 
                className="p-2.5 bg-slate-850 hover:bg-slate-800 rounded-xl text-slate-400 border border-slate-800 cursor-pointer"
              >
                <ChevronRight size={16}/>
              </button>
            </div>
            
            <button 
              onClick={() => {
                const d = new Date();
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diff));
                setSelectedWeek(monday.toISOString().split('T')[0]);
              }} 
              className="w-full xl:w-auto py-2 px-4.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 hover:bg-indigo-950/60 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              {scheduleViewMode === 'weekly' ? 'Semana Actual' : 'Mes Actual'}
            </button>
          </div>

          {/* Planner views */}
          {scheduleViewMode === 'weekly' ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {getDaysOfWeek(selectedWeek).map(day => {
                const sh = storeHours.find(h => h.dia_semana === day.dayOfWeek);
                const dayShifts = workSchedules.filter(s => s.fecha === day.dateStr);
                const dayFestivo = festivos.find(f => f.fecha === day.dateStr);
                
                return (
                  <div 
                    key={day.dateStr} 
                    className={`rounded-2xl p-4 border flex flex-col justify-between min-h-[380px] shadow-sm transition-all ${
                      dayFestivo ? 'bg-rose-950/10 border-rose-900/30' : 'bg-slate-900/40 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="border-b border-slate-800 pb-3 mb-4 text-left">
                        <h5 className="font-black text-slate-200 uppercase tracking-widest text-[11px] flex justify-between items-center">
                          <span>{day.name}</span>
                          {dayFestivo && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" title={dayFestivo.descripcion}></span>}
                        </h5>
                        <div className="flex justify-between items-center mt-1">
                          <p className="font-black text-indigo-400 font-mono text-[9px]">{day.dateFormatted}</p>
                          <button
                            onClick={() => openDemandModal(day.dateStr)}
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                              (coberturas || []).some(c => c.fecha === day.dateStr)
                                ? 'bg-amber-950/40 border-amber-850/40 text-amber-400 hover:bg-amber-900/30'
                                : 'bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'
                            }`}
                            title="Personalizar plantilla de personal para este día"
                          >
                            {(coberturas || []).some(c => c.fecha === day.dateStr) ? '🎯 Especial' : '🎯 Demanda'}
                          </button>
                        </div>
                        
                        <div className="mt-2 text-[8px] font-bold uppercase tracking-widest p-1.5 rounded-lg text-center bg-slate-950/40 text-slate-400">
                          {sh && sh.abierto ? (
                            <span>
                              {sh.apertura_manana}-{sh.cierre_manana}
                              {sh.apertura_tarde && ` / ${sh.apertura_tarde}-${sh.cierre_tarde}`}
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold">Cerrado</span>
                          )}
                        </div>
                        {dayFestivo && (
                          <div className="mt-2 text-[8px] font-bold uppercase tracking-wider p-1.5 rounded-lg text-center bg-rose-950/40 text-rose-400 border border-rose-900/50 truncate" title={dayFestivo.descripcion}>
                            Festivo: {dayFestivo.descripcion}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {dayShifts.map(s => {
                          const isUnassigned = !s.empleado_id || s.empleado_id === '';
                          const emp = employees.find(e => e.id === s.empleado_id);
                          const empName = isUnassigned ? '⚠️ Sin Asignar' : (emp?.nombre || 'Desconocido');
                          const hours = calculateShiftHours(s.hora_inicio, s.hora_fin);
                          
                          // Color schemes by PUESTO (very premium!)
                          let tagStyle = "bg-indigo-950/40 border-indigo-900/50 text-indigo-400";
                          
                          if (isUnassigned) {
                            tagStyle = "bg-rose-950/80 border-rose-500/50 text-rose-350 animate-pulse font-black";
                          } else {
                            const role = emp?.puesto?.toLowerCase() || '';
                            if (role === 'cocinero') tagStyle = "bg-emerald-950/40 border-emerald-900/50 text-emerald-400";
                            else if (role === 'camarero' || role === 'sala') tagStyle = "bg-amber-950/40 border-amber-900/50 text-amber-400";
                            else if (role === 'barra') tagStyle = "bg-purple-950/40 border-purple-900/50 text-purple-400";
                            else if (role === 'encargado') tagStyle = "bg-sky-950/40 border-sky-900/50 text-sky-400";
                            else if (role === 'limpieza') tagStyle = "bg-slate-800/40 border-slate-700/50 text-slate-350";
                            
                            // Special leaves override colors
                            if (s.turno === 'Vacaciones') tagStyle = "bg-rose-950/30 border-rose-900/50 text-rose-400";
                            else if (s.turno === 'Baja') tagStyle = "bg-rose-900/40 border-rose-800/50 text-rose-300";
                            else if (s.turno === 'Permiso') tagStyle = "bg-blue-900/40 border-blue-800/50 text-blue-300";
                            else if (s.turno === 'Libre') tagStyle = "bg-slate-950/20 border-slate-850 text-slate-500";
                          }

                          const isSpecialLock = s.turno === 'Baja' || s.turno === 'Permiso';
                          
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => { 
                                if (isSpecialLock) {
                                  alert("Este turno (Baja/Permiso) se gestiona desde el registro de Incidencias en la ficha del empleado.");
                                  return;
                                }
                                setShiftForm(s); 
                                setIsShiftModalOpen(true); 
                              }} 
                              className={`p-2.5 rounded-xl border ${tagStyle} text-left relative group ${
                                isSpecialLock ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:scale-[1.02]'
                              } transition-all`}
                            >
                              {!isSpecialLock && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteShift(s.id); }} 
                                  className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-all cursor-pointer"
                                >
                                  <Trash2 size={12}/>
                                </button>
                              )}
                              <p className="font-bold text-xs pr-4 truncate">{empName}</p>
                              <p className="font-mono text-[9px] font-bold mt-1 text-slate-400">
                                {isSpecialLock ? 'Todo el día (0h)' : `${s.hora_inicio} - ${s.hora_fin} (${hours.toFixed(1)}h)`}
                              </p>
                              {s.notas && <p className="text-[8px] italic mt-1 opacity-70 truncate max-w-[95%]">{s.notas}</p>}
                            </div>
                          );
                        })}
                        {dayShifts.length === 0 && (
                          <p className="text-[10px] text-slate-600 font-bold italic text-center py-8">Sin turnos</p>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => { 
                        setShiftForm({ 
                          id: null, 
                          empleado_id: employees.filter(e => e.estado === 'Activo')[0]?.id || '', 
                          fecha: day.dateStr, 
                          turno: 'Mañana', 
                          hora_inicio: '09:00', 
                          hora_fin: '16:00', 
                          notas: '' 
                        }); 
                        setIsShiftModalOpen(true); 
                      }} 
                      className="w-full mt-4 py-2 bg-slate-950/20 hover:bg-indigo-950/30 hover:text-indigo-400 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-dashed border-slate-800 hover:border-indigo-900/50 cursor-pointer"
                    >
                      + Turno
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Monthly Grid View */
            <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-5 shadow-sm overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Visualización Mensual</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMonthlyFilter('trabajando')} 
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${monthlyFilter === 'trabajando' ? 'bg-indigo-650 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    Trabajando
                  </button>
                  <button 
                    onClick={() => setMonthlyFilter('ausencias')} 
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${monthlyFilter === 'ausencias' ? 'bg-indigo-650 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    Vacaciones / Libres
                  </button>
                </div>
              </div>
              
              <div className="min-w-[800px]">
                <div className="grid grid-cols-7 gap-3 mb-3">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                    <div key={d} className="font-black text-slate-500 text-[10px] uppercase tracking-widest text-center">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-3">
                  {getDaysOfMonth(new Date(new Date(selectedWeek).setDate(new Date(selectedWeek).getDate() + 6)).toISOString().split('T')[0]).map(day => {
                    const dayFestivo = festivos.find(f => f.fecha === day.dateStr);
                    const dayShifts = workSchedules.filter(s => s.fecha === day.dateStr);
                    
                    let displayItems = [];
                    if (monthlyFilter === 'trabajando') {
                        const workingEmps = [...new Set(dayShifts.filter(s => s.empleado_id && s.empleado_id !== '' && !['Vacaciones', 'Libre Disposición', 'Baja', 'Permiso', 'Festivo'].includes(s.turno)).map(s => s.empleado_id))];
                        const workers = workingEmps.map(empId => {
                            const emp = employees.find(e => e.id === empId);
                            const empName = emp?.nombre || '??';
                            return {
                                id: 'work-' + empId,
                                type: 'trabajo',
                                empName,
                                initials: empName.split(' ').map(n => n[0]).join('').substring(0,3)
                            };
                        });
                        
                        const unassignedShifts = dayShifts.filter(s => !s.empleado_id || s.empleado_id === '').map(s => ({
                            id: s.id,
                            type: s.turno,
                            empName: 'Sin Asignar',
                            initials: 'SA',
                            shift: s,
                            isUnassigned: true
                        }));
                        displayItems = [...workers, ...unassignedShifts];
                    } else {
                        const dbAbsences = dayShifts.filter(s => ['Vacaciones', 'Libre Disposición', 'Baja', 'Permiso'].includes(s.turno) || !s.empleado_id || s.empleado_id === '').map(s => {
                            const isUnassigned = !s.empleado_id || s.empleado_id === '';
                            const emp = employees.find(e => e.id === s.empleado_id);
                            const empName = isUnassigned ? 'Sin Asignar' : (emp?.nombre || '??');
                            return {
                                id: s.id,
                                type: s.turno,
                                empName,
                                initials: empName.split(' ').map(n => n[0]).join('').substring(0,3),
                                shift: s,
                                isUnassigned
                            };
                        });
                        
                        // Calculate implicit days off
                        const empsWithShiftToday = new Set(dayShifts.filter(s => s.empleado_id).map(s => s.empleado_id));
                        const offEmps = employees.filter(e => e.estado === 'Activo' && e.horas_semanales > 0 && !empsWithShiftToday.has(e.id)).map(emp => {
                            const empName = emp.nombre || '??';
                            return {
                                id: 'off-' + emp.id,
                                type: 'Libre',
                                empName,
                                initials: empName.split(' ').map(n => n[0]).join('').substring(0,3),
                                isUnassigned: false
                            };
                        });
                        
                        displayItems = [...dbAbsences, ...offEmps];
                    }
                    
                    return (
                      <div 
                        key={day.dateStr} 
                        className={`min-h-[105px] rounded-2xl p-3 border transition-all flex flex-col ${
                          day.isCurrentMonth ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-950/30 border-slate-900/40 opacity-40'
                        } ${dayFestivo ? 'border-rose-900/40 bg-rose-950/5' : ''}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-black text-xs ${day.isCurrentMonth ? (dayFestivo ? 'text-rose-400' : 'text-slate-300') : 'text-slate-500'}`}>{day.dateFormatted}</span>
                          <div className="flex items-center gap-1.5">
                            {day.isCurrentMonth && (
                              <button 
                                onClick={() => openDemandModal(day.dateStr)}
                                className={`text-[9px] hover:text-slate-200 transition-colors cursor-pointer ${
                                  (coberturas || []).some(c => c.fecha === day.dateStr)
                                    ? 'text-amber-400 font-black'
                                    : 'text-slate-600 opacity-40 hover:opacity-100'
                                }`}
                                title="Configurar personal necesario para este día"
                              >
                                🎯
                              </button>
                            )}
                            {dayFestivo && <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" title={dayFestivo.descripcion}></span>}
                          </div>
                        </div>
                        
                        <div className="space-y-1.5 flex-1 text-left">
                          {dayFestivo && (
                            <div className="text-[7.5px] font-black uppercase tracking-wider p-1 rounded bg-rose-950/40 text-rose-450 border border-rose-900/30 truncate" title={dayFestivo.descripcion}>
                              {dayFestivo.descripcion}
                            </div>
                          )}
                          {displayItems.map(item => {
                            const displayName = item.empName.split(' ')[0]; // Show the first name
                            if (item.type === 'trabajo') {
                              return <div key={item.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-indigo-950/30 border border-indigo-900/30 text-indigo-300 truncate" title={`Trabaja: ${item.empName}`}>🧑‍🍳 {displayName}</div>;
                            } else if (item.isUnassigned) {
                              return (
                                <div 
                                  key={item.id} 
                                  onClick={() => { setShiftForm(item.shift); setIsShiftModalOpen(true); }} 
                                  className="cursor-pointer text-[8px] font-bold py-0.5 px-1.5 rounded bg-rose-950 border border-rose-900/50 text-rose-400 truncate animate-pulse" 
                                  title={`Necesidad Cobertura Sin Asignar: ${item.shift.hora_inicio}-${item.shift.hora_fin}`}
                                >
                                  ⚠️ {item.shift.hora_inicio}
                                </div>
                              );
                            } else if (item.type === 'Vacaciones') {
                              return <div key={item.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-rose-950/30 border border-rose-900/30 text-rose-400 truncate" title={`Vacaciones: ${item.empName}`}>🔴 {displayName}</div>;
                            } else if (item.type === 'Libre Disposición') {
                              return <div key={item.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-amber-950/30 border border-amber-900/30 text-amber-400 truncate" title={`Asuntos Propios: ${item.empName}`}>🟡 {displayName}</div>;
                            } else if (item.type === 'Baja') {
                              return <div key={item.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-rose-900/30 border border-rose-800/40 text-rose-300 truncate" title={`Baja Médica: ${item.empName}`}>🩹 {displayName}</div>;
                            } else if (item.type === 'Permiso') {
                              return <div key={item.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-blue-900/30 border border-blue-800/40 text-blue-300 truncate" title={`Permiso: ${item.empName}`}>📘 {displayName}</div>;
                            } else if (item.type === 'Libre') {
                              return <div key={item.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 truncate" title={`Día Libre: ${item.empName}`}>🌴 {displayName}</div>;
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {isSwapRequestsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-2xl w-full flex flex-col text-left max-h-[85vh] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="text-indigo-400" size={20} />
                Solicitudes de Cambio de Turno
              </h3>
              <button 
                onClick={() => setIsSwapRequestsModalOpen(false)} 
                className="p-2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 mb-6">
              {swapRequests.map(req => {
                const empOrigen = employees.find(e => e.id === req.empleado_origen_id);
                const empDestino = employees.find(e => e.id === req.empleado_destino_id);
                const shift = workSchedules.find(s => s.id === req.turno_origen_id);
                
                if (!empOrigen || !empDestino || !shift) return null;
                
                const dayName = new Date(shift.fecha).toLocaleDateString('es-ES', { weekday: 'long' });
                const dateNum = new Date(shift.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

                return (
                  <div key={req.id} className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-350 flex items-center gap-2">
                        <span className="text-indigo-300 font-extrabold">{empOrigen.nombre}</span>
                        <ArrowRightLeft size={10} className="text-slate-600" />
                        <span className="text-emerald-300 font-extrabold">{empDestino.nombre}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-black">
                        Turno a ceder: <span className="text-amber-400">{dayName} {dateNum} ({shift.turno} {shift.hora_inicio}-{shift.hora_fin})</span>
                      </div>
                      {req.notes && (
                        <p className="text-[10px] text-slate-500 italic">"{req.notes}"</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button 
                        onClick={() => handleUpdateSwapStatus(req.id, 'Aprobado')}
                        className="flex-1 sm:flex-none py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Aprobar
                      </button>
                      <button 
                        onClick={() => handleUpdateSwapStatus(req.id, 'Rechazado')}
                        className="flex-1 sm:flex-none py-2 px-4 bg-rose-650 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
              {swapRequests.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500 italic font-bold">
                  No hay solicitudes de cambio de turno pendientes de aprobación.
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsSwapRequestsModalOpen(false)}
              className="w-full py-3.5 bg-slate-850 hover:bg-slate-850/80 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-750"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      {isDemandModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-xl w-full flex flex-col text-left max-h-[90vh] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                🎯 Personal Requerido: {selectedDemandDate}
              </h3>
              <button 
                onClick={() => setIsDemandModalOpen(false)} 
                className="p-2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-1 mb-6">
              {/* Type selector */}
              <div className="flex gap-2 bg-slate-950/40 p-1.5 rounded-2xl border border-slate-850">
                <button
                  type="button"
                  onClick={() => setDemandForm({ ...demandForm, useTemplate: true })}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    demandForm.useTemplate ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Usar Plantilla Habitual
                </button>
                <button
                  type="button"
                  onClick={() => setDemandForm({ ...demandForm, useTemplate: false })}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    !demandForm.useTemplate ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Personalizar Demanda
                </button>
              </div>

              {demandForm.useTemplate ? (
                <div className="p-4 bg-slate-950/20 rounded-2xl border border-slate-800 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Vista previa de la plantilla habitual (informativo)
                  </p>
                  <div className="space-y-2">
                    {Object.entries(demandForm.coberturas).map(([turno, rolesObj]) => {
                      const activeRoles = Object.entries(rolesObj).filter(([_, qty]) => qty > 0);
                      if (activeRoles.length === 0) return null;
                      return (
                        <div key={turno} className="flex justify-between items-center text-xs p-2 bg-slate-950/40 rounded-lg">
                          <span className="font-extrabold text-slate-300">{turno}</span>
                          <div className="flex gap-2 flex-wrap">
                            {activeRoles.map(([role, qty]) => (
                              <span key={role} className="bg-slate-900 px-2 py-0.5 rounded text-[10px] font-mono text-indigo-400 font-bold border border-slate-800">
                                {role}: {qty}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(demandForm.coberturas).map(([turno, rolesObj]) => (
                    <div key={turno} className="p-4 bg-slate-950/20 rounded-2xl border border-slate-800 space-y-3">
                      <h4 className="font-black text-slate-200 text-[11px] uppercase tracking-widest border-b border-slate-850 pb-2">
                        Turno: {turno}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(rolesObj).map(([puesto, cantidad]) => (
                          <div key={puesto} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-2 rounded-xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{puesto}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const val = Math.max(0, cantidad - 1);
                                  setDemandForm({
                                    ...demandForm,
                                    coberturas: {
                                      ...demandForm.coberturas,
                                      [turno]: {
                                        ...demandForm.coberturas[turno],
                                        [puesto]: val
                                      }
                                    }
                                  });
                                }}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer border border-slate-700"
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-mono font-black text-xs text-slate-100">{cantidad}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const val = cantidad + 1;
                                  setDemandForm({
                                    ...demandForm,
                                    coberturas: {
                                      ...demandForm.coberturas,
                                      [turno]: {
                                        ...demandForm.coberturas[turno],
                                        [puesto]: val
                                      }
                                    }
                                  });
                                }}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer border border-slate-700"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleSaveDemand}
                className="flex-1 py-3.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Guardar Configuración
              </button>
              <button 
                onClick={() => setIsDemandModalOpen(false)}
                className="py-3.5 px-6 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulerTab;
