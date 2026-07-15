from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import calendar
import itertools
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel

from database import get_session
from models import (
    Empleado,
    HorarioTrabajador,
    IncidenciaEmpleado,
    HorarioBar,
    RestriccionEmpleado,
    CoberturaRequerida,
    Festivo,
    CierreBar,
    SMTPConfig
)
from schemas import (
    EmpleadoRead,
    HorarioTrabajadorRead,
    RestriccionEmpleadoRead
)

router = APIRouter(tags=["empleados"])

# --- Request Schemas ---
class BulkVacacionesRequest(BaseModel):
    empleado_id: str
    fecha_inicio: str  # YYYY-MM-DD
    fecha_fin: str     # YYYY-MM-DD
    tipo_ausencia: str = "Vacaciones"  # "Vacaciones" o "Libre Disposición"

class GenerarHorarioRequest(BaseModel):
    fecha_referencia: str  # YYYY-MM-DD

class EnviarEmailRequest(BaseModel):
    empleado_id: str
    fecha_referencia: str  # YYYY-MM-DD


# --- Helper Functions ---
def calculate_shift_hours(inicio: str, fin: str) -> float:
    if not inicio or not fin:
        return 0.0
    try:
        h1, m1 = map(int, inicio.split(':'))
        h2, m2 = map(int, fin.split(':'))
        diff = (h2 + m2/60.0) - (h1 + m1/60.0)
        if diff < 0:
            diff += 24.0  # Turno nocturno que pasa la medianoche
        return max(0.0, diff)
    except:
        return 0.0

def get_empleado_read(
    emp: Empleado,
    session: Session,
    pre_shifts: Optional[List[HorarioTrabajador]] = None,
    pre_incidents: Optional[List[IncidenciaEmpleado]] = None
) -> EmpleadoRead:
    current_year = str(datetime.now().year)
    current_month_prefix = datetime.now().strftime("%Y-%m")
    
    # 1. Vacaciones
    if pre_shifts is not None:
        usadas_vac_shifts = len([s for s in pre_shifts if s.turno == "Vacaciones" and s.fecha.startswith(current_year)])
    else:
        usadas_vac_shifts = len(session.exec(
            select(HorarioTrabajador)
            .where(HorarioTrabajador.empleado_id == emp.id)
            .where(HorarioTrabajador.turno == "Vacaciones")
            .where(HorarioTrabajador.fecha.startswith(current_year))
        ).all())
        
    if pre_incidents is not None:
        usadas_vac_incidents = len([
            inc for inc in pre_incidents 
            if inc.categoria == "Permiso" 
            and inc.tipo == "Vacaciones" 
            and inc.estado == "Aprobado" 
            and inc.fecha_inicio.startswith(current_year)
        ])
    else:
        usadas_vac_incidents = len(session.exec(
            select(IncidenciaEmpleado)
            .where(IncidenciaEmpleado.empleado_id == emp.id)
            .where(IncidenciaEmpleado.categoria == "Permiso")
            .where(IncidenciaEmpleado.tipo == "Vacaciones")
            .where(IncidenciaEmpleado.estado == "Aprobado")
            .where(IncidenciaEmpleado.fecha_inicio.startswith(current_year))
        ).all())
        
    vac_usadas = usadas_vac_shifts + usadas_vac_incidents
    
    # 2. Libre Disposición
    if pre_shifts is not None:
        usadas_ld_shifts = len([s for s in pre_shifts if s.turno == "Libre Disposición" and s.fecha.startswith(current_year)])
    else:
        usadas_ld_shifts = len(session.exec(
            select(HorarioTrabajador)
            .where(HorarioTrabajador.empleado_id == emp.id)
            .where(HorarioTrabajador.turno == "Libre Disposición")
            .where(HorarioTrabajador.fecha.startswith(current_year))
        ).all())
        
    if pre_incidents is not None:
        usadas_ld_incidents = len([
            inc for inc in pre_incidents 
            if inc.categoria == "Permiso" 
            and inc.tipo == "Asuntos propios" 
            and inc.estado == "Aprobado" 
            and inc.fecha_inicio.startswith(current_year)
        ])
    else:
        usadas_ld_incidents = len(session.exec(
            select(IncidenciaEmpleado)
            .where(IncidenciaEmpleado.empleado_id == emp.id)
            .where(IncidenciaEmpleado.categoria == "Permiso")
            .where(IncidenciaEmpleado.tipo == "Asuntos propios")
            .where(IncidenciaEmpleado.estado == "Aprobado")
            .where(IncidenciaEmpleado.fecha_inicio.startswith(current_year))
        ).all())
        
    ld_usadas = usadas_ld_shifts + usadas_ld_incidents
    
    # 3. Horas trabajadas
    if pre_shifts is not None:
        turnos_trabajados = [
            s for s in pre_shifts 
            if s.fecha.startswith(current_year) 
            and s.turno not in ["Vacaciones", "Libre Disposición", "Festivo", "Libre", "Baja", "Permiso"]
        ]
    else:
        turnos_trabajados = session.exec(
            select(HorarioTrabajador)
            .where(HorarioTrabajador.empleado_id == emp.id)
            .where(HorarioTrabajador.fecha.startswith(current_year))
            .where(HorarioTrabajador.turno.notin_(["Vacaciones", "Libre Disposición", "Festivo", "Libre", "Baja", "Permiso"]))
        ).all()
        
    horas_mes = 0.0
    horas_anio = 0.0
    for t in turnos_trabajados:
        h = calculate_shift_hours(t.hora_inicio, t.hora_fin)
        horas_anio += h
        if t.fecha.startswith(current_month_prefix):
            horas_mes += h
            
    return EmpleadoRead(
        **emp.dict(),
        vacaciones_usadas=vac_usadas,
        vacaciones_restantes=(emp.vacaciones_totales or 0) - vac_usadas,
        dias_libre_disposicion_usados=ld_usadas,
        dias_libre_disposicion_restantes=(emp.dias_libre_disposicion_totales or 0) - ld_usadas,
        horas_realizadas_mes=round(horas_mes, 2),
        horas_realizadas_anio=round(horas_anio, 2)
    )


