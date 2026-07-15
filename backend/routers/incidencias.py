from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import os
import uuid

from database import get_session
from models import IncidenciaEmpleado, HorarioTrabajador
from schemas import IncidenciaEmpleadoRead

router = APIRouter(tags=["incidencias"])

def sync_incident_shifts(inc: IncidenciaEmpleado, session: Session):
    # 1. Clean up ALL "Baja" and "Permiso" shifts for this employee from the incident start date onwards
    delete_stmt = select(HorarioTrabajador).where(
        HorarioTrabajador.empleado_id == inc.empleado_id,
        HorarioTrabajador.fecha >= inc.fecha_inicio,
        HorarioTrabajador.turno.in_(["Baja", "Permiso"])
    )
    for s in session.exec(delete_stmt).all():
        session.delete(s)
    session.commit()
    
    # 2. Fetch all incidents of this employee that are active/approved/finalized
    all_incidents = session.exec(
        select(IncidenciaEmpleado).where(
            IncidenciaEmpleado.empleado_id == inc.empleado_id,
            IncidenciaEmpleado.estado.in_(["Aprobado", "Finalizado"]),
            IncidenciaEmpleado.categoria.in_(["Baja", "Permiso"])
        )
    ).all()
    
    # 3. For each active incident, apply the shifts
    for item in all_incidents:
        is_full_day = not item.hora_inicio and not item.hora_fin
        if not is_full_day:
            continue
            
        start_dt = datetime.strptime(item.fecha_inicio, "%Y-%m-%d")
        end_dt_str = item.fecha_fin or item.fecha_inicio
        end_dt = datetime.strptime(end_dt_str, "%Y-%m-%d")
        
        # Clear normal shifts
        clear_stmt = select(HorarioTrabajador).where(
            HorarioTrabajador.empleado_id == item.empleado_id,
            HorarioTrabajador.fecha >= item.fecha_inicio,
            HorarioTrabajador.fecha <= end_dt_str,
            HorarioTrabajador.turno.not_in(["Baja", "Permiso"])
        )
        for s in session.exec(clear_stmt).all():
            session.delete(s)
            
        # Add Baja/Permiso shifts day-by-day
        curr_dt = start_dt
        while curr_dt <= end_dt:
            date_str = curr_dt.strftime("%Y-%m-%d")
            exists = session.exec(
                select(HorarioTrabajador).where(
                    HorarioTrabajador.empleado_id == item.empleado_id,
                    HorarioTrabajador.fecha == date_str,
                    HorarioTrabajador.turno.in_(["Baja", "Permiso"])
                )
            ).first()
            if not exists:
                new_shift = HorarioTrabajador(
                    empleado_id=item.empleado_id,
                    fecha=date_str,
                    turno=item.categoria,
                    hora_inicio="00:00",
                    hora_fin="00:00",
                    notas=f"{item.tipo} - {item.descripcion or ''}"
                )
                session.add(new_shift)
            curr_dt += timedelta(days=1)


# === INCIDENCIAS EMPLEADOS API ===
@router.get("/api/empleados/incidencias", response_model=List[IncidenciaEmpleadoRead])
def list_all_incidencias(session: Session = Depends(get_session)):
    return session.exec(select(IncidenciaEmpleado)).all()

@router.get("/api/empleados/{id}/incidencias", response_model=List[IncidenciaEmpleadoRead])
def list_incidencias_empleado(id: str, session: Session = Depends(get_session)):
    return session.exec(select(IncidenciaEmpleado).where(IncidenciaEmpleado.empleado_id == id)).all()

@router.post("/api/empleados/incidencias", response_model=IncidenciaEmpleadoRead)
def create_incidencia(inc: IncidenciaEmpleado, session: Session = Depends(get_session)):
    session.add(inc)
    session.commit()
    session.refresh(inc)
    sync_incident_shifts(inc, session)
    session.commit()
    return inc

@router.patch("/api/empleados/incidencias/{id}", response_model=IncidenciaEmpleadoRead)
def update_incidencia(id: int, fields: Dict, session: Session = Depends(get_session)):
    db_inc = session.get(IncidenciaEmpleado, id)
    if not db_inc:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    for key, val in fields.items():
        setattr(db_inc, key, val)
    session.add(db_inc)
    session.commit()
    session.refresh(db_inc)
    sync_incident_shifts(db_inc, session)
    session.commit()
    return db_inc

@router.delete("/api/empleados/incidencias/{id}")
def delete_incidencia(id: int, session: Session = Depends(get_session)):
    db_inc = session.get(IncidenciaEmpleado, id)
    if not db_inc:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    db_inc.estado = "Rechazado"
    sync_incident_shifts(db_inc, session)
    session.delete(db_inc)
    session.commit()
    return {"status": "success", "message": f"Incidencia {id} de baja/vacaciones eliminada"}

@router.post("/api/empleados/incidencias/{id}/upload", response_model=IncidenciaEmpleadoRead)
def upload_incidencia_documento(id: int, file: UploadFile = File(...), session: Session = Depends(get_session)):
    db_inc = session.get(IncidenciaEmpleado, id)
    if not db_inc:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(status_code=400, detail="Formato no permitido. Solo PDF, PNG, JPG, JPEG.")
    
    os.makedirs("uploads/justificantes", exist_ok=True)
    safe_filename = f"incidencia_{id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join("uploads", "justificantes", safe_filename)
    
    file_bytes = file.file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo supera el tamaño máximo permitido de 5MB.")
    
    if db_inc.documento_adjunto:
        old_path = os.path.join("uploads", "justificantes", db_inc.documento_adjunto)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception as e:
                print(f"Error removing old attachment: {e}")
                
    with open(filepath, "wb") as f:
        f.write(file_bytes)
        
    db_inc.documento_adjunto = safe_filename
    session.add(db_inc)
    session.commit()
    session.refresh(db_inc)
    return db_inc

@router.delete("/api/empleados/incidencias/{id}/documento")
def delete_incidencia_documento(id: int, session: Session = Depends(get_session)):
    db_inc = session.get(IncidenciaEmpleado, id)
    if not db_inc:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    
    if db_inc.documento_adjunto:
        filepath = os.path.join("uploads", "justificantes", db_inc.documento_adjunto)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                print(f"Error removing attachment: {e}")
        db_inc.documento_adjunto = None
        session.add(db_inc)
        session.commit()
        session.refresh(db_inc)
        
    return {"status": "success", "message": "Documento adjunto eliminado correctamente"}
