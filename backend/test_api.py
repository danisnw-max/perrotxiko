import os
import sys
from sqlmodel import Session, SQLModel, create_engine, select

# Add current folder to path
sys.path.append(os.path.dirname(__file__))

from models import Empleado, HorarioBar, CoberturaRequerida, HorarioTrabajador, RegistroFichaje
from database import get_session

def test_database_creation_and_seeding():
    print("[Test] Starting database check...")
    
    test_db_url = "sqlite:///test_database.db"
    engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    
    # Recreate tables
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    print("[Test] SQLite tables created successfully!")
    
    # Test session insert
    with Session(engine) as session:
        # Create test employee
        emp = Empleado(
            id="E-999", 
            nombre="Juan Carlos Cocina", 
            puesto="Cocinero", 
            pin="1234", 
            horas_semanales=40.0
        )
        session.add(emp)
        session.commit()
        
        # Query employee back
        db_emp = session.exec(select(Empleado).where(Empleado.id == "E-999")).first()
        assert db_emp is not None
        assert db_emp.nombre == "Juan Carlos Cocina"
        assert db_emp.puesto == "Cocinero"
        print("[Test] Employee CRUD model verified!")
        
        # Test default opening hours
        hb = HorarioBar(
            dia_semana=0, 
            abierto=True, 
            apertura_manana="09:00", 
            cierre_manana="16:00",
            apertura_tarde="19:00",
            cierre_tarde="00:00"
        )
        session.add(hb)
        session.commit()
        
        db_hb = session.get(HorarioBar, 0)
        assert db_hb.apertura_manana == "09:00"
        print("[Test] Opening Hours model verified!")

        # Test worked hours calculations
        from routers.presencia import calculate_working_hours
        punches = [
            RegistroFichaje(empleado_id="E-999", fecha="2026-07-15", hora="09:00:00", tipo="Entrada"),
            RegistroFichaje(empleado_id="E-999", fecha="2026-07-15", hora="14:00:00", tipo="Inicio Pausa"),
            RegistroFichaje(empleado_id="E-999", fecha="2026-07-15", hora="14:30:00", tipo="Fin Pausa"),
            RegistroFichaje(empleado_id="E-999", fecha="2026-07-15", hora="16:00:00", tipo="Salida"),
        ]
        # 9:00 to 14:00 = 5h. 14:30 to 16:00 = 1.5h. Total = 6.5h.
        worked_hours = calculate_working_hours(punches)
        assert worked_hours == 6.5
        print(f"[Test] Clock-in worked hours calculator verified: {worked_hours}h (Expected: 6.5h)")

    # Cleanup test DB
    engine.dispose()
    if os.path.exists("test_database.db"):
        os.remove("test_database.db")
    print("[Test] All backend core test suites passed successfully!")

if __name__ == "__main__":
    test_database_creation_and_seeding()