# === EMPLEADOS API ===
@router.get("/api/empleados/{empleado_id}")
def get_empleado_by_id(empleado_id: str, session: Session = Depends(get_session)):
    emp = session.get(Empleado, empleado_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return get_empleado_read(emp, session)

@router.get("/api/empleados/{empleado_id}/vacaciones")
def get_vacaciones_empleado(empleado_id: str, session: Session = Depends(get_session)):
    current_year = str(datetime.now().year)
    stmt = select(HorarioTrabajador).where(
        HorarioTrabajador.empleado_id == empleado_id,
        HorarioTrabajador.turno.in_(["Vacaciones", "Libre Disposición"]),
        HorarioTrabajador.fecha.startswith(current_year)
    ).order_by(HorarioTrabajador.fecha)
    return session.exec(stmt).all()

@router.get("/api/empleados", response_model=List[EmpleadoRead])
def list_empleados(session: Session = Depends(get_session)):
    statement = select(Empleado)
    db_emps = session.exec(statement).all()
    active_ids = [emp.id for emp in db_emps]
    
    if not active_ids:
        return []
        
    current_year = str(datetime.now().year)
    
    # Precargar cuadrantes del año actual
    all_shifts = session.exec(
        select(HorarioTrabajador)
        .where(HorarioTrabajador.empleado_id.in_(active_ids))
        .where(HorarioTrabajador.fecha.startswith(current_year))
    ).all()
    
    shifts_by_emp = {emp_id: [] for emp_id in active_ids}
    for s in all_shifts:
        if s.empleado_id in shifts_by_emp:
            shifts_by_emp[s.empleado_id].append(s)
            
    # Precargar incidencias del año actual
    all_incidents = session.exec(
        select(IncidenciaEmpleado)
        .where(IncidenciaEmpleado.empleado_id.in_(active_ids))
        .where(IncidenciaEmpleado.estado.in_(["Aprobado", "Finalizado"]))
        .where(IncidenciaEmpleado.fecha_inicio.startswith(current_year))
    ).all()
    
    incidents_by_emp = {emp_id: [] for emp_id in active_ids}
    for inc in all_incidents:
        if inc.empleado_id in incidents_by_emp:
            incidents_by_emp[inc.empleado_id].append(inc)
            
    return [
        get_empleado_read(
            emp, 
            session, 
            pre_shifts=shifts_by_emp.get(emp.id), 
            pre_incidents=incidents_by_emp.get(emp.id)
        ) 
        for emp in db_emps
    ]

@router.post("/api/empleados", response_model=EmpleadoRead)
def save_empleado(empleado: Empleado, session: Session = Depends(get_session)):
    db_emp = session.get(Empleado, empleado.id)
    if db_emp:
        for key, val in empleado.dict(exclude_unset=True).items():
            setattr(db_emp, key, val)
        session.add(db_emp)
    else:
        session.add(empleado)
        db_emp = empleado
    session.commit()
    session.refresh(db_emp)
    return get_empleado_read(db_emp, session)

@router.delete("/api/empleados/{id}")
def delete_empleado(id: str, permanent: bool = False, session: Session = Depends(get_session)):
    db_emp = session.get(Empleado, id)
    if not db_emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if permanent:
        session.delete(db_emp)
        session.commit()
        return {"status": "success", "message": f"Empleado {id} eliminado definitivamente"}
    else:
        db_emp.estado = "Archivado"
        session.add(db_emp)
        session.commit()
        return {"status": "success", "message": f"Empleado {id} archivado correctamente"}


# === HORARIOS TRABAJADORES API ===
@router.get("/api/horarios", response_model=List[HorarioTrabajadorRead])
def list_horarios(fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, session: Session = Depends(get_session)):
    statement = select(HorarioTrabajador)
    if fecha_inicio and fecha_fin:
        statement = statement.where(HorarioTrabajador.fecha >= fecha_inicio).where(HorarioTrabajador.fecha <= fecha_fin)
    elif fecha_inicio:
        statement = statement.where(HorarioTrabajador.fecha == fecha_inicio)
    return session.exec(statement).all()

@router.post("/api/horarios", response_model=HorarioTrabajadorRead)
def save_horario(horario: HorarioTrabajador, session: Session = Depends(get_session)):
    if horario.id:
        db_hor = session.get(HorarioTrabajador, horario.id)
        if db_hor:
            for key, val in horario.dict(exclude_unset=True).items():
                setattr(db_hor, key, val)
            session.add(db_hor)
            session.commit()
            session.refresh(db_hor)
            return db_hor
    
    session.add(horario)
    session.commit()
    session.refresh(horario)
    return horario

@router.delete("/api/horarios/{id}")
def delete_horario(id: int, session: Session = Depends(get_session)):
    db_hor = session.get(HorarioTrabajador, id)
    if not db_hor:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    session.delete(db_hor)
    session.commit()
    return {"status": "success", "message": f"Turno {id} eliminado correctamente"}

@router.post("/api/horarios/bulk-vacaciones")
def bulk_vacaciones(req: BulkVacacionesRequest, session: Session = Depends(get_session)):
    try:
        dt_start = datetime.strptime(req.fecha_inicio, "%Y-%m-%d")
        dt_end = datetime.strptime(req.fecha_fin, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Debe ser YYYY-MM-DD")
        
    if dt_end < dt_start:
        raise HTTPException(status_code=400, detail="La fecha de fin no puede ser anterior a la de inicio.")
        
    delta = dt_end - dt_start
    dates = [(dt_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(delta.days + 1)]
    
    # Check existing shifts and delete them to override with vacations
    existing = session.exec(
        select(HorarioTrabajador)
        .where(HorarioTrabajador.empleado_id == req.empleado_id)
        .where(HorarioTrabajador.fecha.in_(dates))
    ).all()
    
    for s in existing:
        session.delete(s)
        
    # Insert new vacation shifts
    for d_str in dates:
        vac = HorarioTrabajador(
            empleado_id=req.empleado_id,
            fecha=d_str,
            turno=req.tipo_ausencia,
            hora_inicio="00:00",
            hora_fin="00:00",
            notas=f"Asignación: {req.tipo_ausencia}"
        )
        session.add(vac)
        
    session.commit()
    return {"status": "success", "message": f"{len(dates)} días de vacaciones registrados."}


# === RESTRICCIONES EMPLEADOS API ===
@router.get("/api/empleados/{id}/restricciones", response_model=List[RestriccionEmpleadoRead])
def list_restricciones_empleado(id: str, session: Session = Depends(get_session)):
    # 1. Fetch real db restrictions
    db_res = session.exec(select(RestriccionEmpleado).where(RestriccionEmpleado.empleado_id == id)).all()
    res_list = [RestriccionEmpleadoRead(**r.dict()) for r in db_res]
    
    # 2. Fetch approved/active incidents for this employee
    inc_statement = select(IncidenciaEmpleado).where(
        IncidenciaEmpleado.empleado_id == id,
        IncidenciaEmpleado.estado.in_(["Aprobado", "Finalizado"])
    )
    incidents = session.exec(inc_statement).all()
    
    for inc in incidents:
        start_dt = datetime.strptime(inc.fecha_inicio, "%Y-%m-%d")
        end_dt_str = inc.fecha_fin or inc.fecha_inicio
        end_dt = datetime.strptime(end_dt_str, "%Y-%m-%d")
        
        curr_dt = start_dt
        while curr_dt <= end_dt:
            date_str = curr_dt.strftime("%Y-%m-%d")
            
            unique_id = - (inc.id * 1000000 + int(curr_dt.timestamp() % 1000000))
            
            desc = f"{inc.categoria}: {inc.tipo}"
            if inc.descripcion:
                desc += f" ({inc.descripcion})"
                
            res_list.append(
                RestriccionEmpleadoRead(
                    id=unique_id,
                    empleado_id=id,
                    fecha=date_str,
                    hora_inicio=inc.hora_inicio,
                    hora_fin=inc.hora_fin,
                    descripcion=desc
                )
            )
            curr_dt += timedelta(days=1)
            
    return res_list

@router.post("/api/restricciones", response_model=RestriccionEmpleadoRead)
def save_restriccion(restriccion: RestriccionEmpleado, session: Session = Depends(get_session)):
    if restriccion.id:
        db_res = session.get(RestriccionEmpleado, restriccion.id)
        if db_res:
            for key, val in restriccion.dict(exclude_unset=True).items():
                setattr(db_res, key, val)
            session.add(db_res)
            session.commit()
            session.refresh(db_res)
            return db_res
    session.add(restriccion)
    session.commit()
    session.refresh(restriccion)
    return restriccion

@router.delete("/api/restricciones/{id}")
def delete_restriccion(id: int, session: Session = Depends(get_session)):
    db_res = session.get(RestriccionEmpleado, id)
    if not db_res:
        raise HTTPException(status_code=404, detail="Restricción no encontrada")
    session.delete(db_res)
    session.commit()
    return {"status": "success", "message": f"Restricción {id} eliminada correctamente"}


# === GENERADOR HORARIOS API (ADAPTADO A BAR) ===
@router.post("/api/horarios/generar-mes")
def generar_horario_mes(req: GenerarHorarioRequest, session: Session = Depends(get_session)):
    try:
        dt = datetime.strptime(req.fecha_referencia, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Debe ser YYYY-MM-DD")
    
    year = dt.year
    month = dt.month
    
    _, num_days = calendar.monthrange(year, month)
    start_date_str = f"{year:04d}-{month:02d}-01"
    end_date_str = f"{year:04d}-{month:02d}-{num_days:02d}"
    
    # Get active employees
    employees = session.exec(select(Empleado).where(Empleado.estado == "Activo")).all()
    if not employees:
        raise HTTPException(status_code=400, detail="No hay empleados activos configurados.")
        
    # Get holidays
    festivos = session.exec(
        select(Festivo)
        .where(Festivo.fecha >= start_date_str)
        .where(Festivo.fecha <= end_date_str)
    ).all()
    festivos_by_date = {f.fecha: f for f in festivos}
    
    # Get bar closures
    cierres = session.exec(
        select(CierreBar)
        .where(CierreBar.fecha_fin >= start_date_str)
        .where(CierreBar.fecha_inicio <= end_date_str)
    ).all()
    
    cierres_by_date = {}
    for c in cierres:
        c_start = datetime.strptime(c.fecha_inicio, "%Y-%m-%d")
        c_end = datetime.strptime(c.fecha_fin, "%Y-%m-%d")
        c_delta = c_end - c_start
        for i in range(c_delta.days + 1):
            d_str = (c_start + timedelta(days=i)).strftime("%Y-%m-%d")
            cierres_by_date[d_str] = c

    # Clear existing schedules for active employees this month, KEEPING Vacations/Bajas/Permisos
    existing_shifts = session.exec(
        select(HorarioTrabajador)
        .where(HorarioTrabajador.fecha >= start_date_str)
        .where(HorarioTrabajador.fecha <= end_date_str)
    ).all()
    
    vacaciones_by_date_emp = {}
    for s in existing_shifts:
        if s.turno in ["Vacaciones", "Libre Disposición", "Baja", "Permiso"]:
            if s.empleado_id:
                vacaciones_by_date_emp[(s.fecha, s.empleado_id)] = s.turno
        else:
            session.delete(s)
    session.commit()
    
    # Get Bar hours
    bar_hours_list = session.exec(select(HorarioBar)).all()
    bar_hours_by_weekday = {bh.dia_semana: bh for bh in bar_hours_list}
    
    # Get Coverage rules
    coberturas_list = session.exec(select(CoberturaRequerida)).all()
    
    # Get manual restrictions
    restrictions = session.exec(
        select(RestriccionEmpleado)
        .where(RestriccionEmpleado.fecha >= start_date_str)
        .where(RestriccionEmpleado.fecha <= end_date_str)
    ).all()
    
    restrictions_by_date_emp = {}
    for r in restrictions:
        key = (r.fecha, r.empleado_id)
        if key not in restrictions_by_date_emp:
            restrictions_by_date_emp[key] = []
        restrictions_by_date_emp[key].append(r)
        
    # Get active employee incidents mapped as restrictions
    db_incidents = session.exec(
        select(IncidenciaEmpleado)
        .where(IncidenciaEmpleado.fecha_inicio <= end_date_str)
        .where((IncidenciaEmpleado.fecha_fin == None) | (IncidenciaEmpleado.fecha_fin >= start_date_str))
        .where(IncidenciaEmpleado.estado.in_(["Aprobado", "Finalizado"]))
    ).all()
    
    for inc in db_incidents:
        inc_start = max(datetime.strptime(inc.fecha_inicio, "%Y-%m-%d"), datetime.strptime(start_date_str, "%Y-%m-%d"))
        inc_end_str = inc.fecha_fin or inc.fecha_inicio
        inc_end = min(datetime.strptime(inc_end_str, "%Y-%m-%d"), datetime.strptime(end_date_str, "%Y-%m-%d"))
        
        curr_dt = inc_start
        while curr_dt <= inc_end:
            date_str = curr_dt.strftime("%Y-%m-%d")
            key = (date_str, inc.empleado_id)
            if key not in restrictions_by_date_emp:
                restrictions_by_date_emp[key] = []
                
            desc = f"{inc.categoria}: {inc.tipo}"
            if inc.descripcion:
                desc += f" ({inc.descripcion})"
                
            restrictions_by_date_emp[key].append(
                RestriccionEmpleado(
                    empleado_id=inc.empleado_id,
                    fecha=date_str,
                    hora_inicio=inc.hora_inicio,
                    hora_fin=inc.hora_fin,
                    descripcion=desc
                )
            )
            curr_dt += timedelta(days=1)

    def parse_time_to_minutes(t_str: str) -> int:
        try:
            h, m = map(int, t_str.split(":"))
            return h * 60 + m
        except:
            return 0

    def format_minutes_to_time(mins: int) -> str:
        mins = mins % 1440
        h = mins // 60
        m = mins % 60
        return f"{h:02d}:{m:02d}"

    def get_slot_coverage(s_start_str, s_end_str, restrictions):
        slot_start = parse_time_to_minutes(s_start_str)
        slot_end = parse_time_to_minutes(s_end_str)
        if slot_end < slot_start:
            slot_end += 1440  # Turno nocturno
        
        intervals = []
        for r in restrictions:
            if not r.hora_inicio or not r.hora_fin:
                intervals.append((slot_start, slot_end, r.descripcion or "Restricción"))
                continue
                
            r_start = parse_time_to_minutes(r.hora_inicio)
            r_end = parse_time_to_minutes(r.hora_fin)
            if r_end < r_start:
                r_end += 1440
            
            overlap_start = max(slot_start, r_start)
            overlap_end = min(slot_end, r_end)
            if overlap_start < overlap_end:
                intervals.append((overlap_start, overlap_end, r.descripcion or "Restricción"))
                
        if not intervals:
            return [(slot_start, slot_end, "free", None)], []
            
        intervals.sort(key=lambda x: x[0])
        merged_restrictions = []
        curr_start, curr_end, curr_desc = intervals[0]
        
        for next_start, next_end, next_desc in intervals[1:]:
            if next_start <= curr_end:
                curr_end = max(curr_end, next_end)
                curr_desc += f" / {next_desc}"
            else:
                merged_restrictions.append((curr_start, curr_end, curr_desc))
                curr_start, curr_end, curr_desc = next_start, next_end, next_desc
        merged_restrictions.append((curr_start, curr_end, curr_desc))
        
        free_intervals = []
        last_end = slot_start
        for r_start, r_end, r_desc in merged_restrictions:
            if r_start > last_end:
                free_intervals.append((last_end, r_start, "free", None))
            last_end = r_end
        if last_end < slot_end:
            free_intervals.append((last_end, slot_end, "free", None))
            
        return free_intervals, merged_restrictions

    # Precalculate balancing YTD hours
    ytd_start_date = f"{year}-01-01"
    day_before_start = dt - timedelta(days=1)
    ytd_end_date = day_before_start.strftime("%Y-%m-%d")
    
    ytd_hours = {emp.id: 0.0 for emp in employees}
    ytd_start_dt = datetime(year, 1, 1)
    days_before_month = max(0, (dt - ytd_start_dt).days)

    if ytd_start_date <= ytd_end_date:
        ytd_shifts = session.exec(
            select(HorarioTrabajador)
            .where(HorarioTrabajador.empleado_id.in_([e.id for e in employees]))
            .where(HorarioTrabajador.fecha >= ytd_start_date)
            .where(HorarioTrabajador.fecha <= ytd_end_date)
            .where(HorarioTrabajador.turno.in_(["Mañana", "Tarde", "Noche", "Completo", "Partido"]))
        ).all()
        for s in ytd_shifts:
            try:
                duration = calculate_shift_hours(s.hora_inicio, s.hora_fin)
                ytd_hours[s.empleado_id] += duration
            except:
                pass

    accumulated_minutes_this_month = {emp.id: 0.0 for emp in employees}
    
    # Fetch previous day's end shifts to check 12h rest gap
    prev_month_end = (dt - timedelta(days=1)).strftime("%Y-%m-%d")
    prev_shifts = session.exec(
        select(HorarioTrabajador)
        .where(HorarioTrabajador.fecha == prev_month_end)
    ).all()
    
    shifts_by_date_emp = {}
    for s in prev_shifts:
        key = (s.fecha, s.empleado_id)
        if key not in shifts_by_date_emp:
            shifts_by_date_emp[key] = []
        
        start_min = parse_time_to_minutes(s.hora_inicio)
        end_min = parse_time_to_minutes(s.hora_fin)
        if end_min < start_min:
            end_min += 1440  # overlaps to next day
            
        shifts_by_date_emp[key].append({
            "hora_inicio": s.hora_inicio,
            "hora_fin": s.hora_fin,
            "start_min": start_min,
            "end_min": end_min
        })

    # Day-by-day scheduling
    for d in range(1, num_days + 1):
        curr_date = datetime(year, month, d)
        date_str = curr_date.strftime("%Y-%m-%d")
        
        if date_str in cierres_by_date:
            continue
            
        if date_str in festivos_by_date:
            festivo_info = festivos_by_date[date_str]
            for emp in employees:
                if (date_str, emp.id) in vacaciones_by_date_emp:
                    continue
                new_shift = HorarioTrabajador(
                    empleado_id=emp.id,
                    fecha=date_str,
                    turno="Festivo",
                    hora_inicio="00:00",
                    hora_fin="00:00",
                    notas=f"Festivo: {festivo_info.descripcion}"
                )
                session.add(new_shift)
            continue

        weekday = curr_date.weekday()  # 0=Monday, 6=Sunday
        bh = bar_hours_by_weekday.get(weekday)
        if not bh or not bh.abierto:
            continue
            
        # Build required slots based on CoberturaRequerida for this weekday
        day_coberturas = [c for c in coberturas_list if c.dia_semana == weekday]
        
        slots = []
        # Fallback default coverages if none configured in DB
        if not day_coberturas:
            # Morning: 1 Cocinero, 1 Camarero. Afternoon/Evening: 1 Cocinero, 2 Camarero
            if bh.apertura_manana and bh.cierre_manana:
                slots.append(("Mañana", bh.apertura_manana, bh.cierre_manana, "Cocinero", 0))
                slots.append(("Mañana", bh.apertura_manana, bh.cierre_manana, "Camarero", 0))
            if bh.apertura_tarde and bh.cierre_tarde:
                slots.append(("Tarde", bh.apertura_tarde, bh.cierre_tarde, "Cocinero", 0))
                slots.append(("Tarde", bh.apertura_tarde, bh.cierre_tarde, "Camarero", 0))
                slots.append(("Tarde", bh.apertura_tarde, bh.cierre_tarde, "Camarero", 1))
        else:
            for cob in day_coberturas:
                # Map shift name to time slots
                if cob.turno == "Mañana" and bh.apertura_manana and bh.cierre_manana:
                    for idx in range(cob.cantidad):
                        slots.append(("Mañana", bh.apertura_manana, bh.cierre_manana, cob.puesto, idx))
                elif cob.turno in ["Tarde", "Noche"] and bh.apertura_tarde and bh.cierre_tarde:
                    for idx in range(cob.cantidad):
                        slots.append((cob.turno, bh.apertura_tarde, bh.cierre_tarde, cob.puesto, idx))
        
        if not slots:
            continue
            
        week_num = curr_date.isocalendar()[1]
        
        # Precalculate balancing scores
        emp_balancing_bonus = {}
        total_days = days_before_month + d - 1
        for emp in employees:
            target_minutes = (emp.horas_semanales / 7.0) * total_days * 60.0
            actual_minutes = (ytd_hours[emp.id] * 60.0) + accumulated_minutes_this_month[emp.id]
            deviation_hours = (actual_minutes - target_minutes) / 60.0
            emp_balancing_bonus[emp.id] = -deviation_hours * 2.0  # Under-contract gets positive bonus

        # To schedule role-specifically, we generate candidates slot-by-slot.
        # For each slot, candidate pool is active employees matching the slot's role.
        candidate_pools = []
        for slot in slots:
            role_req = slot[3]
            matching_emps = [e for e in employees if e.puesto.lower() == role_req.lower() and e.estado == "Activo"]
            # Add None option to represent unassigned/coverage gap
            candidate_pools.append(matching_emps + [None])
            
        # Cartesian product of candidate pools
        raw_candidates = itertools.product(*candidate_pools)
        candidates = []
        for cand in raw_candidates:
            invalid = False
            assigned_today = set()
            
            for emp in cand:
                if emp is None:
                    continue
                # An employee can't work two slots on the same day (to avoid split conflicts or excessive hours)
                if emp.id in assigned_today:
                    invalid = True
                    break
                assigned_today.add(emp.id)
                
            if not invalid:
                candidates.append(cand)
                
        if not candidates:
            # Create all slots as unassigned
            for slot in slots:
                cov_shift = HorarioTrabajador(
                    empleado_id="",
                    fecha=date_str,
                    turno=f"{slot[0]} (Cobertura)",
                    hora_inicio=slot[1],
                    hora_fin=slot[2],
                    notas=f"Necesidad Cobertura: {slot[3]} Sin Asignar"
                )
                session.add(cov_shift)
            continue
            
        scored_candidates = []
        for cand in candidates:
            total_score = 0
            has_hard_blocker = False
            assigned_today = set()
            
            for i, emp in enumerate(cand):
                slot_name, s_start, s_end, role_req, _ = slots[i]
                s_start_min = parse_time_to_minutes(s_start)
                s_end_min = parse_time_to_minutes(s_end)
                slot_duration = s_end_min - s_start_min
                if slot_duration < 0:
                    slot_duration += 1440
                
                if emp is None:
                    total_score -= 1000  # Penalty for unassigned slots
                    continue
                
                # Check active vacations/leaves
                if (date_str, emp.id) in vacaciones_by_date_emp:
                    has_hard_blocker = True
                    total_score -= 9999
                    continue
                    
                # Check 12-hour rest requirement
                prev_date_str = (curr_date - timedelta(days=1)).strftime("%Y-%m-%d")
                prev_emp_shifts = shifts_by_date_emp.get((prev_date_str, emp.id), [])
                rest_violation = False
                for ps in prev_emp_shifts:
                    if ps["start_min"] == ps["end_min"]:
                        continue  # Skip 0-duration shifts
                    # If shift ended after midnight (e.g. 02:00 = 1560 mins from yesterday's noon)
                    ps_end = ps["end_min"]
                    if ps_end > 1440:
                        rest_mins = s_start_min - (ps_end - 1440)
                    else:
                        rest_mins = (1440 - ps_end) + s_start_min
                    
                    if rest_mins < 720:  # 12h * 60m
                        rest_violation = True
                        break
                if rest_violation:
                    has_hard_blocker = True
                    total_score -= 5000
                    continue
                    
                # Preference score
                pref_score = 0
                pref = emp.preferencia_turno
                if slot_name == "Mañana":
                    if pref == "Mañanas":
                        pref_score = 20
                    elif pref == "Alterno":
                        # Alternating weekly preference
                        idx = sorted([e.id for e in employees if e.preferencia_turno == "Alterno"]).index(emp.id)
                        pref_score = 15 if (week_num + idx) % 2 == 0 else 10
                    else:
                        pref_score = 2
                elif slot_name in ["Tarde", "Noche"]:
                    if (slot_name == "Tarde" and pref == "Tardes") or (slot_name == "Noche" and pref == "Noches"):
                        pref_score = 20
                    elif pref == "Alterno":
                        idx = sorted([e.id for e in employees if e.preferencia_turno == "Alterno"]).index(emp.id)
                        pref_score = 15 if (week_num + idx) % 2 == 1 else 10
                    else:
                        pref_score = 2
                        
                # Overlap with manual restrictions
                key = (date_str, emp.id)
                emp_rest = restrictions_by_date_emp.get(key, [])
                emp_slot_overlap_mins = 0
                for r in emp_rest:
                    if not r.hora_inicio or not r.hora_fin:
                        emp_slot_overlap_mins = slot_duration
                        break
                    r_start = parse_time_to_minutes(r.hora_inicio)
                    r_end = parse_time_to_minutes(r.hora_fin)
                    if r_end < r_start:
                        r_end += 1440
                        
                    overlap_start = max(s_start_min, r_start)
                    overlap_end = min(s_end_min, r_end)
                    if overlap_start < overlap_end:
                        emp_slot_overlap_mins += (overlap_end - overlap_start)
                        
                if emp_slot_overlap_mins >= slot_duration:
                    has_hard_blocker = True
                    
                total_score -= int(emp_slot_overlap_mins * 0.5)
                total_score += emp_balancing_bonus.get(emp.id, 0.0)
                total_score += pref_score
                assigned_today.add(emp.id)
                
            scored_candidates.append({
                "candidate": cand,
                "has_hard_blocker": has_hard_blocker,
                "score": total_score
            })
            
        scored_candidates.sort(key=lambda x: (x["has_hard_blocker"], -x["score"]))
        best_cand = scored_candidates[0]["candidate"]
        
        pending_coverages = []
        for i, emp in enumerate(best_cand):
            slot_name, s_start, s_end, role_req, _ = slots[i]
            if emp is None:
                # Add unassigned slot directly
                cov_shift = HorarioTrabajador(
                    empleado_id="",
                    fecha=date_str,
                    turno=f"{slot_name} (Cobertura)",
                    hora_inicio=s_start,
                    hora_fin=s_end,
                    notas=f"Necesidad Cobertura: {role_req} Sin Asignar"
                )
                session.add(cov_shift)
                continue
                
            key = (date_str, emp.id)
            emp_rest = restrictions_by_date_emp.get(key, [])
            free_intervals, merged_restrictions = get_slot_coverage(s_start, s_end, emp_rest)
            
            for f_start_min, f_end_min, _, _ in free_intervals:
                sh_start = format_minutes_to_time(f_start_min)
                sh_end = format_minutes_to_time(f_end_min)
                is_adjusted = (sh_start != s_start or sh_end != s_end)
                notes = f"Generado: {role_req}"
                if is_adjusted:
                    notes = f"Ajustado por restricción ({role_req})"
                    
                new_shift = HorarioTrabajador(
                    empleado_id=emp.id,
                    fecha=date_str,
                    turno=slot_name,
                    hora_inicio=sh_start,
                    hora_fin=sh_end,
                    notas=notes
                )
                session.add(new_shift)
                
                # Update accumulated tracking
                duration_mins = f_end_min - f_start_min
                accumulated_minutes_this_month[emp.id] += duration_mins
                
                key_emp = (date_str, emp.id)
                if key_emp not in shifts_by_date_emp:
                    shifts_by_date_emp[key_emp] = []
                shifts_by_date_emp[key_emp].append({
                    "hora_inicio": sh_start,
                    "hora_fin": sh_end,
                    "start_min": f_start_min,
                    "end_min": f_end_min
                })
                
            for r_start_min, r_end_min, r_desc in merged_restrictions:
                pending_coverages.append((slot_name, r_start_min, r_end_min, r_desc, emp, role_req))
                
        # Generate coverage needs for restricted intervals
        for slot_name, r_start_min, r_end_min, r_desc, orig_emp, role_req in pending_coverages:
            cov_start = format_minutes_to_time(r_start_min)
            cov_end = format_minutes_to_time(r_end_min)
            new_cov = HorarioTrabajador(
                empleado_id="",
                fecha=date_str,
                turno=f"{slot_name} (Cobertura)",
                hora_inicio=cov_start,
                hora_fin=cov_end,
                notas=f"Ausencia {orig_emp.nombre} ({role_req}): {r_desc}"
            )
            session.add(new_cov)
            
    session.commit()
    return {"status": "success", "message": f"Horarios del mes {month}/{year} generados con éxito."}


# === HORARIOS EMAIL API ===
@router.post("/api/horarios/enviar-email")
def enviar_horario_email(req: EnviarEmailRequest, session: Session = Depends(get_session)):
    emp = session.get(Empleado, req.empleado_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if not emp.email:
        raise HTTPException(status_code=400, detail="El empleado no tiene correo registrado.")
        
    try:
        dt = datetime.strptime(req.fecha_referencia, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. YYYY-MM-DD esperado.")
        
    year = dt.year
    month = dt.month
    _, num_days = calendar.monthrange(year, month)
    start_date_str = f"{year:04d}-{month:02d}-01"
    end_date_str = f"{year:04d}-{month:02d}-{num_days:02d}"
    
    shifts = session.exec(
        select(HorarioTrabajador)
        .where(HorarioTrabajador.empleado_id == emp.id)
        .where(HorarioTrabajador.fecha >= start_date_str)
        .where(HorarioTrabajador.fecha <= end_date_str)
    ).all()
    shifts = sorted(shifts, key=lambda s: s.fecha)
    
    month_names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    month_name = month_names[month - 1]
    
    text_content = f"HORARIO MENSUAL - {month_name.upper()} {year}\n"
    text_content += f"Empleado: {emp.nombre} ({emp.puesto})\n"
    text_content += f"Generado el {datetime.now().strftime('%d/%m/%Y')}\n"
    text_content += "--------------------------------------------------\n\n"
    
    html_rows = ""
    total_hours = 0.0
    day_names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    
    for d in range(1, num_days + 1):
        date_str = f"{year:04d}-{month:02d}-{d:02d}"
        formatted_date = f"{d:02d}/{month:02d}/{year}"
        
        curr_date = datetime(year, month, d)
        day_of_week = curr_date.weekday()
        day_name = day_names[(day_of_week + 1) % 7]
        
        shift = next((s for s in shifts if s.fecha == date_str), None)
        
        if shift:
            hours = calculate_shift_hours(shift.hora_inicio, shift.hora_fin)
            total_hours += hours
            status_text = f"{shift.turno} ({shift.hora_inicio} - {shift.hora_fin})"
            text_content += f"{day_name} {formatted_date}: {status_text} [{hours:.1f}h]\n"
            
            bg_color = "#f5f5f5"
            text_color = "#333333"
            if shift.turno == "Mañana":
                bg_color = "#eff6ff"; text_color = "#1e40af"
            elif shift.turno == "Tarde":
                bg_color = "#fef3c7"; text_color = "#92400e"
            elif shift.turno == "Noche":
                bg_color = "#faf5ff"; text_color = "#6b21a8"
            elif shift.turno == "Vacaciones":
                bg_color = "#ffe4e6"; text_color = "#9f1239"
                
            html_rows += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px; font-weight: bold; color: #1e293b;">{day_name} {formatted_date}</td>
                <td style="padding: 12px;">
                    <span style="background-color: {bg_color}; color: {text_color}; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 900; text-transform: uppercase;">
                        {shift.turno} ({shift.hora_inicio} - {shift.hora_fin})
                    </span>
                </td>
                <td style="padding: 12px; font-family: monospace; font-weight: bold; color: #475569; text-align: right;">{hours:.1f}h</td>
            </tr>
            """
        else:
            text_content += f"{day_name} {formatted_date}: LIBRE\n"
            html_rows += f"""
            <tr style="border-bottom: 1px solid #f1f5f9; background-color: #f8fafc;">
                <td style="padding: 12px; color: #94a3b8;">{day_name} {formatted_date}</td>
                <td style="padding: 12px; color: #94a3b8; font-style: italic;">LIBRE</td>
                <td style="padding: 12px; color: #94a3b8; font-family: monospace; text-align: right;">0.0h</td>
            </tr>
            """
            
    text_content += f"\n--------------------------------------------------\n"
    text_content += f"TOTAL HORAS MENSUALES: {total_hours:.1f} horas\n"
    
    html_content = f"""
    <html>
    <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            <div style="background-color: #0f172a; padding: 32px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 900;">Aterpe Bar</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Planificación Horaria Mensual</p>
            </div>
            <div style="padding: 32px;">
                <h3 style="margin-top: 0; font-size: 18px; color: #0f172a; font-weight: 900;">Hola, {emp.nombre}</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">Aquí tienes tu cuadrante de turnos programado para el bar durante el mes de <strong>{month_name} de {year}</strong>.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
                            <th style="padding: 8px 12px;">Día</th>
                            <th style="padding: 8px 12px;">Turno</th>
                            <th style="padding: 8px 12px; text-align: right;">Horas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {html_rows}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f8fafc; font-weight: bold;">
                            <td colspan="2" style="padding: 16px 12px; color: #0f172a; font-size: 14px;">Total Horas</td>
                            <td style="padding: 16px 12px; color: #1e40af; font-size: 16px; font-family: monospace; text-align: right;">{total_hours:.1f}h</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div style="background-color: #f1f5f9; padding: 16px; border-radius: 16px; font-size: 11px; color: #64748b; text-align: center; margin-top: 24px;">
                    Este es un correo automático. Por favor, si necesitas realizar algún cambio o reajuste, contacta directamente con el encargado del bar.
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    smtp_config = session.exec(select(SMTPConfig)).first()
    if not smtp_config or not smtp_config.smtp_user or not smtp_config.smtp_password or not smtp_config.email_remitente:
        return {
            "status": "not_configured",
            "message": "Servidor SMTP no configurado. Se abrirá la alternativa mailto local.",
            "email_to": emp.email,
            "subject": f"Horario Mensual - {month_name} {year}",
            "body_text": text_content
        }
        
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Tu Horario Mensual Bar - {month_name} {year}"
        msg['From'] = smtp_config.email_remitente
        msg['To'] = emp.email
        
        part1 = MIMEText(text_content, 'plain', 'utf-8')
        part2 = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        server = smtplib.SMTP(smtp_config.smtp_server, smtp_config.smtp_port, timeout=10)
        server.ehlo()
        if smtp_config.smtp_port == 587:
            server.starttls()
            server.ehlo()
        server.login(smtp_config.smtp_user, smtp_config.smtp_password)
        server.sendmail(smtp_config.email_remitente, emp.email, msg.as_string())
        server.quit()
        
        return {"status": "success", "message": f"Horario enviado con éxito al correo de {emp.nombre}."}
    except Exception as e:
        return {
            "status": "error_smtp",
            "message": f"Fallo al enviar el correo SMTP: {str(e)}",
            "email_to": emp.email,
            "subject": f"Horario Mensual - {month_name} {year}",
            "body_text": text_content
        }
