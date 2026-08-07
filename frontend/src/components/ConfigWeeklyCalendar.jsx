import React, { useState } from 'react';
import { Calendar, Clock, Edit2, Plus, Trash2, ShieldAlert } from 'lucide-react';

export default function ConfigWeeklyCalendar({ 
  temporada, 
  turnos, 
  storeHours, 
  coberturas,
  onEditDayHours,
  onAddTurnoToDay,
  onEditCobertura,
  onDeleteCobertura,
  onDeleteTurno,
  onAddGlobalHours,
  onDeleteFranjaDay
}) {
  const days = [
    { id: 0, name: 'Lunes', short: 'LUN' },
    { id: 1, name: 'Martes', short: 'MAR' },
    { id: 2, name: 'Miércoles', short: 'MIÉ' },
    { id: 3, name: 'Jueves', short: 'JUE' },
    { id: 4, name: 'Viernes', short: 'VIE' },
    { id: 5, name: 'Sábado', short: 'SÁB' },
    { id: 6, name: 'Domingo', short: 'DOM' }
  ];

  if (!temporada) {
    return <div className="p-8 text-center text-slate-500">Cargando temporada...</div>;
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-[28px] overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Calendar size={18} className="text-indigo-400" />
            Calendario Semanal ({temporada.nombre})
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Gestiona los horarios de apertura y los turnos de personal para cada día
          </p>
        </div>
        <button 
          onClick={onAddGlobalHours}
          className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
        >
          <Clock size={12} /> Añadir Horarios (Varios días)
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {days.map(day => {
          const hours = storeHours.find(h => h.dia_semana === day.id) || { abierto: false };
          const dayCoberturas = coberturas.filter(c => c.dia_semana === day.id && !c.fecha);
          
          // Group coberturas by turno
          const turnosInDay = {};
          dayCoberturas.forEach(c => {
            if (!turnosInDay[c.turno]) {
              const turnoDef = turnos.find(t => t.nombre === c.turno);
              turnosInDay[c.turno] = {
                nombre: c.turno,
                hora_inicio: turnoDef ? turnoDef.hora_inicio : '?',
                hora_fin: turnoDef ? turnoDef.hora_fin : '?',
                puestos: []
              };
            }
            turnosInDay[c.turno].puestos.push(c);
          });

          return (
            <div key={day.id} className="flex flex-col bg-slate-950/20 hover:bg-slate-900/50 transition-colors">
              {/* Day Header */}
              <div className="p-3 border-b border-slate-800 flex justify-between items-center group cursor-pointer" onClick={() => onEditDayHours(day.id, hours)}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider ${hours.abierto ? 'text-slate-200' : 'text-slate-500'}`}>
                    {day.name}
                  </span>
                </div>
                <Edit2 size={12} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              
              {/* Bar Hours */}
              <div className="px-3 py-2 border-b border-slate-800/50 bg-slate-900/30">
                {hours.abierto ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    <Clock size={10} />
                    {hours.hora_apertura} - {hours.hora_cierre}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                    <ShieldAlert size={10} />
                    Cerrado
                  </div>
                )}
              </div>

              {/* Shifts & Coverages */}
              <div className="flex-1 p-2 space-y-2">
                {Object.values(turnosInDay).map((t, idx) => (
                  <div key={idx} className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <div className="text-[10px] font-black text-slate-200 uppercase tracking-wider">{t.nombre}</div>
                        <div className="text-[9px] font-mono text-slate-400">{t.hora_inicio} - {t.hora_fin}</div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onAddTurnoToDay(day.id, t.nombre); }} className="text-slate-500 hover:text-indigo-400">
                          <Edit2 size={10} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteFranjaDay(day.id, t.nombre); }} className="text-slate-500 hover:text-rose-400">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mt-2">
                      {t.puestos.map(c => (
                        <div key={c.id} className="flex justify-between items-center text-[9px] font-bold text-slate-300">
                          <span>{c.puesto}</span>
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">x{c.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {hours.abierto && (
                  <button 
                    onClick={() => onAddTurnoToDay(day.id)}
                    className="w-full py-1.5 mt-2 border border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-400 rounded-lg flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    <Plus size={10} /> Añadir Franja
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
