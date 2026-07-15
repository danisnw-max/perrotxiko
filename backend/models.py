from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class Empleado(SQLModel, table=True):
    id: str = Field(primary_key=True)
    nombre: str
    puesto: str  # Camarero, Cocinero, Barra, Encargado, Limpieza
    telefono: Optional[str] = None
    email: Optional[str] = None
    pin: Optional[str] = Field(default=None)  # Código de 4 dígitos para fichar
    horas_semanales: float = Field(default=40.0)
    estado: str = Field(default="Activo")  # Activo, Archivado
    
    # Campos para nóminas
    nif: Optional[str] = None
    nass: Optional[str] = None
    direccion: Optional[str] = None
    iban: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    fecha_alta: Optional[str] = None
    tipo_contrato: str = Field(default="Indefinido")
    salario_base: float = Field(default=0.0)
    horas_anuales_contrato: float = Field(default=1800.0)
    preferencia_turno: str = Field(default="Alterno")  # Alterno, Mañanas, Tardes, Noches
    vacaciones_totales: int = Field(default=30)
    dias_libre_disposicion_totales: int = Field(default=2)

    # Relationships
    incidencias: List["IncidenciaEmpleado"] = Relationship(
        back_populates="empleado",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class IncidenciaEmpleado(SQLModel, table=True):
    __tablename__ = "incidenciaempleado"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    empleado_id: str = Field(foreign_key="empleado.id", index=True)
    categoria: str  # "Baja", "Permiso", "Falta"
    tipo: str       # "Común", "Profesional", "Maternidad", "Asuntos propios", "Injustificada", "Retraso", etc.
    fecha_inicio: str  # YYYY-MM-DD
    fecha_fin: Optional[str] = None  # YYYY-MM-DD
    hora_inicio: Optional[str] = None  # HH:MM
    hora_fin: Optional[str] = None  # HH:MM
    horas_totales: float = Field(default=0.0)
    retribuido: bool = Field(default=True)
    justificado: bool = Field(default=False)
    estado: str = Field(default="Aprobado")  # "Solicitado", "Aprobado", "Rechazado", "Finalizado"
    descripcion: Optional[str] = None
    documento_adjunto: Optional[str] = None
    
    # Relationship
    empleado: Optional[Empleado] = Relationship(back_populates="incidencias")

class RegistroFichaje(SQLModel, table=True):
    __tablename__ = "registrofichaje"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    empleado_id: str = Field(foreign_key="empleado.id", index=True)
    fecha: str  # YYYY-MM-DD
    hora: str   # HH:MM:SS
    tipo: str   # "Entrada", "Salida", "Inicio Pausa", "Fin Pausa"
    dispositivo: Optional[str] = Field(default="TPV")
    notas: Optional[str] = None
    
    # Relationship
    empleado: Optional[Empleado] = Relationship()

class RestriccionEmpleado(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    empleado_id: str = Field(foreign_key="empleado.id")
    fecha: str  # YYYY-MM-DD
    hora_inicio: Optional[str] = None  # HH:MM (opcional, si es nulo es todo el día)
    hora_fin: Optional[str] = None  # HH:MM
    descripcion: Optional[str] = None  # Ej. "Examen", "Médico"

class HorarioTrabajador(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    empleado_id: str = Field(foreign_key="empleado.id") # Puede ser "" si es necesidad de cobertura "Sin Asignar"
    fecha: str  # YYYY-MM-DD
    turno: str  # Mañana, Tarde, Noche, Completo, Partido, Libre, Vacaciones, Bajas, Permisos
    hora_inicio: str  # HH:MM
    hora_fin: str  # HH:MM
    notas: Optional[str] = None

class HorarioBar(SQLModel, table=True):
    dia_semana: int = Field(primary_key=True)  # 0=Lunes, 6=Domingo
    abierto: bool = Field(default=True)
    apertura_manana: Optional[str] = None  # HH:MM
    cierre_manana: Optional[str] = None  # HH:MM
    apertura_tarde: Optional[str] = None   # Turno de tarde/noche
    cierre_tarde: Optional[str] = None

class CoberturaRequerida(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    dia_semana: int = Field(index=True)  # 0=Lunes, 6=Domingo
    turno: str = Field(index=True)       # Mañana, Tarde, Noche
    puesto: str = Field(index=True)      # Camarero, Cocinero, Barra, Encargado, Limpieza
    cantidad: int = Field(default=1)     # Número de trabajadores requeridos

class SMTPConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    smtp_server: str = Field(default="smtp.gmail.com")
    smtp_port: int = Field(default=587)
    smtp_user: Optional[str] = Field(default="")
    smtp_password: Optional[str] = Field(default="")
    email_remitente: Optional[str] = Field(default="")

class Festivo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fecha: str = Field(unique=True)  # YYYY-MM-DD
    descripcion: str

class CierreBar(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fecha_inicio: str = Field(index=True)  # YYYY-MM-DD
    fecha_fin: str = Field(index=True)     # YYYY-MM-DD
    motivo: str

class EmpresaConfig(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    nombre: str = Field(default="Aterpe Bar")
    nif: str = Field(default="B-12345678")
    direccion: str = Field(default="C/ Mayor 12, San Sebastián")
    telefono: str = Field(default="943 12 34 56")
    email: str = Field(default="info@aterpebar.com")
