import React, { useState, useEffect } from 'react';
import { 
  Users, CalendarDays, Clock, Settings, FileText, 
  CalendarRange, Plus, ShieldAlert, CheckCircle, Mail, MapPin, 
  Phone, Briefcase, PlusCircle, AlertCircle, Trash2, X, Edit2
} from 'lucide-react';
import { api } from './services/api';

// Modals & Subcomponents
import SchedulerTab from './components/SchedulerTab';
import FichajePinPadModal from './components/modals/FichajePinPadModal';
import IncidenciasEmpleadoModal from './components/modals/IncidenciasEmpleadoModal';
import PrePayrollModal from './components/modals/PrePayrollModal';
import AuditoriaFichajesModal from './components/modals/AuditoriaFichajesModal';
import ConfigWeeklyCalendar from './components/ConfigWeeklyCalendar';

export default function App() {
  // Global States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [workSchedules, setWorkSchedules] = useState([]);

  // Temporadas
  const [temporadas, setTemporadas] = useState([]);
  const [activeTemporadaId, setActiveTemporadaId] = useState(null);
  const [isTemporadasModalOpen, setIsTemporadasModalOpen] = useState(false);
  const [temporadaForm, setTemporadaForm] = useState({ id: null, nombre: '', fecha_inicio: '', fecha_fin: '', es_defecto: false });
  const [storeHours, setStoreHours] = useState([]);
  const [festivos, setFestivos] = useState([]);
  const [coberturas, setCoberturas] = useState([]);
  const [empresa, setEmpresa] = useState({ nombre: '', nif: '', direccion: '', telefono: '', email: '' });
  const [smtp, setSmtp] = useState({ smtp_server: '', smtp_port: 587, smtp_user: '', smtp_password: '', email_remitente: '' });
  
  // Date tracking for Scheduler
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [scheduleViewMode, setScheduleViewMode] = useState('weekly');
  
  // Modals Visibility
  const [isFichajeModalOpen, setIsFichajeModalOpen] = useState(false);
  const [isIncidenciasModalOpen, setIsIncidenciasModalOpen] = useState(false);
  const [isPrePayrollModalOpen, setIsPrePayrollModalOpen] = useState(false);
  const [isPresenceAuditModalOpen, setIsPresenceAuditModalOpen] = useState(false);
  
  // Auto-Scheduling Wizard Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Employee Edit / Add Modal
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    id: '', nombre: '', puesto: 'Sala', roles_adicionales: '', dias_permitidos: '0,1,2,3,4,5,6', telefono: '', email: '', 
    horas_semanales: 40, pin: '', nif: '', nass: '', direccion: '', 
    iban: '', fecha_nacimiento: '', fecha_alta: '', tipo_contrato: 'Indefinido', 
    salario_base: 0, vacaciones_totales: 30, dias_libre_disposicion_totales: 2, 
    preferencia_turno: 'Alterno'
  });

  // Employee Preferences & Restrictions Modal
  const [isEmployeePrefsModalOpen, setIsEmployeePrefsModalOpen] = useState(false);
  const [isEmployeeHoursModalOpen, setIsEmployeeHoursModalOpen] = useState(false);
  const [selectedPrefsEmployee, setSelectedPrefsEmployee] = useState(null);
  const [restrictions, setRestrictions] = useState([]);
  const [employeeVacations, setEmployeeVacations] = useState([]);
  const [restrictionForm, setRestrictionForm] = useState({
    id: null, empleado_id: '', fecha: '', hora_inicio: '', hora_fin: '', descripcion: ''
  });
  const [fixedSchedules, setFixedSchedules] = useState([]);
  const [fixedScheduleForm, setFixedScheduleForm] = useState({
    id: null, empleado_id: '', dia_semana: 0, hora_inicio: '09:00', hora_fin: '17:00', tipo: 'Fijo'
  });

  // Manual Shift Add / Edit Modal
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    id: null, empleado_id: '', fecha: '', turno: 'Mañana', hora_inicio: '09:00', hora_fin: '16:00', notas: ''
  });

  // Bar Hours Modal
  const [isStoreHoursModalOpen, setIsStoreHoursModalOpen] = useState(false);
  const [editingStoreHours, setEditingStoreHours] = useState([]);
  const [barHoursForm, setBarHoursForm] = useState({
    id: null, dias_semana: [], desde: '', hasta: '', abierto: true,
    hora_apertura: '09:00', hora_cierre: '00:00'
  });
  const [barHoursType, setBarHoursType] = useState('always');
  const [turnos, setTurnos] = useState([]);
  const [turnoForm, setTurnoForm] = useState({ id: null, nombre: '', hora_inicio: '09:00', hora_fin: '16:00' });
  const [isTurnosModalOpen, setIsTurnosModalOpen] = useState(false);

  // Role Coverages Modal
  const [isRefuerzosModalOpen, setIsRefuerzosModalOpen] = useState(false);
  const [coverageForm, setCoverageForm] = useState({
    id: null, dias_semana: [0], fecha: '', turno: 'Mañana', cantidades: { Sala: 1, Barra: 1, Cocinero: 1, Encargado: 1, Limpieza: 0 }, descripcion: ''
  });
  const [coverageType, setCoverageType] = useState('weekday');

  // Holidays Modal
  const [isFestivosModalOpen, setIsFestivosModalOpen] = useState(false);
  const [festivoForm, setFestivoForm] = useState({ id: null, fecha: '', descripcion: '' });

  // Closures Modal
  const [isCierresTiendaModalOpen, setIsCierresTiendaModalOpen] = useState(false);
  const [cierres, setCierres] = useState([]);
  const [cierreForm, setCierreForm] = useState({ id: null, fecha_inicio: '', fecha_fin: '', motivo: '' });

  // Real-time Status of Employees (clock-ins)
  const [presenceStates, setPresenceStates] = useState({});

  // Toast System
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch initial data
  const loadEmployees = async () => {
    try {
      const data = await api.get('/empleados');
      setEmployees(data);
      
      // Load presence status for all employees
      const statuses = {};
      for (const emp of data) {
        if (emp.estado === 'Activo') {
          const st = await api.get(`/presencia/estado/${emp.id}`);
          statuses[emp.id] = st;
        }
      }
      setPresenceStates(statuses);
    } catch (e) {
      console.error(e);
      showToast("Error al cargar empleados", "error");
    }
  };

  const loadSchedules = async () => {
    try {
      // Load schedules for selected month/week
      const d = new Date(selectedWeek);
      const start = new Date(d.setDate(d.getDate() - 15)).toISOString().split('T')[0];
      const end = new Date(d.setDate(d.getDate() + 45)).toISOString().split('T')[0];
      const data = await api.get(`/horarios?fecha_inicio=${start}&fecha_fin=${end}`);
      setWorkSchedules(data);
    } catch (e) {
      console.error(e);
      showToast("Error al cargar turnos", "error");
    }
  };

  const loadConfig = async () => {
    try {
      const hours = await api.get('/configuracion/horario-bar');
      setStoreHours(hours);
      setEditingStoreHours(JSON.parse(JSON.stringify(hours)));

      const cobs = await api.get('/configuracion/coberturas');
      setCoberturas(cobs);

      const fests = await api.get('/configuracion/festivos');
      setFestivos(fests);

      const temps = await api.get('/configuracion/temporadas');
      setTemporadas(temps);
      if (temps.length > 0) {
        // Set default to "Todo el Año" or first
        const defaultTemp = temps.find(t => t.es_defecto) || temps[0];
        setActiveTemporadaId(defaultTemp.id);
      }

      const empresaData = await api.get('/configuracion/empresa');
      setEmpresa(empresaData);

      const smtpData = await api.get('/configuracion/smtp');
      setSmtp(smtpData);

      const closuresData = await api.get('/configuracion/cierres');
      setCierres(closuresData);

      const turnosData = await api.get('/configuracion/turnos');
      setTurnos(turnosData);
    } catch (e) {
      console.error(e);
      showToast("Error al cargar configuraciones", "error");
    }
  };

  const loadConfigForTemporada = async (tempId) => {
    try {
      const hours = await api.get(`/configuracion/horario-bar?temporada_id=${tempId}`);
      setStoreHours(hours);
      
      const cobs = await api.get(`/configuracion/coberturas?temporada_id=${tempId}`);
      setCoberturas(cobs);

      const turnosData = await api.get(`/configuracion/turnos?temporada_id=${tempId}`);
      setTurnos(turnosData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTemporadaId) {
      loadConfigForTemporada(activeTemporadaId);
    }
  }, [activeTemporadaId]);

  useEffect(() => {
    loadEmployees();
    loadConfig();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [selectedWeek, scheduleViewMode]);

  useEffect(() => {
    if (isRefuerzosModalOpen && turnos.length > 0) {
      setCoverageForm(prev => ({ ...prev, turno: turnos[0].nombre }));
    }
  }, [isRefuerzosModalOpen, turnos]);

  // Date generators for weekly view
  const getDaysOfWeek = (monStr) => {
    const res = [];
    const mon = new Date(monStr);
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday
      res.push({
        name: dayNames[i],
        dateStr: d.toISOString().split('T')[0],
        dateFormatted: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        dayOfWeek: dayOfWeek === 0 ? 6 : dayOfWeek - 1 // map to 0=Monday, 6=Sunday
      });
    }
    return res;
  };

  // Date generator for monthly view
  const getDaysOfMonth = (refDateStr) => {
    const refDate = new Date(refDateStr);
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    
    // First day of month
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0=Sunday, 1=Monday
    const startShift = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // days to display from prev month

    const days = [];
    // Previous month filler
    for (let i = startShift; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        dateFormatted: d.getDate().toString(),
        isCurrentMonth: false,
        dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1
      });
    }
    // Current month days
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      const d = new Date(year, month, i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        dateFormatted: i.toString(),
        isCurrentMonth: true,
        dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1
      });
    }
    // Next month filler
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        dateFormatted: d.getDate().toString(),
        isCurrentMonth: false,
        dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1
      });
    }
    return days;
  };

  const calculateShiftHours = (inicio, fin) => {
    if (!inicio || !fin) return 0.0;
    try {
      const [h1, m1] = inicio.split(':').map(Number);
      const [h2, m2] = fin.split(':').map(Number);
      let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
      if (diff < 0) diff += 24; // overlaps to next day
      return diff;
    } catch {
      return 0.0;
    }
  };

  // Summary logic of hours per employee
  const getWeeklyHoursSummary = () => {
    const summary = employees.filter(e => e.estado === 'Activo').map(emp => {
      let shiftsToCount = [];
      let totalContract = emp.horas_semanales || 40.0;
      
      if (scheduleViewMode === 'monthly') {
        const days = getDaysOfMonth(selectedWeek);
        const start = days[0].dateStr;
        const end = days[days.length - 1].dateStr;
        shiftsToCount = workSchedules.filter(s => s.empleado_id === emp.id && s.fecha >= start && s.fecha <= end && !['Baja', 'Vacaciones', 'Permiso', 'Libre'].includes(s.turno));
        // Scale contract up to match the number of weeks displayed
        totalContract = parseFloat((totalContract * (days.length / 7.0)).toFixed(1));
      } else {
        const days = getDaysOfWeek(selectedWeek);
        const start = days[0].dateStr;
        const end = days[6].dateStr;
        shiftsToCount = workSchedules.filter(s => s.empleado_id === emp.id && s.fecha >= start && s.fecha <= end && !['Baja', 'Vacaciones', 'Permiso', 'Libre'].includes(s.turno));
      }
      
      const schedHours = shiftsToCount.reduce((acc, curr) => acc + calculateShiftHours(curr.hora_inicio, curr.hora_fin), 0);
      
      return {
        id: emp.id,
        name: emp.nombre,
        puesto: emp.puesto,
        scheduled: schedHours,
        contract: totalContract
      };
    });
    return summary.sort((a, b) => b.scheduled - a.scheduled);
  };

  // RESTRICTIONS AND VACATIONS
  const fetchEmployeeRestrictions = async (empId) => {
    try {
      const data = await api.get(`/empleados/${empId}/restricciones`);
      setRestrictions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFixedSchedules = async (empId) => {
    try {
      const data = await api.get(`/empleados/${empId}/horarios-fijos`);
      setFixedSchedules(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployeeVacations = async (empId) => {
    try {
      const data = await api.get(`/empleados/${empId}/vacaciones`);
      setEmployeeVacations(data);
    } catch (e) {
      console.error(e);
    }
  };

  // HANDLERS
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!employeeForm.nombre || !employeeForm.id) return;
    try {
      await api.post('/empleados', employeeForm);
      showToast("Empleado guardado con éxito", "success");
      setIsEmployeeModalOpen(false);
      loadEmployees();
    } catch (err) {
      showToast(err.message || "Fallo al guardar empleado", "error");
    }
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    try {
      await api.post('/horarios', shiftForm);
      showToast("Turno guardado con éxito", "success");
      setIsShiftModalOpen(false);
      loadSchedules();
    } catch (err) {
      showToast("Fallo al guardar turno", "error");
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este turno?")) return;
    try {
      await api.delete(`/horarios/${id}`);
      showToast("Turno eliminado", "success");
      loadSchedules();
    } catch (e) {
      showToast("Error al eliminar turno", "error");
    }
  };

  const handleGenerateMonth = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const refStr = `${generateYear}-${generateMonth.toString().padStart(2, '0')}-01`;
      await api.post('/horarios/generar-mes', { fecha_referencia: refStr });
      showToast("Horarios mensuales generados correctamente", "success");
      setIsGenerateModalOpen(false);
      loadSchedules();
      loadEmployees();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Fallo al ejecutar generador de cuadrantes", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Coberturas rules handlers
  const handleSaveCoverage = async (e) => {
    e.preventDefault();
    try {
      // If turno changed, delete the old turno's records for these days
      if (coverageForm.oldTurno && coverageForm.oldTurno !== coverageForm.turno) {
        const daysToClean = coverageType === 'weekday' ? coverageForm.dias_semana : [];
        if (daysToClean.length > 0) {
          const cobsToDelete = coberturas.filter(c => 
            daysToClean.includes(c.dia_semana) && 
            c.turno === coverageForm.oldTurno && 
            !c.fecha
          );
          await Promise.all(cobsToDelete.map(c => api.delete(`/configuracion/coberturas/${c.id}`)));
        }
      }

      const puestos = ['Sala', 'Barra', 'Cocinero', 'Encargado', 'Limpieza'];
      for (const p of puestos) {
        const cant = coverageForm.cantidades[p];
        // Send even if cant is 0, so backend can delete it
        if (coverageType === 'weekday') {
          for (const dia of coverageForm.dias_semana) {
            const payload = {
              temporada_id: activeTemporadaId,
              dia_semana: dia,
              fecha: null,
              descripcion: null,
              turno: coverageForm.turno,
              puesto: p,
              cantidad: cant
            };
            await api.post('/configuracion/coberturas', payload);
          }
        } else {
          const payload = {
            temporada_id: activeTemporadaId,
            dia_semana: null,
            fecha: coverageForm.fecha,
            descripcion: coverageForm.descripcion,
            turno: coverageForm.turno,
            puesto: p,
            cantidad: cant
          };
          await api.post('/configuracion/coberturas', payload);
        }
      }
      showToast("Reglas de cobertura guardadas", "success");
      setCoverageForm({ id: null, oldTurno: null, dias_semana: [0], fecha: '', turno: turnos.length > 0 ? turnos[0].nombre : 'Mañana', cantidades: { Sala: 1, Barra: 1, Cocinero: 1, Encargado: 1, Limpieza: 0 }, descripcion: '' });
      loadConfigForTemporada(activeTemporadaId);
    } catch (err) {
      showToast("Error al guardar coberturas", "error");
    }
  };

  const handleDeleteCoverage = async (id) => {
    try {
      await api.delete(`/configuracion/coberturas/${id}`);
      showToast("Regla de cobertura eliminada", "success");
      loadConfigForTemporada(activeTemporadaId);
    } catch (e) {
      showToast("Error al eliminar cobertura", "error");
    }
  };

  const handleDeleteFranjaDay = async (dia_semana, turno_nombre) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la franja "${turno_nombre}" para este día?`)) return;
    try {
      const coberturasToDelete = coberturas.filter(c => c.dia_semana === dia_semana && c.turno === turno_nombre && !c.fecha);
      await Promise.all(coberturasToDelete.map(c => api.delete(`/configuracion/coberturas/${c.id}`)));
      showToast("Franja eliminada", "success");
      loadConfigForTemporada(activeTemporadaId);
    } catch (e) {
      showToast("Error al eliminar la franja", "error");
    }
  };

  // Holidays handlers
  const handleSaveFestivo = async (e) => {
    e.preventDefault();
    try {
      await api.post('/configuracion/festivos', festivoForm);
      showToast("Día festivo guardado", "success");
      setFestivoForm({ id: null, fecha: '', descripcion: '' });
      loadConfig();
    } catch (err) {
      showToast(err.message || "Error al guardar festivo", "error");
    }
  };

  const handleDeleteFestivo = async (id) => {
    try {
      await api.delete(`/configuracion/festivos/${id}`);
      showToast("Día festivo eliminado", "success");
      loadConfig();
    } catch (e) {
      showToast("Error al eliminar festivo", "error");
    }
  };

  // Cierres handlers
  const handleSaveCierre = async (e) => {
    e.preventDefault();
    try {
      await api.post('/configuracion/cierres', cierreForm);
      showToast("Periodo de cierre guardado", "success");
      setCierreForm({ id: null, fecha_inicio: '', fecha_fin: '', motivo: '' });
      loadConfig();
    } catch (err) {
      showToast("Error al guardar cierre", "error");
    }
  };

  const handleDeleteCierre = async (id) => {
    try {
      await api.delete(`/configuracion/cierres/${id}`);
      showToast("Periodo de cierre eliminado", "success");
      loadConfig();
    } catch (e) {
      showToast("Error al eliminar cierre", "error");
    }
  };

  const handleSaveTurno = async (e) => {
    e.preventDefault();
    try {
      await api.post('/configuracion/turnos', { ...turnoForm, temporada_id: activeTemporadaId });
      showToast("Turno guardado correctamente", "success");
      setTurnoForm({ id: null, nombre: '', hora_inicio: '09:00', hora_fin: '16:00' });
      loadConfigForTemporada(activeTemporadaId);
    } catch (err) {
      showToast("Error al guardar turno", "error");
    }
  };

  const handleDeleteTurno = async (id) => {
    try {
      await api.delete(`/configuracion/turnos/${id}`);
      showToast("Turno eliminado", "success");
      loadConfigForTemporada(activeTemporadaId);
    } catch (err) {
      showToast("Error al eliminar turno", "error");
    }
  };

  // Save Bar Hours configuration
  const handleSaveStoreHours = async (e) => {
    e.preventDefault();
    try {
      if (!barHoursForm.dias_semana || barHoursForm.dias_semana.length === 0) {
        showToast("Selecciona al menos un día", "error");
        return;
      }
      
      const payloadBase = {
        ...barHoursForm,
        temporada_id: activeTemporadaId,
        hora_apertura: barHoursForm.abierto ? barHoursForm.hora_apertura : null,
        hora_cierre: barHoursForm.abierto ? barHoursForm.hora_cierre : null
      };

      // Si es una edición de un registro existente, solo guardamos ese
      if (barHoursForm.id) {
        await api.post('/configuracion/horario-bar', { ...payloadBase, dia_semana: barHoursForm.dias_semana[0] });
      } else {
        // Si es nuevo, creamos uno por cada día seleccionado
        await Promise.all(barHoursForm.dias_semana.map(d => 
          api.post('/configuracion/horario-bar', { ...payloadBase, dia_semana: d })
        ));
      }

      showToast("Horario comercial guardado", "success");
      setBarHoursForm({
        id: null, dias_semana: [], desde: '', hasta: '', abierto: true,
        hora_apertura: '09:00', hora_cierre: '00:00'
      });
      loadConfigForTemporada(activeTemporadaId);
    } catch (err) {
      showToast("Error al guardar horario del bar", "error");
    }
  };

  const handleDeleteStoreHours = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este horario?")) return;
    try {
      await api.delete(`/configuracion/horario-bar/${id}`);
      showToast("Horario comercial eliminado", "success");
      loadConfigForTemporada(activeTemporadaId);
    } catch (e) {
      showToast("Error al eliminar horario", "error");
    }
  };

  // Save Company Config
  const handleSaveEmpresa = async (e) => {
    e.preventDefault();
    try {
      await api.post('/configuracion/empresa', empresa);
      showToast("Datos de empresa guardados", "success");
    } catch (e) {
      showToast("Error al guardar datos de empresa", "error");
    }
  };

  // Save SMTP Config
  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    try {
      await api.post('/configuracion/smtp', smtp);
      showToast("Configuración SMTP guardada con éxito", "success");
    } catch (e) {
      showToast("Error al guardar configuración SMTP", "error");
    }
  };

  const handleSaveRestriction = async (e) => {
    e.preventDefault();
    if (!restrictionForm.fecha) return;
    try {
      await api.post('/restricciones', restrictionForm);
      showToast("Restricción guardada con éxito", "success");
      setRestrictionForm({ id: null, empleado_id: selectedPrefsEmployee.id, fecha: '', hora_inicio: '', hora_fin: '', descripcion: '' });
      fetchEmployeeRestrictions(selectedPrefsEmployee.id);
    } catch (err) {
      showToast("Error al guardar restricción", "error");
    }
  };

  const handleDeleteRestriction = async (id) => {
    try {
      await api.delete(`/restricciones/${id}`);
      showToast("Restricción eliminada", "success");
      fetchEmployeeRestrictions(selectedPrefsEmployee.id);
    } catch (e) {
      showToast("Error al eliminar restricción", "error");
    }
  };

  const handleSaveFixedSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/horarios-fijos', fixedScheduleForm);
      showToast("Horario guardado", "success");
      setFixedScheduleForm({ id: null, empleado_id: selectedPrefsEmployee.id, dia_semana: 0, hora_inicio: '09:00', hora_fin: '17:00', tipo: 'Fijo' });
      fetchFixedSchedules(selectedPrefsEmployee.id);
    } catch (err) {
      showToast("Error al guardar horario", "error");
    }
  };

  const handleDeleteFixedSchedule = async (id) => {
    try {
      await api.delete(`/horarios-fijos/${id}`);
      showToast("Horario fijo eliminado", "success");
      fetchFixedSchedules(selectedPrefsEmployee.id);
    } catch (e) {
      showToast("Error al eliminar horario fijo", "error");
    }
  };

  const handleSaveTemporada = async (e) => {
    e.preventDefault();
    try {
      if (temporadaForm.id) {
        await api.put(`/configuracion/temporadas/${temporadaForm.id}`, temporadaForm);
      } else {
        await api.post('/configuracion/temporadas', temporadaForm);
      }
      showToast("Temporada guardada", "success");
      setTemporadaForm({ id: null, nombre: '', fecha_inicio: '', fecha_fin: '', es_defecto: false });
      
      const temps = await api.get('/configuracion/temporadas');
      setTemporadas(temps);
    } catch (err) {
      showToast("Error al guardar temporada", "error");
    }
  };

  const handleDeleteTemporada = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta temporada y todos sus horarios/coberturas asociadas?")) return;
    try {
      await api.delete(`/configuracion/temporadas/${id}`);
      showToast("Temporada eliminada", "success");
      const temps = await api.get('/configuracion/temporadas');
      setTemporadas(temps);
      if (activeTemporadaId === id && temps.length > 0) {
        setActiveTemporadaId(temps[0].id);
      }
    } catch (e) {
      showToast("Error al eliminar temporada", "error");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 relative">
      
      {/* Toast container */}
      <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none max-w-sm">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto ${
              t.type === 'success' ? 'bg-emerald-950/90 border-emerald-900/50 text-emerald-400' :
              t.type === 'error' ? 'bg-rose-950/90 border-rose-900/50 text-rose-450' : 'bg-slate-900/90 border-slate-800 text-slate-300'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={18}/> : t.type === 'error' ? <AlertCircle size={18}/> : <Clock size={18}/>}
            <span className="text-xs font-bold">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-6 h-full shrink-0">
        <div className="space-y-8">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3.5 px-4 pt-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-indigo-650 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
              A
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 tracking-tight leading-none">Aterpe Bar</h2>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1 inline-block">Staff Planner Pro</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Consola y Fichajes', icon: Clock },
              { id: 'horarios', label: 'Planificador Horarios', icon: CalendarRange },
              { id: 'personal', label: 'Plantilla Personal', icon: Users },
              { id: 'configuracion', label: 'Configuración Bar', icon: Settings },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer group ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <item.icon size={18} className={`mr-4 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer brand info */}
        <div className="border-t border-slate-800/80 pt-6 text-left px-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Servicio API</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-350 font-mono">http://localhost:8000</span>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-950 text-slate-100 flex flex-col min-w-0">
        
        {/* TAB: DASHBOARD & FICHAJES */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 flex-1 flex flex-col text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-100 tracking-tight">Consola de Control</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Fichajes en tiempo real y asistencia diaria del bar</p>
              </div>
              <button 
                onClick={() => setIsFichajeModalOpen(true)}
                className="py-4 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-500/10 flex items-center transition-all cursor-pointer animate-pulse"
              >
                📥 ENTRAR O SALIR DE TURNO (PIN)
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-900/40 rounded-[28px] border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Turno Ahora</p>
                  <h3 className="text-3xl font-black text-slate-100 mt-2 font-mono">
                    {Object.values(presenceStates).filter(p => p.estado === 'Dentro').length}
                  </h3>
                </div>
                <span className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold font-mono">✓</span>
              </div>
              
              <div className="p-6 bg-slate-900/40 rounded-[28px] border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Descanso (Pausa)</p>
                  <h3 className="text-3xl font-black text-slate-100 mt-2 font-mono">
                    {Object.values(presenceStates).filter(p => p.estado === 'En Pausa').length}
                  </h3>
                </div>
                <span className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">☕</span>
              </div>

              <div className="p-6 bg-slate-900/40 rounded-[28px] border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fuera de Servicio</p>
                  <h3 className="text-3xl font-black text-slate-100 mt-2 font-mono">
                    {employees.filter(e => e.estado === 'Activo').length - Object.values(presenceStates).filter(p => p.estado === 'Dentro' || p.estado === 'En Pausa').length}
                  </h3>
                </div>
                <span className="w-10 h-10 rounded-full bg-slate-800/40 border border-slate-700 text-slate-400 flex items-center justify-center font-bold">💤</span>
              </div>
            </div>

            {/* List of active employees presence states */}
            <div className="space-y-4 flex-1">
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Estado de Asistencia del Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {employees.filter(e => e.estado === 'Activo').map(emp => {
                  const stateObj = presenceStates[emp.id] || { estado: 'Fuera', ultimo_fichaje: null };
                  let statusBg = "bg-slate-950/40 border-slate-800 text-slate-400";
                  if (stateObj.estado === 'Dentro') statusBg = "bg-emerald-950/20 border-emerald-900/40 text-emerald-400";
                  if (stateObj.estado === 'En Pausa') statusBg = "bg-amber-950/20 border-amber-900/40 text-amber-400";

                  return (
                    <div key={emp.id} className={`p-5 rounded-[24px] border ${statusBg} flex items-center justify-between transition-all`}>
                      <div className="text-left">
                        <h4 className="font-black text-sm text-slate-200">{emp.nombre}</h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{emp.puesto}</p>
                        
                        {stateObj.ultimo_fichaje ? (
                          <p className="text-[9px] text-slate-400 font-mono mt-2 font-bold">
                            {stateObj.ultimo_fichaje.tipo} a las {stateObj.ultimo_fichaje.hora}
                          </p>
                        ) : (
                          <p className="text-[9px] text-slate-500 font-bold italic mt-2">Sin actividad hoy</p>
                        )}
                      </div>

                      <div className="flex flex-col items-center">
                        <span className={`w-3.5 h-3.5 rounded-full ${
                          stateObj.estado === 'Dentro' ? 'bg-emerald-500 animate-pulse' :
                          stateObj.estado === 'En Pausa' ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'
                        }`}></span>
                        <span className="text-[8px] font-black uppercase tracking-wider mt-1 text-slate-500">{stateObj.estado}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLANIFICADOR HORARIOS */}
        {activeTab === 'horarios' && (
          <SchedulerTab
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            scheduleViewMode={scheduleViewMode}
            setScheduleViewMode={setScheduleViewMode}
            setGenerateMonth={setGenerateMonth}
            setGenerateYear={setGenerateYear}
            setIsGenerateModalOpen={setIsGenerateModalOpen}
            employees={employees}
            setEmployeeForm={setEmployeeForm}
            setEditingEmployeeId={setEditingEmployeeId}
            setIsEmployeeModalOpen={setIsEmployeeModalOpen}
            fetchFestivos={loadConfig}
            setIsFestivosModalOpen={setIsFestivosModalOpen}
            setIsCierresTiendaModalOpen={setIsCierresTiendaModalOpen}
            getWeeklyHoursSummary={getWeeklyHoursSummary}
            setSelectedPrefsEmployee={setSelectedPrefsEmployee}
            fetchEmployeeRestrictions={fetchEmployeeRestrictions}
            fetchFixedSchedules={fetchFixedSchedules}
            fetchEmployeeVacations={fetchEmployeeVacations}
            setIsEmployeePrefsModalOpen={setIsEmployeePrefsModalOpen}
            setIsEmployeeHoursModalOpen={setIsEmployeeHoursModalOpen}
            storeHours={storeHours}
            workSchedules={workSchedules}
            festivos={festivos}
            getDaysOfWeek={getDaysOfWeek}
            getDaysOfMonth={getDaysOfMonth}
            calculateShiftHours={calculateShiftHours}
            setShiftForm={setShiftForm}
            setIsShiftModalOpen={setIsShiftModalOpen}
            handleDeleteShift={handleDeleteShift}
            setIsPresenceAuditModalOpen={setIsPresenceAuditModalOpen}
            setIsPrePayrollModalOpen={setIsPrePayrollModalOpen}
          />
        )}

        {/* TAB: PLANTILLA PERSONAL */}
        {activeTab === 'personal' && (
          <div className="space-y-6 text-left flex-1 flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-100 tracking-tight">Plantilla del Personal</h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión del equipo, contratos, puestos y credenciales PIN</p>
              </div>
              <button 
                onClick={() => {
                  let nextId = 'E-001';
                  if (employees.length > 0) {
                    const eIds = employees.map(e => parseInt(e.id.replace('E-', '')) || 0);
                    const maxId = Math.max(...eIds);
                    nextId = `E-${String(maxId + 1).padStart(3, '0')}`;
                  }
                  setEmployeeForm({ 
                    id: nextId, nombre: '', puesto: 'Sala', roles_adicionales: '', dias_permitidos: '0,1,2,3,4,5,6', telefono: '', email: '', 
                    horas_semanales: 40, pin: '', nif: '', nass: '', direccion: '', 
                    iban: '', fecha_nacimiento: '', fecha_alta: '', tipo_contrato: 'Indefinido', 
                    salario_base: 0, vacaciones_totales: 30, dias_libre_disposicion_totales: 2, 
                    preferencia_turno: 'Alterno'
                  }); 
                  setEditingEmployeeId(null); 
                  setIsEmployeeModalOpen(true);
                }}
                className="py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center transition-all cursor-pointer shadow-lg shadow-indigo-500/10"
              >
                <Plus size={16} className="mr-1.5"/> Añadir Empleado
              </button>
            </div>

            {/* List of employees */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
              {employees.filter(e => e.estado === 'Activo').map(emp => (
                <div key={emp.id} className="p-6 bg-slate-900/40 rounded-[28px] border border-slate-800 flex flex-col justify-between text-left space-y-4 hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-base text-slate-100">{emp.nombre}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Briefcase size={12} className="text-slate-600"/> {emp.puesto} (ID: {emp.id})
                        </span>
                        {emp.roles_adicionales && emp.roles_adicionales.split(',').filter(Boolean).map(role => (
                          <span key={role} className="text-[8px] font-black text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            + {role}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <span>Disponibilidad: </span>
                        <span className="text-slate-350">
                          {(() => {
                            if (!emp.dias_permitidos) return 'Completa (L-D)';
                            const days = emp.dias_permitidos.split(',').map(d => parseInt(d.trim()));
                            if (days.length === 7) return 'Completa (L-D)';
                            if (days.length === 0) return 'Ninguno (Inactivo)';
                            const dayNamesShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                            return days.map(d => dayNamesShort[d]).join(', ');
                          })()}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-black text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-2.5 py-0.5 rounded-full">
                      PIN: {emp.pin || '—'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-bold text-slate-400 pt-2 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-600 shrink-0"/> <span>{emp.telefono || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-600 shrink-0 truncate"/> <span className="truncate">{emp.email || 'Sin correo'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-600 shrink-0"/> <span className="truncate">{emp.direccion || 'Sin dirección'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800/50">
                    <button 
                      onClick={() => {
                        setEmployeeForm(emp);
                        setEditingEmployeeId(emp.id);
                        setIsEmployeeModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Editar Ficha
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedPrefsEmployee(emp);
                        fetchEmployeeRestrictions(emp.id);
                        fetchFixedSchedules(emp.id);
                        fetchEmployeeVacations(emp.id);
                        setIsEmployeePrefsModalOpen(true);
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      title="Disponibilidad, vacaciones e incidencias"
                    >
                      Preferencia / Ausencias
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm(`¿Seguro que deseas archivar a ${emp.nombre}?`)) {
                          await api.delete(`/empleados/${emp.id}`);
                          showToast("Empleado archivado", "success");
                          loadEmployees();
                        }
                      }}
                      className="p-2 bg-slate-800 hover:bg-rose-950/20 text-rose-500 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 rounded-xl transition-all cursor-pointer"
                      title="Archivar empleado"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACION */}
        {activeTab === 'configuracion' && (
          <div className="space-y-8 text-left max-w-4xl">
            <div className="border-b border-slate-800 pb-6">
              <h1 className="text-3xl font-black text-slate-100 tracking-tight">Configuración del Bar</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Horarios comerciales, coberturas de plantilla por puesto y SMTP</p>
            </div>

            {/* Grid forms */}
            <div className="space-y-8">
              
              {/* Form 1: Empresa Config */}
              <form onSubmit={handleSaveEmpresa} className="p-6 bg-slate-900/40 rounded-[28px] border border-slate-800 space-y-4">
                <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Perfil de la Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Nombre Comercial</label>
                    <input type="text" value={empresa.nombre} onChange={e => setEmpresa({...empresa, nombre: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">NIF / CIF</label>
                    <input type="text" value={empresa.nif} onChange={e => setEmpresa({...empresa, nif: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Dirección Física</label>
                    <input type="text" value={empresa.direccion} onChange={e => setEmpresa({...empresa, direccion: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Teléfono de contacto</label>
                    <input type="text" value={empresa.telefono} onChange={e => setEmpresa({...empresa, telefono: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                </div>
                <button type="submit" className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer">
                  Guardar Perfil
                </button>
              </form>

              {/* Form 2: SMTP Config */}
              <form onSubmit={handleSaveSmtp} className="p-6 bg-slate-900/40 rounded-[28px] border border-slate-800 space-y-4">
                <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Servidor SMTP de Correo (Notificación Horaria)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Servidor SMTP (Host)</label>
                    <input type="text" value={smtp.smtp_server} onChange={e => setSmtp({...smtp, smtp_server: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Puerto</label>
                    <input type="number" value={smtp.smtp_port} onChange={e => setSmtp({...smtp, smtp_port: parseInt(e.target.value) || 587})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Email Remitente</label>
                    <input type="email" value={smtp.email_remitente} onChange={e => setSmtp({...smtp, email_remitente: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Usuario SMTP</label>
                    <input type="text" value={smtp.smtp_user} onChange={e => setSmtp({...smtp, smtp_user: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Contraseña SMTP</label>
                    <input type="password" value={smtp.smtp_password} onChange={e => setSmtp({...smtp, smtp_password: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                </div>
                <button type="submit" className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer">
                  Guardar SMTP
                </button>
              </form>

              {/* Form 3: Configuración Semanal Visual */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Planificación Semanal</h3>
                    <p className="text-[10px] text-slate-550 font-bold uppercase tracking-widest mt-1">Horarios y Coberturas por Temporada</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporada:</label>
                    <div className="flex gap-1">
                      <select 
                        value={activeTemporadaId || ''} 
                        onChange={e => setActiveTemporadaId(parseInt(e.target.value))}
                        className="border border-slate-750 p-2 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none min-w-[150px]"
                      >
                        {temporadas.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setIsTemporadasModalOpen(true)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl cursor-pointer"
                        title="Gestionar Temporadas"
                      >
                        <Settings size={14}/>
                      </button>
                    </div>
                  </div>
                </div>

                <ConfigWeeklyCalendar 
                  temporada={temporadas.find(t => t.id === activeTemporadaId)}
                  storeHours={storeHours}
                  turnos={turnos}
                  coberturas={coberturas}
                  onAddGlobalHours={() => {
                    setBarHoursForm({ id: null, dias_semana: [], abierto: true, hora_apertura: '09:00', hora_cierre: '00:00' });
                    setIsStoreHoursModalOpen(true);
                  }}
                  onEditDayHours={(dayId, currentHours) => {
                    setBarHoursForm({ ...currentHours, dias_semana: [dayId] });
                    setIsStoreHoursModalOpen(true);
                  }}
                  onAddTurnoToDay={(dayId, existingTurnoNombre) => {
                    const newCantidades = { Sala: 0, Barra: 0, Cocinero: 0, Encargado: 0, Limpieza: 0 };
                    let descripcion = '';
                    if (existingTurnoNombre) {
                      const existingCobs = coberturas.filter(c => c.dia_semana === dayId && c.turno === existingTurnoNombre && !c.fecha);
                      existingCobs.forEach(c => {
                        newCantidades[c.puesto] = c.cantidad;
                        if (c.descripcion) descripcion = c.descripcion;
                      });
                    } else {
                      newCantidades.Sala = 1;
                      newCantidades.Barra = 1;
                      newCantidades.Cocinero = 1;
                      newCantidades.Encargado = 1;
                    }

                    setCoverageForm({
                      id: null,
                      oldTurno: existingTurnoNombre || null,
                      dias_semana: [dayId],
                      fecha: '',
                      turno: existingTurnoNombre || (turnos.length > 0 ? turnos[0].nombre : 'Mañana'),
                      cantidades: newCantidades,
                      descripcion: descripcion
                    });
                    setCoverageType('weekday');
                    setIsRefuerzosModalOpen(true);
                  }}
                  onDeleteFranjaDay={handleDeleteFranjaDay}
                  onManageTurnos={() => setIsTurnosModalOpen(true)}
                />
              </div>

            </div>
          </div>
        )}
      </main>

      {/* --- ALL MODALS INTEGRATED --- */}
      
      {/* 1. Clock-in PIN pad modal */}
      <FichajePinPadModal 
        isOpen={isFichajeModalOpen}
        onClose={() => setIsFichajeModalOpen(false)}
        employees={employees}
        showToast={showToast}
        onSuccess={loadEmployees}
      />

      {/* 2. Leaves & vacations modal */}
      <IncidenciasEmpleadoModal
        isOpen={isIncidenciasModalOpen}
        onClose={() => setIsIncidenciasModalOpen(false)}
        employee={selectedPrefsEmployee}
        showToast={showToast}
        onSuccess={() => {
          loadEmployees();
          loadSchedules();
        }}
      />

      {/* 3. Pre-Payroll modal */}
      <PrePayrollModal 
        isOpen={isPrePayrollModalOpen}
        onClose={() => setIsPrePayrollModalOpen(false)}
        showToast={showToast}
      />

      {/* 4. Clock-ins audit modal */}
      <AuditoriaFichajesModal
        isOpen={isPresenceAuditModalOpen}
        onClose={() => setIsPresenceAuditModalOpen(false)}
        employees={employees}
        showToast={showToast}
        onSuccess={loadEmployees}
      />

      {/* 5. Auto scheduler wizard modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleGenerateMonth} className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] max-w-sm w-full space-y-4 text-left">
            <h3 className="text-lg font-black text-slate-100 tracking-tight">Auto-Generar Horario Mensual</h3>
            <p className="text-xs text-slate-400">El algoritmo planificará automáticamente los turnos del mes seleccionado basándose en las coberturas del bar, descansos de 12h y preferencias.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mes</label>
                <select value={generateMonth} onChange={e => setGenerateMonth(parseInt(e.target.value))} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none">
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((mName, idx) => (
                    <option key={mName} value={idx + 1}>{mName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Año</label>
                <select value={generateYear} onChange={e => setGenerateYear(parseInt(e.target.value))} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none">
                  {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={isGenerating} className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer disabled:opacity-50">
                {isGenerating ? 'Generando...' : 'Generar cuadrante'}
              </button>
              <button type="button" onClick={() => setIsGenerateModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                Cerrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Employee CRUD Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-100 tracking-tight text-left">
                {editingEmployeeId ? 'Editar Ficha de Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 rounded-xl cursor-pointer">
                <X size={16}/>
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Información Básica</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID Empleado</label>
                    <input type="text" value={employeeForm.id} onChange={e => setEmployeeForm({...employeeForm, id: e.target.value})} disabled={!!editingEmployeeId} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono disabled:opacity-50" required/>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                    <input type="text" value={employeeForm.nombre} onChange={e => setEmployeeForm({...employeeForm, nombre: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none" required/>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Puesto / Rol Principal</label>
                    <select 
                      value={employeeForm.puesto} 
                      onChange={e => {
                        const newPuesto = e.target.value;
                        const additionalRolesList = employeeForm.roles_adicionales 
                          ? employeeForm.roles_adicionales.split(',').map(r => r.trim())
                          : [];
                        const filteredAdditional = additionalRolesList.filter(r => r !== newPuesto);
                        setEmployeeForm({
                          ...employeeForm,
                          puesto: newPuesto,
                          roles_adicionales: filteredAdditional.join(',')
                        });
                      }} 
                      className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none"
                    >
                      <option value="Sala">Sala / Servicio Mesas</option>
                      <option value="Barra">Barra / Coctelería</option>
                      <option value="Cocinero">Cocinero / Cocina</option>
                      <option value="Encargado">Encargado / Maître</option>
                      <option value="Limpieza">Personal Limpieza</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Preferencia Turno</label>
                    <select value={employeeForm.preferencia_turno} onChange={e => setEmployeeForm({...employeeForm, preferencia_turno: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none">
                      <option value="Alterno">Turno Alterno / Rotativo</option>
                      <option value="Mañanas">Mañanas</option>
                      <option value="Tardes">Tardes</option>
                      <option value="Noches">Noches</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">PIN Fichaje (4 dígitos)</label>
                    <input type="text" maxLength={4} placeholder="Ej. 1234" value={employeeForm.pin || ''} onChange={e => setEmployeeForm({...employeeForm, pin: e.target.value.replace(/\D/g, '')})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono" required/>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Puestos / Roles Adicionales Habilitados</label>
                  <div className="flex flex-wrap gap-4 bg-slate-950/20 p-4 rounded-xl border border-slate-800">
                    {['Sala', 'Barra', 'Cocinero', 'Encargado', 'Limpieza']
                      .filter(role => role !== employeeForm.puesto)
                      .map(role => {
                        const additionalRolesList = employeeForm.roles_adicionales 
                          ? employeeForm.roles_adicionales.split(',').map(r => r.trim())
                          : [];
                        const isChecked = additionalRolesList.includes(role);
                        return (
                          <label key={role} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-350 select-none">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let newList;
                                if (e.target.checked) {
                                  newList = [...additionalRolesList, role];
                                } else {
                                  newList = additionalRolesList.filter(r => r !== role);
                                }
                                setEmployeeForm({
                                  ...employeeForm,
                                  roles_adicionales: newList.join(',')
                                });
                              }}
                              className="rounded border-slate-750 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            {role}
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Días de la Semana Habilitados / Disponibles</label>
                  <div className="flex flex-wrap gap-4 bg-slate-950/20 p-4 rounded-xl border border-slate-800">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, idx) => {
                      const allowedDaysList = employeeForm.dias_permitidos 
                        ? employeeForm.dias_permitidos.split(',').map(d => parseInt(d.trim()))
                        : [0, 1, 2, 3, 4, 5, 6];
                      const isChecked = allowedDaysList.includes(idx);
                      return (
                        <label key={idx} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-350 select-none">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let newList;
                              if (e.target.checked) {
                                newList = [...allowedDaysList, idx];
                              } else {
                                newList = allowedDaysList.filter(d => d !== idx);
                              }
                              newList.sort((a, b) => a - b);
                              setEmployeeForm({
                                ...employeeForm,
                                dias_permitidos: newList.join(',')
                              });
                            }}
                            className="rounded border-slate-750 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                          {dayName}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Laboral Info */}
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Condiciones Laborales y Contacto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Horas Semanales</label>
                    <input type="number" value={employeeForm.horas_semanales} onChange={e => setEmployeeForm({...employeeForm, horas_semanales: parseFloat(e.target.value) || 0})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contrato</label>
                    <select value={employeeForm.tipo_contrato} onChange={e => setEmployeeForm({...employeeForm, tipo_contrato: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none">
                      <option value="Indefinido">Indefinido</option>
                      <option value="Temporal">Temporal</option>
                      <option value="Formación">Prácticas / Formación</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Salario Base Mensual</label>
                    <input type="number" value={employeeForm.salario_base} onChange={e => setEmployeeForm({...employeeForm, salario_base: parseFloat(e.target.value) || 0})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Teléfono Movil</label>
                    <input type="text" value={employeeForm.telefono || ''} onChange={e => setEmployeeForm({...employeeForm, telefono: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                    <input type="email" value={employeeForm.email || ''} onChange={e => setEmployeeForm({...employeeForm, email: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">NIF / NIE</label>
                    <input type="text" value={employeeForm.nif || ''} onChange={e => setEmployeeForm({...employeeForm, nif: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nº Afiliación NASS</label>
                    <input type="text" value={employeeForm.nass || ''} onChange={e => setEmployeeForm({...employeeForm, nass: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cuenta Bancaria IBAN</label>
                    <input type="text" value={employeeForm.iban || ''} onChange={e => setEmployeeForm({...employeeForm, iban: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none font-mono"/>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dirección Postal</label>
                  <input type="text" value={employeeForm.direccion || ''} onChange={e => setEmployeeForm({...employeeForm, direccion: e.target.value})} className="w-full border border-slate-755 p-2.5 rounded-xl bg-slate-950/40 text-xs font-bold text-slate-200 outline-none"/>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex gap-2">
                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  Guardar Ficha
                </button>
                <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                  Cerrar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. Employee Preferences and Restrictions Modal */}
      {isEmployeePrefsModalOpen && selectedPrefsEmployee && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] text-left text-slate-100">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-slate-100 tracking-tight">Restricciones y Preferencias: {selectedPrefsEmployee.nombre}</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Preferencia de turno actual: <strong className="text-indigo-400 font-black">{selectedPrefsEmployee.preferencia_turno}</strong></p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEmployeePrefsModalOpen(false);
                    setIsIncidenciasModalOpen(true);
                  }}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Registrar Vacaciones / Bajas
                </button>
                <button onClick={() => setIsEmployeePrefsModalOpen(false)} className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 rounded-xl cursor-pointer">
                  <X size={16}/>
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: List restrictions */}
              <div className="w-full md:w-1/2 p-6 border-r border-slate-800 overflow-y-auto max-h-[35vh] md:max-h-[none]">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mb-4">Restricciones Horarias de Disponibilidad</h4>
                <div className="space-y-3">
                  {restrictions.map(r => (
                    <div key={r.id} className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold font-mono text-indigo-400">{r.fecha}</span>
                        {r.hora_inicio && <span className="font-mono text-slate-400 ml-2">({r.hora_inicio} - {r.hora_fin})</span>}
                        {r.descripcion && <p className="text-slate-400 mt-1">{r.descripcion}</p>}
                      </div>
                      
                      {r.id > 0 && (
                        <button 
                          onClick={() => handleDeleteRestriction(r.id)}
                          className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                          title="Eliminar restricción"
                        >
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  ))}
                  {restrictions.length === 0 && (
                    <p className="text-xs text-slate-550 italic py-6">Sin restricciones puntuales de disponibilidad.</p>
                  )}
                </div>

                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider mt-8 mb-4">Horarios Fijos Semanales</h4>
                <div className="space-y-3">
                  {fixedSchedules.map(f => (
                    <div key={f.id} className="p-3.5 bg-slate-850 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold font-mono text-emerald-400">
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][f.dia_semana]}
                        </span>
                        <span className="font-mono text-slate-400 ml-2">({f.hora_inicio} - {f.hora_fin})</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${f.tipo === 'Opcional' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {f.tipo === 'Opcional' ? 'Solo si se necesita' : 'Siempre Fijo'}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteFixedSchedule(f.id)}
                        className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                        title="Eliminar horario fijo"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  ))}
                  {fixedSchedules.length === 0 && (
                    <p className="text-xs text-slate-550 italic py-6">Sin horarios fijos asignados.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Add Restriction Form */}
              <div className="w-full md:w-1/2 p-6 bg-slate-950/20 overflow-y-auto text-left">
                <form onSubmit={handleSaveRestriction} className="space-y-4">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider pb-2 border-b border-slate-800">Añadir Restricción Puntual</h4>
                  
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha</label>
                    <input 
                      type="date" 
                      value={restrictionForm.fecha} 
                      onChange={(e) => setRestrictionForm({...restrictionForm, empleado_id: selectedPrefsEmployee.id, fecha: e.target.value})}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Inicio (Opcional)</label>
                      <input 
                        type="time" 
                        value={restrictionForm.hora_inicio} 
                        onChange={(e) => setRestrictionForm({...restrictionForm, hora_inicio: e.target.value})}
                        className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Fin (Opcional)</label>
                      <input 
                        type="time" 
                        value={restrictionForm.hora_fin} 
                        onChange={(e) => setRestrictionForm({...restrictionForm, hora_fin: e.target.value})}
                        className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Motivo / Descripción</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Examen de Universidad, Médico..."
                      value={restrictionForm.descripcion} 
                      onChange={(e) => setRestrictionForm({...restrictionForm, descripcion: e.target.value})}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    />
                  </div>

                  <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer">
                    Guardar Restricción
                  </button>
                </form>

                <form onSubmit={handleSaveFixedSchedule} className="space-y-4 mt-8">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider pb-2 border-b border-slate-800">Añadir Horario Fijo</h4>
                  
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Día de la semana</label>
                    <select 
                      value={fixedScheduleForm.dia_semana} 
                      onChange={(e) => setFixedScheduleForm({...fixedScheduleForm, empleado_id: selectedPrefsEmployee.id, dia_semana: parseInt(e.target.value)})}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    >
                      <option value={0}>Lunes</option>
                      <option value={1}>Martes</option>
                      <option value={2}>Miércoles</option>
                      <option value={3}>Jueves</option>
                      <option value={4}>Viernes</option>
                      <option value={5}>Sábado</option>
                      <option value={6}>Domingo</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Inicio</label>
                      <input 
                        type="time" 
                        value={fixedScheduleForm.hora_inicio} 
                        onChange={(e) => setFixedScheduleForm({...fixedScheduleForm, hora_inicio: e.target.value})}
                        className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Fin</label>
                      <input 
                        type="time" 
                        value={fixedScheduleForm.hora_fin} 
                        onChange={(e) => setFixedScheduleForm({...fixedScheduleForm, hora_fin: e.target.value})}
                        className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Asignación</label>
                    <select 
                      value={fixedScheduleForm.tipo || 'Fijo'} 
                      onChange={(e) => setFixedScheduleForm({...fixedScheduleForm, tipo: e.target.value})}
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    >
                      <option value="Fijo">Siempre Fijo (Se le asigna obligatoriamente cada semana)</option>
                      <option value="Opcional">Opcional (El generador puede elegirlo si el bar lo necesita)</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer">
                    Añadir Horario Fijo
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Manual Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveShift} className="bg-slate-900 border border-slate-800 p-6 rounded-[28px] max-w-sm w-full space-y-4 text-left">
            <h3 className="text-lg font-black text-slate-100 tracking-tight">
              {shiftForm.id ? 'Editar Turno' : 'Asignar Nuevo Turno'}
            </h3>
            
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trabajador</label>
              <select value={shiftForm.empleado_id} onChange={e => setShiftForm({...shiftForm, empleado_id: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none" required>
                <option value="">-- Selecciona --</option>
                {employees.filter(e => e.estado === 'Activo').map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} ({e.puesto})</option>
                ))}
                <option value="">⚠️ Sin Asignar / Cobertura</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Inicio (HH:MM)</label>
                <input type="time" value={shiftForm.hora_inicio} onChange={e => setShiftForm({...shiftForm, hora_inicio: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono" required/>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Fin (HH:MM)</label>
                <input type="time" value={shiftForm.hora_fin} onChange={e => setShiftForm({...shiftForm, hora_fin: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none font-mono" required/>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Turno Descriptor</label>
              <select value={shiftForm.turno} onChange={e => setShiftForm({...shiftForm, turno: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none">
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
                <option value="Partido">Turno Partido</option>
                <option value="Libre">Libre</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notas del Turno</label>
              <input type="text" value={shiftForm.notas || ''} onChange={e => setShiftForm({...shiftForm, notas: e.target.value})} placeholder="Ej. Refuerzo de terraza, Cocina..." className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-950/50 text-xs font-bold text-slate-200 outline-none"/>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                Guardar Turno
              </button>
              <button type="button" onClick={() => setIsShiftModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                Cerrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 9. Bar Opening Hours Configuration Modal */}
      {isStoreHoursModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-4xl w-full flex flex-col md:flex-row gap-6 max-h-[85vh] text-left">
            
            {/* Right side: Add/Edit form */}
            <form onSubmit={handleSaveStoreHours} className="w-full space-y-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-800 text-left flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    {barHoursForm.id ? 'Editar Horario' : 'Añadir Horario'}
                  </h4>
                  {barHoursForm.id && (
                    <div className="flex gap-4 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteStoreHours(barHoursForm.id);
                          setIsStoreHoursModalOpen(false);
                        }}
                        className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:underline cursor-pointer"
                      >
                        Eliminar Horario
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setBarHoursForm({ id: null, dias_semana: [], abierto: true, hora_apertura: '09:00', hora_cierre: '00:00' })}
                        className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:underline cursor-pointer"
                      >
                        Limpiar / Nuevo
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Días de la Semana</label>
                  <div className="flex flex-wrap gap-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dayChar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const currentDays = barHoursForm.dias_semana || [];
                          if (currentDays.includes(idx)) {
                            if (currentDays.length > 1) {
                              setBarHoursForm({...barHoursForm, dias_semana: currentDays.filter(d => d !== idx)});
                            }
                          } else {
                            // Si estamos editando uno ya creado (tiene id), no permitimos seleccionar varios
                            if (barHoursForm.id) {
                              setBarHoursForm({...barHoursForm, dias_semana: [idx]});
                            } else {
                              setBarHoursForm({...barHoursForm, dias_semana: [...currentDays, idx]});
                            }
                          }
                        }}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-black transition-all border cursor-pointer ${
                          (barHoursForm.dias_semana || []).includes(idx) 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                        }`}
                      >
                        {dayChar}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    id="bh-abierto"
                    checked={barHoursForm.abierto} 
                    onChange={e => setBarHoursForm({...barHoursForm, abierto: e.target.checked})}
                    className="rounded border-slate-750 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="bh-abierto" className="text-xs font-bold text-slate-350 cursor-pointer select-none">
                    Bar Abierto al público este día
                  </label>
                </div>

                {barHoursForm.abierto && (
                  <div className="space-y-3 p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-400">
                      <div>
                        <label className="block text-[8px] font-black uppercase mb-1">Hora de Apertura</label>
                        <input type="time" value={barHoursForm.hora_apertura || ''} onChange={e => setBarHoursForm({...barHoursForm, hora_apertura: e.target.value})} className="w-full border border-slate-750 p-2 rounded-lg bg-slate-900 text-slate-250 font-mono text-xs"/>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black uppercase mb-1">Hora de Cierre</label>
                        <input type="time" value={barHoursForm.hora_cierre || ''} onChange={e => setBarHoursForm({...barHoursForm, hora_cierre: e.target.value})} className="w-full border border-slate-750 p-2 rounded-lg bg-slate-900 text-slate-250 font-mono text-xs"/>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button type="submit" className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  Guardar Horario
                </button>
                <button type="button" onClick={() => setIsStoreHoursModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                  Cerrar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 10. Role Coverages Setup Modal */}
      {isRefuerzosModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-lg w-full flex flex-col gap-6 max-h-[85vh] text-left">
            
            {/* Form */}
            <form onSubmit={handleSaveCoverage} className="w-full space-y-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-800 text-left">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider pb-2 border-b border-slate-800">Añadir Regla de Cobertura</h4>
              
              {/* Type Switcher */}
              <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCoverageType('weekday')}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    coverageType === 'weekday' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Recurrente
                </button>
                <button
                  type="button"
                  onClick={() => setCoverageType('date')}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    coverageType === 'date' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fecha Especial
                </button>
              </div>

              {coverageType === 'weekday' ? (
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Días de la Semana</label>
                  <div className="flex flex-wrap gap-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dayChar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const currentDays = coverageForm.dias_semana;
                          if (currentDays.includes(idx)) {
                            if (currentDays.length > 1) {
                              setCoverageForm({...coverageForm, dias_semana: currentDays.filter(d => d !== idx)});
                            }
                          } else {
                            setCoverageForm({...coverageForm, dias_semana: [...currentDays, idx]});
                          }
                        }}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-black transition-all border cursor-pointer ${
                          coverageForm.dias_semana.includes(idx) 
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                        }`}
                      >
                        {dayChar}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Específica</label>
                    <input 
                      type="date" 
                      value={coverageForm.fecha || ''} 
                      onChange={e => setCoverageForm({...coverageForm, fecha: e.target.value})} 
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción del Evento</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Concierto Local, Partido de Fútbol" 
                      value={coverageForm.descripcion || ''} 
                      onChange={e => setCoverageForm({...coverageForm, descripcion: e.target.value})} 
                      className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Turno del Bar</label>
                <select value={coverageForm.turno} onChange={e => setCoverageForm({...coverageForm, turno: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none">
                  {turnos.map(t => (
                    <option key={t.id} value={t.nombre}>{t.nombre} ({t.hora_inicio} - {t.hora_fin})</option>
                  ))}
                  {turnos.length === 0 && (
                    <>
                      <option value="Mañana">Mañana</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noche">Noche</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Personal Necesario</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Sala', 'Barra', 'Cocinero', 'Encargado', 'Limpieza'].map(p => (
                    <div key={p} className="flex items-center justify-between bg-slate-900 border border-slate-750 p-2 rounded-xl">
                      <span className="text-xs font-bold text-slate-300">{p}</span>
                      <input 
                        type="number" 
                        min={0} 
                        max={10} 
                        value={coverageForm.cantidades[p]} 
                        onChange={e => setCoverageForm({
                          ...coverageForm, 
                          cantidades: { ...coverageForm.cantidades, [p]: parseInt(e.target.value) || 0 }
                        })} 
                        className="w-12 bg-slate-800 border border-slate-700 text-center text-xs font-bold text-slate-200 rounded p-1 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  Guardar Cobertura
                </button>
                <button type="button" onClick={() => setIsRefuerzosModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                  Cerrar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 11. Holiday Calendar Modal */}
      {isFestivosModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-3xl w-full flex flex-col md:flex-row gap-6 max-h-[85vh] text-left">
            
            <div className="w-full md:w-1/2 flex flex-col overflow-y-auto">
              <h3 className="text-lg font-black text-slate-100 tracking-tight mb-2">Festivos Oficiales</h3>
              <div className="space-y-2 flex-1">
                {festivos.map(f => (
                  <div key={f.id} className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold font-mono text-rose-455">{f.fecha}</span>
                      <p className="text-slate-350 mt-1 font-bold">{f.descripcion}</p>
                    </div>
                    <button onClick={() => handleDeleteFestivo(f.id)} className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
                {festivos.length === 0 && (
                  <p className="text-xs text-slate-500 italic py-6">Sin días festivos registrados.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveFestivo} className="w-full md:w-1/2 space-y-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-800 text-left">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider pb-2 border-b border-slate-800">Añadir Festivo</h4>
              
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha</label>
                <input 
                  type="date" 
                  value={festivoForm.fecha} 
                  onChange={(e) => setFestivoForm({...festivoForm, fecha: e.target.value})}
                  className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción</label>
                <input 
                  type="text" 
                  placeholder="Ej. Año Nuevo, Navidad..."
                  value={festivoForm.descripcion} 
                  onChange={(e) => setFestivoForm({...festivoForm, descripcion: e.target.value})}
                  className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-3 bg-indigo-655 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  Añadir Festivo
                </button>
                <button type="button" onClick={() => setIsFestivosModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                  Cerrar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 12. Bar Closures Configuration Modal */}
      {isCierresTiendaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-3xl w-full flex flex-col md:flex-row gap-6 max-h-[85vh] text-left">
            
            <div className="w-full md:w-1/2 flex flex-col overflow-y-auto">
              <h3 className="text-lg font-black text-slate-100 tracking-tight mb-2">Cierres Temporales</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-4">Periodos en los que el bar permanece cerrado al público (ej. reformas, descanso del personal).</p>
              
              <div className="space-y-2 flex-1">
                {cierres.map(c => (
                  <div key={c.id} className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-200 font-mono text-[10px]">{c.fecha_inicio} al {c.fecha_fin}</span>
                      <p className="text-slate-400 mt-1 font-bold">{c.motivo}</p>
                    </div>
                    <button onClick={() => handleDeleteCierre(c.id)} className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
                {cierres.length === 0 && (
                  <p className="text-xs text-slate-500 italic py-6">Sin cierres temporales registrados.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveCierre} className="w-full md:w-1/2 space-y-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-800 text-left">
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider pb-2 border-b border-slate-800">Añadir Cierre</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={cierreForm.fecha_inicio} 
                    onChange={(e) => setCierreForm({...cierreForm, fecha_inicio: e.target.value})}
                    className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Fin</label>
                  <input 
                    type="date" 
                    value={cierreForm.fecha_fin} 
                    onChange={(e) => setCierreForm({...cierreForm, fecha_fin: e.target.value})}
                    className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Motivo / Causa</label>
                <input 
                  type="text" 
                  placeholder="Ej. Obras en cocina, Vacaciones corporativas..."
                  value={cierreForm.motivo} 
                  onChange={(e) => setCierreForm({...cierreForm, motivo: e.target.value})}
                  className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-3 bg-indigo-655 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  Añadir Cierre
                </button>
                <button type="button" onClick={() => setIsCierresTiendaModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                  Cerrar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 13. Temporadas Management Modal */}
      {isTemporadasModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-3xl w-full flex flex-col md:flex-row gap-6 max-h-[85vh] text-left">
            
            <div className="w-full md:w-1/2 flex flex-col overflow-y-auto pr-2">
              <h3 className="text-lg font-black text-slate-100 tracking-tight mb-2">Temporadas</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                Define las diferentes temporadas para configurar horarios del bar y coberturas de turnos distintos.
              </p>
              
              <div className="space-y-2 flex-1">
                {temporadas.map(t => (
                  <div key={t.id} className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{t.nombre}</span>
                        {t.es_defecto && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950/50 text-indigo-400 border border-indigo-900/30">
                            Defecto
                          </span>
                        )}
                      </div>
                      {!t.es_defecto && t.fecha_inicio && t.fecha_fin && (
                        <p className="text-slate-400 mt-1 font-mono text-[10px]">
                          {t.fecha_inicio} a {t.fecha_fin}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setTemporadaForm(t)} 
                        className="p-1 hover:text-indigo-400 text-slate-500 transition-colors cursor-pointer"
                      >
                        <Edit2 size={12}/>
                      </button>
                      <button 
                        onClick={() => handleDeleteTemporada(t.id)} 
                        className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveTemporada} className="w-full md:w-1/2 space-y-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-800 text-left flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    {temporadaForm.id ? 'Editar Temporada' : 'Añadir Temporada'}
                  </h4>
                  {temporadaForm.id && (
                    <button 
                      type="button" 
                      onClick={() => setTemporadaForm({ id: null, nombre: '', fecha_inicio: '', fecha_fin: '', es_defecto: false })}
                      className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:underline cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre de la Temporada</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Verano, Semana Santa, Invierno"
                    value={temporadaForm.nombre} 
                    onChange={e => setTemporadaForm({...temporadaForm, nombre: e.target.value})} 
                    className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    id="t-defecto"
                    checked={temporadaForm.es_defecto} 
                    onChange={e => setTemporadaForm({...temporadaForm, es_defecto: e.target.checked})}
                    className="rounded border-slate-750 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="t-defecto" className="text-xs font-bold text-slate-350 cursor-pointer select-none">
                    Es la temporada por Defecto
                  </label>
                </div>
                
                {!temporadaForm.es_defecto && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Mes-Día Inicio</label>
                      <input 
                        type="text" 
                        placeholder="MM-DD (ej. 06-01)"
                        value={temporadaForm.fecha_inicio || ''} 
                        onChange={e => setTemporadaForm({...temporadaForm, fecha_inicio: e.target.value})} 
                        className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Mes-Día Fin</label>
                      <input 
                        type="text" 
                        placeholder="MM-DD (ej. 08-31)"
                        value={temporadaForm.fecha_fin || ''} 
                        onChange={e => setTemporadaForm({...temporadaForm, fecha_fin: e.target.value})} 
                        className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono" 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button type="submit" className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  Guardar
                </button>
                <button type="button" onClick={() => setIsTemporadasModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14. Turnos Management Modal */}
      {isTurnosModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-3xl w-full flex flex-col md:flex-row gap-6 max-h-[85vh] text-left">
            
            <div className="w-full md:w-1/2 flex flex-col overflow-y-auto pr-2">
              <h3 className="text-lg font-black text-slate-100 tracking-tight mb-2">Turnos Globales</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                Define los turnos (franjas horarias) disponibles para configurar las necesidades de personal en esta temporada.
              </p>
              
              <div className="space-y-2 flex-1">
                {turnos.map(t => (
                  <div key={t.id} className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-200">{t.nombre}</div>
                      <p className="text-slate-400 mt-1 font-mono text-[10px]">
                        {t.hora_inicio} - {t.hora_fin}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setTurnoForm(t)} className="p-1 hover:text-indigo-400 text-slate-500 transition-colors cursor-pointer">
                        <Edit2 size={12}/>
                      </button>
                      <button onClick={() => handleDeleteTurno(t.id)} className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
                {turnos.length === 0 && (
                  <p className="text-[10px] text-slate-600 font-bold italic text-center py-4">No hay turnos creados.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveTurno} className="w-full md:w-1/2 space-y-4 bg-slate-950/20 p-5 rounded-2xl border border-slate-800 text-left flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                  <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    {turnoForm.id ? 'Editar Turno' : 'Añadir Turno'}
                  </h4>
                  {turnoForm.id && (
                    <button type="button" onClick={() => setTurnoForm({ id: null, nombre: '', hora_inicio: '09:00', hora_fin: '16:00' })} className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:underline cursor-pointer">
                      Limpiar
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Turno</label>
                  <input type="text" placeholder="Ej. Mañana, Comidas, Tarde..." value={turnoForm.nombre} onChange={e => setTurnoForm({...turnoForm, nombre: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Inicio</label>
                    <input type="time" value={turnoForm.hora_inicio} onChange={e => setTurnoForm({...turnoForm, hora_inicio: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono" required />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Fin</label>
                    <input type="time" value={turnoForm.hora_fin} onChange={e => setTurnoForm({...turnoForm, hora_fin: e.target.value})} className="w-full border border-slate-750 p-2.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-200 outline-none font-mono" required />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button type="submit" className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  Guardar
                </button>
                <button type="button" onClick={() => setIsTurnosModalOpen(false)} className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700 cursor-pointer">
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEmployeeHoursModalOpen && selectedPrefsEmployee && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] max-w-md w-full flex flex-col text-left shadow-2xl">
            <h3 className="text-xl font-black text-slate-100 tracking-tight mb-1">
              Desglose de Horas: <span className="text-indigo-400">{selectedPrefsEmployee.nombre}</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mb-6 uppercase tracking-wider">
              {new Date(selectedWeek).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </p>

            <div className="space-y-3 flex-1 mb-6">
              {(() => {
                const days = getDaysOfMonth(selectedWeek);
                const weeks = [];
                for (let i = 0; i < days.length; i += 7) {
                  weeks.push(days.slice(i, i + 7));
                }

                let totalMonthHours = 0;

                return (
                  <div className="space-y-4">
                    {weeks.map((week, idx) => {
                      const start = week[0].dateStr;
                      const end = week[week.length - 1].dateStr;
                      
                      const shifts = workSchedules.filter(s => 
                        s.empleado_id === selectedPrefsEmployee.id && 
                        s.fecha >= start && 
                        s.fecha <= end && 
                        !['Baja', 'Vacaciones', 'Permiso', 'Libre'].includes(s.turno)
                      );
                      
                      const schedHours = shifts.reduce((acc, curr) => acc + calculateShiftHours(curr.hora_inicio, curr.hora_fin), 0);
                      
                      // Only add to total if the week actually has days in the current month? 
                      // Or just total all weeks displayed in the grid (which might include a few days from prev/next month)
                      // A typical payroll month is exactly what's shown in the month grid.
                      totalMonthHours += schedHours;

                      return (
                        <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
                          <div>
                            <div className="font-bold text-slate-300 text-xs uppercase tracking-wider">Semana {idx + 1}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {new Date(start).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })} - {new Date(end).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                            </div>
                          </div>
                          <div className={`font-black font-mono text-sm ${schedHours > (selectedPrefsEmployee.horas_semanales || 40) ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {schedHours.toFixed(1)}h
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                      <div className="font-black text-slate-200 uppercase tracking-widest text-sm">Total del Mes</div>
                      <div className="font-black font-mono text-indigo-400 text-xl">{totalMonthHours.toFixed(1)}h</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button 
              onClick={() => setIsEmployeeHoursModalOpen(false)} 
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer border border-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
