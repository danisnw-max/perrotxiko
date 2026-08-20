from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
from database import get_session
from models import (
    HorarioBar,
    CoberturaRequerida,
    Festivo,
    CierreBar,
    EmpresaConfig,
    SMTPConfig,
    TurnoConfig,
    Temporada
)
from schemas import (
    HorarioBarRead,
    CoberturaRequeridaRead,
    FestivoRead,
    EmpresaConfigRead,
    SMTPConfigRead,
    TurnoConfigRead,
    TemporadaRead
)

router = APIRouter(tags=["configuracion"])

# === TEMPORADAS ===
@router.get("/api/configuracion/temporadas", response_model=List[TemporadaRead])
def get_temporadas(session: Session = Depends(get_session)):
    return session.exec(select(Temporada).order_by(Temporada.id)).all()

@router.post("/api/configuracion/temporadas", response_model=TemporadaRead)
def save_temporada(temp: Temporada, session: Session = Depends(get_session)):
    if temp.id:
        db_temp = session.get(Temporada, temp.id)
        if db_temp:
            db_temp.nombre = temp.nombre
            db_temp.fecha_inicio = temp.fecha_inicio
            db_temp.fecha_fin = temp.fecha_fin
            db_temp.es_defecto = temp.es_defecto
            session.add(db_temp)
            session.commit()
            session.refresh(db_temp)
            return db_temp
            
    session.add(temp)
    session.commit()
    session.refresh(temp)
    return temp

@router.delete("/api/configuracion/temporadas/{id}")
def delete_temporada(id: int, session: Session = Depends(get_session)):
    db_temp = session.get(Temporada, id)
    if not db_temp:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    session.delete(db_temp)
    session.commit()
    return {"detail": "Temporada eliminada correctamente"}



# === HORARIOS APERTURA BAR ===
@router.get("/api/configuracion/horario-bar", response_model=List[HorarioBarRead])
def get_horario_bar(temporada_id: int = None, session: Session = Depends(get_session)):
    q = select(HorarioBar).order_by(HorarioBar.dia_semana)
    if temporada_id:
        q = q.where(HorarioBar.temporada_id == temporada_id)
    return session.exec(q).all()

@router.post("/api/configuracion/horario-bar", response_model=HorarioBarRead)
def save_horario_bar(hb: HorarioBar, session: Session = Depends(get_session)):
    db_hb = None
    if hb.id:
        db_hb = session.get(HorarioBar, hb.id)
    else:
        # Check if one already exists for this temporada and dia_semana
        q = select(HorarioBar).where(
            HorarioBar.temporada_id == hb.temporada_id,
            HorarioBar.dia_semana == hb.dia_semana
        )
        db_hb = session.exec(q).first()
        
    if db_hb:
        db_hb.temporada_id = hb.temporada_id
        db_hb.dia_semana = hb.dia_semana
        db_hb.abierto = hb.abierto
        db_hb.hora_apertura = hb.hora_apertura
        db_hb.hora_cierre = hb.hora_cierre
        session.add(db_hb)
        session.commit()
        session.refresh(db_hb)
        return db_hb
            
    session.add(hb)
    session.commit()
    session.refresh(hb)
    return hb

@router.delete("/api/configuracion/horario-bar/{id}")
def delete_horario_bar(id: int, session: Session = Depends(get_session)):
    db_hb = session.get(HorarioBar, id)
    if not db_hb:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    session.delete(db_hb)
    session.commit()
    return {"detail": "Horario eliminado correctamente"}


# === GESTIÓN DE TURNOS (FRANJAS HORARIAS) ===
@router.get("/api/configuracion/turnos", response_model=List[TurnoConfigRead])
def get_turnos(temporada_id: int = None, session: Session = Depends(get_session)):
    q = select(TurnoConfig).order_by(TurnoConfig.nombre)
    if temporada_id:
        q = q.where(TurnoConfig.temporada_id == temporada_id)
    return session.exec(q).all()

@router.post("/api/configuracion/turnos", response_model=TurnoConfigRead)
def save_turno(turno: TurnoConfig, session: Session = Depends(get_session)):
    if turno.id:
        db_turno = session.get(TurnoConfig, turno.id)
        if db_turno:
            db_turno.temporada_id = turno.temporada_id
            db_turno.nombre = turno.nombre
            db_turno.hora_inicio = turno.hora_inicio
            db_turno.hora_fin = turno.hora_fin
            session.add(db_turno)
            session.commit()
            session.refresh(db_turno)
            return db_turno
            
    session.add(turno)
    session.commit()
    session.refresh(turno)
    return turno

