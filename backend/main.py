from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import os
from datetime import datetime

from database import engine, create_db_and_tables
from models import Empleado, HorarioBar, CoberturaRequerida, EmpresaConfig
from routers.empleados import router as empleados_router
from routers.incidencias import router as incidencias_router
from routers.presencia import router as presencia_router
from routers.configuracion import router as configuracion_router

app = FastAPI(title="Aterpe Bar Employee Management API", version="1.0.0")

# Mount Uploads static files folder and ensure directory exists
os.makedirs("uploads/justificantes", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Enable CORS for multi-device local access (FastAPI on localhost:8000, Vite on localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_database(session: Session):
    # 1. Seed EmpresaConfig
    if session.exec(select(EmpresaConfig)).first() is None:
        session.add(EmpresaConfig(
            nombre="Aterpe Bar",
            nif="B-87654321",
            direccion="C/ Mayor 12, San Sebastián",
            telefono="943 12 34 56",
            email="contacto@aterpebar.com"
        ))
        session.commit()
        print("EmpresaConfig seeded!")

    # 2. Seed Default Employees
    if session.exec(select(Empleado)).first() is None:
        default_employees = [
            Empleado(id="E-001", nombre="Daniel Encargado", puesto="Encargado", telefono="600111222", email="daniel@aterpebar.com", pin="1234", horas_semanales=40, tipo_contrato="Indefinido", salario_base=1800, preferencia_turno="Alterno"),
            Empleado(id="E-002", nombre="Mikel Cocinero", puesto="Cocinero", telefono="600333444", email="mikel@aterpebar.com", pin="2345", horas_semanales=40, tipo_contrato="Indefinido", salario_base=1600, preferencia_turno="Mañanas"),
            Empleado(id="E-003", nombre="Sara Cocinera", puesto="Cocinero", telefono="600444555", email="sara@aterpebar.com", pin="3456", horas_semanales=30, tipo_contrato="Temporal", salario_base=1200, preferencia_turno="Tardes"),
            Empleado(id="E-004", nombre="Ane Camarera", puesto="Camarero", telefono="600555666", email="ane@aterpebar.com", pin="4567", horas_semanales=40, tipo_contrato="Indefinido", salario_base=1300, preferencia_turno="Alterno"),
            Empleado(id="E-005", nombre="Jon Camarero", puesto="Camarero", telefono="600666777", email="jon@aterpebar.com", pin="5678", horas_semanales=20, tipo_contrato="Temporal", salario_base=700, preferencia_turno="Tardes"),
            Empleado(id="E-006", nombre="Lander Barra", puesto="Barra", telefono="600777888", email="lander@aterpebar.com", pin="6789", horas_semanales=40, tipo_contrato="Indefinido", salario_base=1300, preferencia_turno="Noches"),
            Empleado(id="E-007", nombre="Marta Limpieza", puesto="Limpieza", telefono="600888999", email="marta@aterpebar.com", pin="9999", horas_semanales=15, tipo_contrato="Indefinido", salario_base=500, preferencia_turno="Mañanas"),
        ]
        for emp in default_employees:
            session.add(emp)
        session.commit()
        print("Default employees seeded!")

    # 3. Seed HorarioBar (Commercial hours for a bar, usually 08:00 - 01:00, or split shifts)
    if session.exec(select(HorarioBar)).first() is None:
        for i in range(7):
            # Mon-Thu: 09:00 - 16:00, 19:00 - 00:00
            # Fri-Sat: 09:00 - 16:00, 18:00 - 02:00
            # Sun: 09:00 - 17:00 (Cerrado por la tarde)
            abierto = True
            ap_m = "09:00"
            ci_m = "16:00"
            if i < 4:  # Lun-Jue
                ap_t = "19:00"
                ci_t = "00:00"
            elif i < 6:  # Vie-Sab
                ap_t = "18:00"
                ci_t = "02:00"
            else:  # Dom
                ap_t = None
                ci_t = None
                ci_m = "17:00"
                
            session.add(HorarioBar(
                dia_semana=i,
                abierto=abierto,
                apertura_manana=ap_m,
                cierre_manana=ci_m,
                apertura_tarde=ap_t,
                cierre_tarde=ci_t
            ))
        session.commit()
        print("HorarioBar seeded!")

    # 4. Seed Default Coberturas Requeridas
    if session.exec(select(CoberturaRequerida)).first() is None:
        # Weekdays (dia_semana 0 to 4)
        for d in range(5):
            # Mañana
            session.add(CoberturaRequerida(dia_semana=d, turno="Mañana", puesto="Cocinero", cantidad=1))
            session.add(CoberturaRequerida(dia_semana=d, turno="Mañana", puesto="Camarero", cantidad=1))
            # Tarde/Noche
            session.add(CoberturaRequerida(dia_semana=d, turno="Tarde", puesto="Cocinero", cantidad=1))
            session.add(CoberturaRequerida(dia_semana=d, turno="Tarde", puesto="Camarero", cantidad=1))
            session.add(CoberturaRequerida(dia_semana=d, turno="Tarde", puesto="Barra", cantidad=1))
            session.add(CoberturaRequerida(dia_semana=d, turno="Tarde", puesto="Encargado", cantidad=1))

        # Weekend: Viernes/Sábado (dia_semana 4 & 5) - we add reinforcement
        # Friday tarde/noche needs extra
        session.add(CoberturaRequerida(dia_semana=4, turno="Tarde", puesto="Camarero", cantidad=2)) # Total 3 camareros
        # Saturday
        session.add(CoberturaRequerida(dia_semana=5, turno="Mañana", puesto="Cocinero", cantidad=1))
        session.add(CoberturaRequerida(dia_semana=5, turno="Mañana", puesto="Camarero", cantidad=2))
        session.add(CoberturaRequerida(dia_semana=5, turno="Tarde", puesto="Cocinero", cantidad=2))
        session.add(CoberturaRequerida(dia_semana=5, turno="Tarde", puesto="Camarero", cantidad=3))
        session.add(CoberturaRequerida(dia_semana=5, turno="Tarde", puesto="Barra", cantidad=2))
        session.add(CoberturaRequerida(dia_semana=5, turno="Tarde", puesto="Encargado", cantidad=1))

        # Sunday (dia_semana 6)
        session.add(CoberturaRequerida(dia_semana=6, turno="Mañana", puesto="Cocinero", cantidad=1))
        session.add(CoberturaRequerida(dia_semana=6, turno="Mañana", puesto="Camarero", cantidad=2))

        session.commit()
        print("Default CoberturaRequerida seeded!")

@app.on_event("startup")
async def on_startup():
    create_db_and_tables()
    with Session(engine) as session:
        seed_database(session)

@app.get("/api/status")
def get_status():
    return {"status": "ok", "service": "Aterpe Bar Employee Management API", "timestamp": datetime.now().isoformat()}

# Include Routers
app.include_router(empleados_router)
app.include_router(incidencias_router)
app.include_router(presencia_router)
app.include_router(configuracion_router)
