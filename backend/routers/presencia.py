from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Dict, Optional
from datetime import datetime, date
from pydantic import BaseModel
import calendar

from database import get_session
from models import Empleado, RegistroFichaje, HorarioTrabajador, IncidenciaEmpleado
from schemas import RegistroFichajeRead, ResumenFichajesDia, PrePayrollSummary

router = APIRouter(tags=["presencia"])

class FicharRequest(BaseModel):
    empleado_id: str
    pin: str
    tipo: str  # "Entrada", "Salida", "Inicio Pausa", "Fin Pausa"
    dispositivo: Optional[str] = "TPV"
    notas: Optional[str] = None

# Helper to calculate worked hours from punches
def calculate_working_hours(punches: List[RegistroFichaje]) -> float:
    sorted_punches = sorted(punches, key=lambda x: x.hora)
    total_seconds = 0
    last_start = None
    
    for p in sorted_punches:
        if p.tipo in ["Entrada", "Fin Pausa"]:
            try:
                last_start = datetime.strptime(p.hora, "%H:%M:%S")
            except ValueError:
                try:
                    last_start = datetime.strptime(p.hora, "%H:%M")
                except:
                    last_start = None
        elif p.tipo in ["Salida", "Inicio Pausa"] and last_start:
            try:
                end_time = datetime.strptime(p.hora, "%H:%M:%S")
            except ValueError:
                try:
                    end_time = datetime.strptime(p.hora, "%H:%M")
                except:
                    end_time = None
            if end_time:
                total_seconds += (end_time - last_start).total_seconds()
                last_start = None
            
    # If employee is currently clocked in today, add elapsed time up to now
    if last_start and len(punches) > 0 and punches[0].fecha == datetime.now().strftime("%Y-%m-%d"):
        curr_time = datetime.strptime(datetime.now().strftime("%H:%M:%S"), "%H:%M:%S")
        if curr_time > last_start:
            total_seconds += (curr_time - last_start).total_seconds()
            
    return round(total_seconds / 3600.0, 2)


