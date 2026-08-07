import sqlite3

db_path = r"C:\Users\Daniel\Documents\ATERPE\SOFTWARE PERRO\backend\database.db"

def migrate():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # Create Temporada table
        c.execute("""
            CREATE TABLE IF NOT EXISTS temporada (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre VARCHAR NOT NULL,
                fecha_inicio VARCHAR,
                fecha_fin VARCHAR,
                es_defecto BOOLEAN NOT NULL
            )
        """)
        
        # Check if default exists
        c.execute("SELECT id FROM temporada WHERE nombre = 'Todo el Año'")
        row = c.fetchone()
        if not row:
            c.execute("INSERT INTO temporada (nombre, es_defecto) VALUES ('Todo el Año', 1)")
            temp_id = c.lastrowid
        else:
            temp_id = row[0]
            
        print(f"Default Temporada ID: {temp_id}")
        
        # Add temporada_id to TurnoConfig
        try:
            c.execute(f"ALTER TABLE turnoconfig ADD COLUMN temporada_id INTEGER DEFAULT {temp_id} NOT NULL REFERENCES temporada(id)")
        except sqlite3.OperationalError as e:
            print(f"TurnoConfig alter error (might exist): {e}")

        # Add temporada_id to HorarioBar
        try:
            c.execute(f"ALTER TABLE horariobar ADD COLUMN temporada_id INTEGER DEFAULT {temp_id} NOT NULL REFERENCES temporada(id)")
        except sqlite3.OperationalError as e:
            print(f"HorarioBar alter error (might exist): {e}")

        # Add temporada_id to CoberturaRequerida
        try:
            c.execute(f"ALTER TABLE coberturarequerida ADD COLUMN temporada_id INTEGER DEFAULT {temp_id} REFERENCES temporada(id)")
        except sqlite3.OperationalError as e:
            print(f"CoberturaRequerida alter error (might exist): {e}")
            
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
