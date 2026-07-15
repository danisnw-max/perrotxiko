from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models import (
    HorarioBar,
    CoberturaRequerida,
    Festivo,
    CierreBar,
    EmpresaConfig,
    SMTPConfig
)
from schemas import (
    HorarioBarRead,
    CoberturaRequeridaRead,
    FestivoRead,
    EmpresaConfigRead,
    SMTPConfigRead
)

router = APIRouter(tags=["configuracion"])

# === HORARIOS APERTURA BAR ===
@router.get("/api/configuracion/horario-bar", response_model=List[HorarioBarRead])
def get_horario_bar(session: Session = Depends(get_session)):
    return session.exec(select(HorarioBar).order_by(HorarioBar.dia_semana)).all()

@router.post("/api/configuracion/horario-bar", response_model=HorarioBarRead)
def save_horario_bar(hb: HorarioBar, session: Session = Depends(get_session)):
    db_hb = session.get(HorarioBar, hb.dia_semana)
    if db_hb:
        db_hb.abierto = hb.abierto
        db_hb.apertura_manana = hb.apertura_manana
        db_hb.cierre_manana = hb.cierre_manana
        db_hb.apertura_tarde = hb.apertura_tarde
        db_hb.cierre_tarde = hb.cierre_tarde
        session.add(db_hb)
    else:
        session.add(hb)
        db_hb = hb
    session.commit()
    session.refresh(db_hb)
    return db_hb


# === COBERTURAS REQUERIDAS POR ROL ===
@router.get("/api/configuracion/coberturas", response_model=List[CoberturaRequeridaRead])
def get_coberturas(session: Session = Depends(get_session)):
    return session.exec(select(CoberturaRequerida).order_by(CoberturaRequerida.dia_semana, CoberturaRequerida.turno)).all()

@router.post("/api/configuracion/coberturas", response_model=CoberturaRequeridaRead)
def save_cobertura(cob: CoberturaRequerida, session: Session = Depends(get_session)):
    if cob.id:
        db_cob = session.get(CoberturaRequerida, cob.id)
        if db_cob:
            db_cob.dia_semana = cob.dia_semana
            db_cob.turno = cob.turno
            db_cob.puesto = cob.puesto
            db_cob.cantidad = cob.cantidad
            session.add(db_cob)
            session.commit()
            session.refresh(db_cob)
            return db_cob
            
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