# === REGISTRO DE JORNADA (FICHAJES) API ===
@router.post("/api/presencia/fichar", response_model=RegistroFichajeRead)
def presence_clock_in_out(req: FicharRequest, session: Session = Depends(get_session)):
    emp = session.get(Empleado, req.empleado_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if emp.pin != req.pin:
        raise HTTPException(status_code=403, detail="PIN incorrecto")
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    time_str = datetime.now().strftime("%H:%M:%S")
    
    fichaje = RegistroFichaje(
        empleado_id=req.empleado_id,
        fecha=today_str,
        hora=time_str,
        tipo=req.tipo,
        dispositivo=req.dispositivo,
        notas=req.notas
    )
    session.add(fichaje)
    session.commit()
    session.refresh(fichaje)
    return fichaje

@router.get("/api/presencia/estado/{empleado_id}")
def get_presence_state(empleado_id: str, session: Session = Depends(get_session)):
    last_punch = session.exec(
        select(RegistroFichaje)
        .where(RegistroFichaje.empleado_id == empleado_id)
        .order_by(RegistroFichaje.fecha.desc(), RegistroFichaje.hora.desc())
    ).first()
    
    if not last_punch:
        return {"estado": "Fuera", "ultimo_fichaje": None}
        
    if last_punch.tipo in ["Entrada", "Fin Pausa"]:
        estado = "Dentro"
    elif last_punch.tipo == "Inicio Pausa":
        estado = "En Pausa"
    else:
        estado = "Fuera"
        
    return {"estado": estado, "ultimo_fichaje": last_punch}

@router.get("/api/presencia/fichajes", response_model=List[ResumenFichajesDia])
def list_presence_fichajes(
    fecha_inicio: Optional[str] = None, 
    fecha_fin: Optional[str] = None, 
    empleado_id: Optional[str] = None, 
    session: Session = Depends(get_session)
):
    statement = select(RegistroFichaje)
    if fecha_inicio:
        statement = statement.where(RegistroFichaje.fecha >= fecha_inicio)
    if fecha_fin:
        statement = statement.where(RegistroFichaje.fecha <= fecha_fin)
    if empleado_id:
        statement = statement.where(RegistroFichaje.empleado_id == empleado_id)
        
    fichajes = session.exec(statement).all()
    
    grouped = {}
    for f in fichajes:
        key = (f.fecha, f.empleado_id)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(f)
        
    res = []
    for (fecha, emp_id), punches in grouped.items():
        emp = session.get(Empleado, emp_id)
        emp_name = emp.nombre if emp else "Empleado Desconocido"
        
        sorted_punches = sorted(punches, key=lambda x: x.hora)
        primer = sorted_punches[0].hora if sorted_punches else None
        ultimo = sorted_punches[-1].hora if len(sorted_punches) > 1 else None
        
        hrs = calculate_working_hours(punches)
        
        res.append(ResumenFichajesDia(
            fecha=fecha,
            empleado_id=emp_id,
            empleado_nombre=emp_name,
            primer_fichaje=primer,
            ultimo_fichaje=ultimo,
            horas_trabajadas=hrs,
            fichajes=[RegistroFichajeRead(**p.dict()) for p in sorted_punches]
        ))
        
    return sorted(res, key=lambda x: (x.fecha, x.empleado_nombre), reverse=True)

@router.get("/api/presencia/prenomina", response_model=List[PrePayrollSummary])
def get_prepayroll_summary(mes: int, anio: int, session: Session = Depends(get_session)):
    if mes < 1 or mes > 12:
        raise HTTPException(status_code=400, detail="Mes inválido")
    
    first_day = f"{anio}-{mes:02d}-01"
    last_day_num = calendar.monthrange(anio, mes)[1]
    last_day = f"{anio}-{mes:02d}-{last_day_num}"
    
    employees = session.exec(select(Empleado).where(Empleado.estado == "Activo")).all()
    active_ids = [emp.id for emp in employees]
    
    if not active_ids:
        return []
        
    # Precargar cuadrantes planificados
    all_shifts = session.exec(
        select(HorarioTrabajador)
        .where(HorarioTrabajador.empleado_id.in_(active_ids))
        .where(HorarioTrabajador.fecha >= first_day)
        .where(HorarioTrabajador.fecha <= last_day)
        .where(HorarioTrabajador.turno.not_in(["Baja", "Permiso"]))
    ).all()
    
    shifts_by_emp = {emp_id: [] for emp_id in active_ids}
    for s in all_shifts:
        if s.empleado_id in shifts_by_emp:
            shifts_by_emp[s.empleado_id].append(s)
            
    # Precargar fichajes de jornada
    all_fichajes = session.exec(
        select(RegistroFichaje)
        .where(RegistroFichaje.empleado_id.in_(active_ids))
        .where(RegistroFichaje.fecha >= first_day)
        .where(RegistroFichaje.fecha <= last_day)
    ).all()
    
    fichajes_by_emp = {emp_id: [] for emp_id in active_ids}
    for f in all_fichajes:
        if f.empleado_id in fichajes_by_emp:
            fichajes_by_emp[f.empleado_id].append(f)
            
    # Precargar incidencias aprobadas
    all_incidents = session.exec(
        select(IncidenciaEmpleado)
        .where(IncidenciaEmpleado.empleado_id.in_(active_ids))
        .where(IncidenciaEmpleado.estado.in_(["Aprobado", "Finalizado"]))
    ).all()
    
    incidents_by_emp = {emp_id: [] for emp_id in active_ids}
    for inc in all_incidents:
        if inc.empleado_id in incidents_by_emp:
            incidents_by_emp[inc.empleado_id].append(inc)
            
    summaries = []
    start_month = date(anio, mes, 1)
    end_month = date(anio, mes, last_day_num)
    
    for emp in employees:
        working_days_in_month = 0
        for day in range(1, last_day_num + 1):
            day_date = date(anio, mes, day)
            if day_date.weekday() < 5:
                working_days_in_month += 1
                
        daily_hours = (emp.horas_semanales or 40.0) / 5.0
        contract_hours_mes = round(daily_hours * working_days_in_month, 2)
        
        # Filtrar cuadrantes de este empleado en memoria
        planned_shifts = shifts_by_emp.get(emp.id, [])
        horas_planificadas = 0.0
        for s in planned_shifts:
            if s.hora_inicio and s.hora_fin and s.hora_inicio != "00:00" and s.hora_fin != "00:00":
                try:
                    start_t = datetime.strptime(s.hora_inicio, "%H:%M")
                    end_t = datetime.strptime(s.hora_fin, "%H:%M")
                    diff = (end_t - start_t).total_seconds() / 3600.0
                    if diff < 0:
                        diff += 24.0
                    horas_planificadas += diff
                except Exception:
                    pass
        horas_planificadas = round(horas_planificadas, 2)
        
        # Filtrar y agrupar fichajes de este empleado en memoria
        fichajes = fichajes_by_emp.get(emp.id, [])
        fichajes_by_date = {}
        for f in fichajes:
            if f.fecha not in fichajes_by_date:
                fichajes_by_date[f.fecha] = []
            fichajes_by_date[f.fecha].append(f)
            
        horas_trabajadas = 0.0
        dias_trabajados = len(fichajes_by_date)
        for day_punches in fichajes_by_date.values():
            horas_trabajadas += calculate_working_hours(day_punches)
        horas_trabajadas = round(horas_trabajadas, 2)
        
        horas_extra = max(0.0, round(horas_trabajadas - horas_planificadas, 2))
        
        # Filtrar incidencias de este empleado en memoria
        all_inc = incidents_by_emp.get(emp.id, [])
        dias_baja = 0
        dias_permiso = 0
        dias_vacaciones = 0
        dias_falta = 0
        
        for inc in all_inc:
            is_full_day = not inc.hora_inicio and not inc.hora_fin
            if not is_full_day:
                continue
                
            inc_start = datetime.strptime(inc.fecha_inicio, "%Y-%m-%d").date()
            inc_end_str = inc.fecha_fin or inc.fecha_inicio
            inc_end = datetime.strptime(inc_end_str, "%Y-%m-%d").date()
            
            overlap_start = max(start_month, inc_start)
            overlap_end = min(end_month, inc_end)
            
            if overlap_start <= overlap_end:
                overlap_days = (overlap_end - overlap_start).days + 1
                if inc.categoria == "Baja":
                    dias_baja += overlap_days
                elif inc.categoria == "Permiso":
                    if inc.tipo == "Vacaciones":
                        dias_vacaciones += overlap_days
                    else:
                        dias_permiso += overlap_days
                elif inc.categoria == "Falta":
                    dias_falta += overlap_days
                    
        summaries.append(PrePayrollSummary(
            empleado_id=emp.id,
            empleado_nombre=emp.nombre,
            nif=emp.nif,
            nass=emp.nass,
            iban=emp.iban,
            salario_base=emp.salario_base or 0.0,
            horas_contrato_mes=contract_hours_mes,
            horas_planificadas=horas_planificadas,
            horas_trabajadas=horas_trabajadas,
            horas_extra=horas_extra,
            dias_trabajados=dias_trabajados,
            dias_baja=dias_baja,
            dias_permiso=dias_permiso,
            dias_vacaciones=dias_vacaciones,
            dias_falta=dias_falta
        ))
        
    return summaries

@router.post("/api/presencia/manual", response_model=RegistroFichajeRead)
def create_fichaje_manual(fichaje: RegistroFichaje, session: Session = Depends(get_session)):
    if not fichaje.notas:
        fichaje.notas = "Añadido manualmente por Administrador"
    else:
        fichaje.notas = f"{fichaje.notas} (Manual)"
        
    session.add(fichaje)
    session.commit()
    session.refresh(fichaje)
    return fichaje

@router.delete("/api/presencia/{id}")
def delete_fichaje(id: int, session: Session = Depends(get_session)):
    db_f = session.get(RegistroFichaje, id)
    if not db_f:
        raise HTTPException(status_code=404, detail="Fichaje no encontrado")
    session.delete(db_f)
    session.commit()
    return {"status": "success", "message": f"Fichaje {id} eliminado correctamente"}