@router.delete("/api/configuracion/turnos/{id}")
def delete_turno(id: int, session: Session = Depends(get_session)):
    db_turno = session.get(TurnoConfig, id)
    if not db_turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    session.delete(db_turno)
    session.commit()
    return {"detail": "Turno eliminado correctamente"}



# === COBERTURAS REQUERIDAS POR ROL ===
@router.get("/api/configuracion/coberturas", response_model=List[CoberturaRequeridaRead])
def get_coberturas(temporada_id: int = None, session: Session = Depends(get_session)):
    q = select(CoberturaRequerida).order_by(CoberturaRequerida.fecha, CoberturaRequerida.dia_semana, CoberturaRequerida.turno)
    if temporada_id:
        q = q.where(CoberturaRequerida.temporada_id == temporada_id)
    return session.exec(q).all()

@router.post("/api/configuracion/coberturas", response_model=CoberturaRequeridaRead)
def save_cobertura(cob: CoberturaRequerida, session: Session = Depends(get_session)):
    db_cob = None
    if cob.id:
        db_cob = session.get(CoberturaRequerida, cob.id)
    else:
        q = select(CoberturaRequerida).where(
            CoberturaRequerida.temporada_id == cob.temporada_id,
            CoberturaRequerida.turno == cob.turno,
            CoberturaRequerida.puesto == cob.puesto
        )
        if cob.fecha:
            q = q.where(CoberturaRequerida.fecha == cob.fecha)
        else:
            q = q.where(CoberturaRequerida.dia_semana == cob.dia_semana)
        db_cob = session.exec(q).first()

    if db_cob:
        if cob.cantidad == 0:
            session.delete(db_cob)
            session.commit()
            return db_cob

        db_cob.temporada_id = cob.temporada_id
        db_cob.dia_semana = cob.dia_semana
        db_cob.fecha = cob.fecha
        db_cob.turno = cob.turno
        db_cob.puesto = cob.puesto
        db_cob.cantidad = cob.cantidad
        db_cob.descripcion = cob.descripcion
        session.add(db_cob)
        session.commit()
        session.refresh(db_cob)
        return db_cob
            
    if cob.cantidad > 0:
        session.add(cob)
        session.commit()
        session.refresh(cob)
    return cob

@router.delete("/api/configuracion/coberturas/{id}")
def delete_cobertura(id: int, session: Session = Depends(get_session)):
    db_cob = session.get(CoberturaRequerida, id)
    if not db_cob:
        raise HTTPException(status_code=404, detail="Cobertura no encontrada")
    session.delete(db_cob)
    session.commit()
    return {"status": "success", "message": "Regla de cobertura eliminada"}

class CoberturaDiaItem(BaseModel):
    turno: str
    puesto: str
    cantidad: int
    descripcion: Optional[str] = None
    temporada_id: Optional[int] = None

class CoberturaDiaBatchRequest(BaseModel):
    fecha: str
    coberturas: List[CoberturaDiaItem]

