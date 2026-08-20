from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime
from database import get_session
from models import SolicitudCambioTurno, HorarioTrabajador
from schemas import SolicitudCambioTurnoCreate, SolicitudCambioTurnoRead, SolicitudCambioTurnoUpdate

router = APIRouter(
    prefix="/cambios-turno",
    tags=["cambios-turno"],
)

@router.post("/", response_model=SolicitudCambioTurnoRead)
def create_cambio_turno(*, session: Session = Depends(get_session), solicitud: SolicitudCambioTurnoCreate):
    db_solicitud = SolicitudCambioTurno(
        **solicitud.dict(),
        estado="Pendiente",
        fecha_solicitud=datetime.now().isoformat()
    )
    session.add(db_solicitud)
    session.commit()
    session.refresh(db_solicitud)
    return db_solicitud

@router.get("/", response_model=List[SolicitudCambioTurnoRead])
def read_cambios_turno(*, session: Session = Depends(get_session), estado: str = None):
    query = select(SolicitudCambioTurno)
    if estado:
        query = query.where(SolicitudCambioTurno.estado == estado)
    results = session.exec(query).all()
    return results

@router.put("/{solicitud_id}/estado", response_model=SolicitudCambioTurnoRead)
def update_estado_cambio_turno(
    *, 
    session: Session = Depends(get_session), 
    solicitud_id: int, 
    update_data: SolicitudCambioTurnoUpdate
):
    db_solicitud = session.get(SolicitudCambioTurno, solicitud_id)
    if not db_solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if db_solicitud.estado != "Pendiente":
        raise HTTPException(status_code=400, detail="Solo se pueden modificar solicitudes pendientes")
        
    db_solicitud.estado = update_data.estado
    
    if update_data.estado == "Aprobado":
        # Ejecutar el intercambio de turnos
        turno_origen = session.get(HorarioTrabajador, db_solicitud.turno_origen_id)
        if turno_origen:
            turno_origen.empleado_id = db_solicitud.empleado_destino_id
            session.add(turno_origen)
            
        if db_solicitud.turno_destino_id:
            turno_destino = session.get(HorarioTrabajador, db_solicitud.turno_destino_id)
            if turno_destino:
                turno_destino.empleado_id = db_solicitud.empleado_origen_id
                session.add(turno_destino)
                
    session.add(db_solicitud)
    session.commit()
    session.refresh(db_solicitud)
    return db_solicitud
