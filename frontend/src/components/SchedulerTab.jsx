import React from 'react';
import { CalendarRange, Sparkles, Users, Clock, CalendarDays, ChevronLeft, ChevronRight, Trash2, Store, FileText, AlertTriangle } from 'lucide-react';

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
  setIsStoreHoursModalOpen,
  fetchFestivos,
  setIsFestivosModalOpen,
  setIsCierresTiendaModalOpen,
  setIsRefuerzosModalOpen,
  getWeeklyHoursSummary,
  setSelectedPrefsEmployee,
  fetchEmployeeRestrictions,
  fetchEmployeeVacations,
  setIsEmployeePrefsModalOpen,
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
}) => {
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
            onClick={() => {
              let nextId = 'E-001';
              if (employees.length > 0) {
                const eIds = employees.map(e => parseInt(e.id.replace('E-', '')) || 0);
                const maxId = Math.max(...eIds);
                nextId = `E-${String(maxId + 1).padStart(3, '0')}`;
              }
              setEmployeeForm({ 
                id: nextId, nombre: '', puesto: 'Camarero', telefono: '', email: '', 
                horas_semanales: 40, pin: '', nif: '', nass: '', direccion: '', 
                iban: '', fecha_nacimiento: '', fecha_alta: '', tipo_contrato: 'Indefinido', 
                salario_base: 0, vacaciones_totales: 30, dias_libre_disposicion_totales: 2, 
                preferencia_turno: 'Alterno' 
              }); 
              setEditingEmployeeId(null); 
              setIsEmployeeModalOpen(true); 
            }} 
            className="py-2.5 px-4.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center transition-all cursor-pointer"
          >
            <Users size={14} className="mr-1.5"/> Plantilla Bar
          </button>
          
          <button 
            onClick={() => setIsStoreHoursModalOpen(true)} 
            className="py-2.5 px-4.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-350 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Clock size={14} className="mr-1.5 text-slate-400"/> Horario Bar
          </button>

          <button 
            onClick={() => setIsRefuerzosModalOpen(true)} 
            className="py-2.5 px-4.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-350 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Users size={14} className="mr-1.5 text-indigo-400"/> Cobertura Puestos
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
                      fetchEmployeeRestrictions(emp.id);
                      fetchEmployeeVacations(emp.id);
                      setIsEmployeePrefsModalOpen(true);
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
                        <p className="font-black text-indigo-400 font-mono text-[9px] mt-0.5">{day.dateFormatted}</p>
                        
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
                            else if (role === 'camarero') tagStyle = "bg-amber-950/40 border-amber-900/50 text-amber-400";
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
              <div className="min-w-[800px]">
                <div className="grid grid-cols-7 gap-3 mb-3">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                    <div key={d} className="font-black text-slate-500 text-[10px] uppercase tracking-widest text-center">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-3">
                  {getDaysOfMonth(new Date(new Date(selectedWeek).setDate(new Date(selectedWeek).getDate() + 6)).toISOString().split('T')[0]).map(day => {
                    const dayFestivo = festivos.find(f => f.fecha === day.dateStr);
                    const dayAbsences = workSchedules.filter(s => s.fecha === day.dateStr && (s.turno === 'Vacaciones' || s.turno === 'Libre Disposición' || s.turno === 'Baja' || s.turno === 'Permiso' || !s.empleado_id || s.empleado_id === ''));
                    
                    return (
                      <div 
                        key={day.dateStr} 
                        className={`min-h-[105px] rounded-2xl p-3 border transition-all flex flex-col ${
                          day.isCurrentMonth ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-950/30 border-slate-900/40 opacity-40'
                        } ${dayFestivo ? 'border-rose-900/40 bg-rose-950/5' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-black text-xs ${day.isCurrentMonth ? (dayFestivo ? 'text-rose-400' : 'text-slate-300') : 'text-slate-500'}`}>{day.dateFormatted}</span>
                          {dayFestivo && <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" title={dayFestivo.descripcion}></span>}
                        </div>
                        
                        <div className="space-y-1.5 flex-1 text-left">
                          {dayFestivo && (
                            <div className="text-[7.5px] font-black uppercase tracking-wider p-1 rounded bg-rose-950/40 text-rose-450 border border-rose-900/30 truncate" title={dayFestivo.descripcion}>
                              {dayFestivo.descripcion}
                            </div>
                          )}
                          {dayAbsences.map(s => {
                            const isUnassigned = !s.empleado_id || s.empleado_id === '';
                            const emp = employees.find(e => e.id === s.empleado_id);
                            const empName = isUnassigned ? 'Sin Asignar' : (emp?.nombre || '??');
                            const initials = empName.split(' ').map(n => n[0]).join('').substring(0,3);
                            
                            if (isUnassigned) {
                              return (
                                <div 
                                  key={s.id} 
                                  onClick={() => { setShiftForm(s); setIsShiftModalOpen(true); }} 
                                  className="cursor-pointer text-[8px] font-bold py-0.5 px-1.5 rounded bg-rose-950 border border-rose-900/50 text-rose-400 truncate animate-pulse" 
                                  title={`Necesidad Cobertura Sin Asignar: ${s.hora_inicio}-${s.hora_fin}`}
                                >
                                  ⚠️ {s.hora_inicio}
                                </div>
                              );
                            } else if (s.turno === 'Vacaciones') {
                              return <div key={s.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-rose-950/30 border border-rose-900/30 text-rose-400 truncate" title={`Vacaciones: ${empName}`}>🔴 {initials}</div>;
                            } else if (s.turno === 'Libre Disposición') {
                              return <div key={s.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-amber-950/30 border border-amber-900/30 text-amber-400 truncate" title={`Asuntos Propios: ${empName}`}>🟡 {initials}</div>;
                            } else if (s.turno === 'Baja') {
                              return <div key={s.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-rose-900/30 border border-rose-800/40 text-rose-300 truncate" title={`Baja Médica: ${empName}`}>🩹 {initials}</div>;
                            } else if (s.turno === 'Permiso') {
                              return <div key={s.id} className="text-[8px] font-bold py-0.5 px-1.5 rounded bg-blue-900/30 border border-blue-800/40 text-blue-300 truncate" title={`Permiso: ${empName}`}>📘 {initials}</div>;
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
    </div>
  );
};

export default SchedulerTab;