@router.post("/api/configuracion/coberturas/dia")
def save_coberturas_dia(req: CoberturaDiaBatchRequest, session: Session = Depends(get_session)):
    # 1. Delete all existing coverages for this specific date
    existing = session.exec(select(CoberturaRequerida).where(CoberturaRequerida.fecha == req.fecha)).all()
    for cob in existing:
        session.delete(cob)
    
    # 2. Add new coverages if quantity > 0
    for item in req.coberturas:
        if item.cantidad > 0:
            db_cob = CoberturaRequerida(
                fecha=req.fecha,
                dia_semana=None, # specific date
                turno=item.turno,
                puesto=item.puesto,
                cantidad=item.cantidad,
                descripcion=item.descripcion or "",
                temporada_id=item.temporada_id
            )
            session.add(db_cob)
    
    session.commit()

    # 3. Synchronize HorarioTrabajador shifts for this date
    from models import HorarioTrabajador, Empleado
    from datetime import datetime
    
    # Determine the effective coverages to sync against
    effective_coberturas = []
    if not req.coberturas:
        d = datetime.strptime(req.fecha, "%Y-%m-%d")
        weekday = d.weekday()
        generic_cobs = session.exec(
            select(CoberturaRequerida)
            .where(CoberturaRequerida.dia_semana == weekday)
            .where((CoberturaRequerida.fecha == None) | (CoberturaRequerida.fecha == ""))
        ).all()
        for gc in generic_cobs:
            effective_coberturas.append(CoberturaDiaItem(
                turno=gc.turno,
                puesto=gc.puesto,
                cantidad=gc.cantidad,
                descripcion="Plantilla habitual",
                temporada_id=gc.temporada_id
            ))
    else:
        effective_coberturas = req.coberturas
    # Group effective coverages by (turno, puesto)
    coverage_demands = {}
    for item in effective_coberturas:
        key = (item.turno, item.puesto)
        coverage_demands[key] = max(coverage_demands.get(key, 0), item.cantidad)

    # Load existing shifts on this date
    existing_shifts = session.exec(select(HorarioTrabajador).where(HorarioTrabajador.fecha == req.fecha)).all()
    employees_map = {e.id: e for e in session.exec(select(Empleado)).all()}

    # Resolve each existing shift's role and clean name
    resolved_shifts = []
    for s in existing_shifts:
        if s.turno in ["Vacaciones", "Libre Disposición", "Baja", "Permiso", "Libre"]:
            continue
            
        puesto = None
        if s.notas:
            for p in ["Sala", "Barra", "Cocinero", "Encargado", "Limpieza"]:
                if p.lower() in s.notas.lower():
                    puesto = p
                    break
        
        if not puesto:
            if s.empleado_id and s.empleado_id in employees_map:
                puesto = employees_map[s.empleado_id].puesto
            else:
                puesto = "Sala"
                
        resolved_shifts.append({
            "shift": s,
            "puesto": puesto,
            "hora_inicio": s.hora_inicio,
            "hora_fin": s.hora_fin,
            "clean_turno": s.turno.replace(" (Cobertura)", "").strip()
        })

    def get_time_overlap_minutes(start1: str, end1: str, start2: str, end2: str) -> int:
        def to_mins(t):
            parts = t.split(":")
            return int(parts[0]) * 60 + int(parts[1])
        try:
            s1, e1 = to_mins(start1), to_mins(end1)
            if e1 < s1: e1 += 1440
            s2, e2 = to_mins(start2), to_mins(end2)
            if e2 < s2: e2 += 1440
            overlap_start = max(s1, s2)
            overlap_end = min(e1, e2)
            if overlap_start < overlap_end:
                return overlap_end - overlap_start
        except Exception:
            pass
        return 0

    # Sync
    turno_configs = {tc.nombre: tc for tc in session.exec(select(TurnoConfig)).all()}

    # We iterate over all requested coverages to ensure we meet them
    for key, target_qty in coverage_demands.items():
        turno, puesto = key
        
        # Get target times for this turno name
        tc = turno_configs.get(turno)
        if tc:
            t_start, t_end = tc.hora_inicio, tc.hora_fin
        else:
            if "mañana" in turno.lower():
                t_start, t_end = "09:00", "16:00"
            elif "tarde" in turno.lower():
                t_start, t_end = "16:00", "00:00"
            else:
                t_start, t_end = "19:00", "02:30"
                
        # Find existing shifts that cover this (matching role AND either clean name match OR overlap >= 90 mins)
        matching_shifts = [
            rs for rs in resolved_shifts 
            if rs["puesto"] == puesto 
            and (rs["clean_turno"] == turno or get_time_overlap_minutes(rs["hora_inicio"], rs["hora_fin"], t_start, t_end) >= 90)
        ]
        
        existing_count = len(matching_shifts)

        if existing_count < target_qty:
            # Need to create missing unassigned shifts
            for _ in range(target_qty - existing_count):
                new_shift = HorarioTrabajador(
                    empleado_id="",
                    fecha=req.fecha,
                    turno=turno,
                    hora_inicio=t_start,
                    hora_fin=t_end,
                    notas=f"Generado: {puesto} (Refuerzo especial)"
                )
                session.add(new_shift)

        elif existing_count > target_qty:
            # Need to delete extra unassigned shifts
            unassigned_matching = [rs["shift"] for rs in matching_shifts if not rs["shift"].empleado_id or rs["shift"].empleado_id == ""]
            to_delete_count = existing_count - target_qty
            deleted = 0
            for s in unassigned_matching:
                if deleted >= to_delete_count:
                    break
                session.delete(s)
                deleted += 1

    session.commit()
    return {"status": "success", "message": f"Coberturas actualizadas y turnos sincronizados para el día {req.fecha}"}


