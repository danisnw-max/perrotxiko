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
    return {"status": "success", "message": f"Coberturas actualizadas para el día {req.fecha}"}


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