# === FESTIVOS ===
@router.get("/api/configuracion/festivos", response_model=List[FestivoRead])
def get_festivos(session: Session = Depends(get_session)):
    return session.exec(select(Festivo).order_by(Festivo.fecha)).all()

@router.post("/api/configuracion/festivos", response_model=FestivoRead)
def save_festivo(festivo: Festivo, session: Session = Depends(get_session)):
    if festivo.id:
        db_f = session.get(Festivo, festivo.id)
        if db_f:
            db_f.fecha = festivo.fecha
            db_f.descripcion = festivo.descripcion
            session.add(db_f)
            session.commit()
            session.refresh(db_f)
            return db_f
            
    # Check if duplicate date
    exists = session.exec(select(Festivo).where(Festivo.fecha == festivo.fecha)).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un festivo registrado en esta fecha.")
        
    session.add(festivo)
    session.commit()
    session.refresh(festivo)
    return festivo

@router.delete("/api/configuracion/festivos/{id}")
def delete_festivo(id: int, session: Session = Depends(get_session)):
    db_f = session.get(Festivo, id)
    if not db_f:
        raise HTTPException(status_code=404, detail="Festivo no encontrado")
    session.delete(db_f)
    session.commit()
    return {"status": "success", "message": "Festivo eliminado"}


# === CIERRES DEL BAR ===
@router.get("/api/configuracion/cierres", response_model=List[CierreBar])
def get_cierres(session: Session = Depends(get_session)):
    return session.exec(select(CierreBar).order_by(CierreBar.fecha_inicio)).all()

@router.post("/api/configuracion/cierres", response_model=CierreBar)
def save_cierre(cierre: CierreBar, session: Session = Depends(get_session)):
    if cierre.id:
        db_c = session.get(CierreBar, cierre.id)
        if db_c:
            db_c.fecha_inicio = cierre.fecha_inicio
            db_c.fecha_fin = cierre.fecha_fin
            db_c.motivo = cierre.motivo
            session.add(db_c)
            session.commit()
            session.refresh(db_c)
            return db_c
    session.add(cierre)
    session.commit()
    session.refresh(cierre)
    return cierre

@router.delete("/api/configuracion/cierres/{id}")
def delete_cierre(id: int, session: Session = Depends(get_session)):
    db_c = session.get(CierreBar, id)
    if not db_c:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")
    session.delete(db_c)
    session.commit()
    return {"status": "success", "message": "Periodo de cierre eliminado"}


# === CONFIGURACION EMPRESA ===
@router.get("/api/configuracion/empresa", response_model=EmpresaConfigRead)
def get_empresa(session: Session = Depends(get_session)):
    db_emp = session.exec(select(EmpresaConfig)).first()
    if not db_emp:
        db_emp = EmpresaConfig()
        session.add(db_emp)
        session.commit()
        session.refresh(db_emp)
    return db_emp

@router.post("/api/configuracion/empresa", response_model=EmpresaConfigRead)
def save_empresa(emp: EmpresaConfig, session: Session = Depends(get_session)):
    db_emp = session.exec(select(EmpresaConfig)).first()
    if not db_emp:
        db_emp = EmpresaConfig()
    
    db_emp.nombre = emp.nombre
    db_emp.nif = emp.nif
    db_emp.direccion = emp.direccion
    db_emp.telefono = emp.telefono
    db_emp.email = emp.email
    
    session.add(db_emp)
    session.commit()
    session.refresh(db_emp)
    return db_emp


# === SMTP CONFIG ===
@router.get("/api/configuracion/smtp", response_model=SMTPConfigRead)
def get_smtp_config(session: Session = Depends(get_session)):
    db_smtp = session.exec(select(SMTPConfig)).first()
    if not db_smtp:
        db_smtp = SMTPConfig()
        session.add(db_smtp)
        session.commit()
        session.refresh(db_smtp)
    return db_smtp

@router.post("/api/configuracion/smtp", response_model=SMTPConfigRead)
def save_smtp_config(cfg: SMTPConfig, session: Session = Depends(get_session)):
    db_smtp = session.exec(select(SMTPConfig)).first()
    if not db_smtp:
        db_smtp = SMTPConfig()
        
    db_smtp.smtp_server = cfg.smtp_server
    db_smtp.smtp_port = cfg.smtp_port
    db_smtp.smtp_user = cfg.smtp_user
    db_smtp.smtp_password = cfg.smtp_password
    db_smtp.email_remitente = cfg.email_remitente
    
    session.add(db_smtp)
    session.commit()
    session.refresh(db_smtp)
    return db_smtp
