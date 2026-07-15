from pydantic import BaseModel
from typing import Optional, List, Dict

class EmpleadoBase(BaseModel):
    id: str
    nombre: str
    puesto: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    horas_semanales: float = 40.0
    estado: str = "Activo"
    nif: Optional[str] = None
    nass: Optional[str] = None
    direccion: Optional[str] = None
    iban: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    fecha_alta: Optional[str] = None
    tipo_contrato: str = "Indefinido"
    salario_base: float = 0.0
    horas_anuales_contrato: float = 1800.0
    preferencia_turno: str = "Alterno"
    vacaciones_totales: int = 30
    dias_libre_disposicion_totales: int = 2
    pin: Optional[str] = None

class EmpleadoCreate(EmpleadoBase):
    pass

class EmpleadoRead(EmpleadoBase):
    vacaciones_usadas: int = 0
    vacaciones_restantes: int = 30
    dias_libre_disposicion_usados: int = 0
    dias_libre_disposicion_restantes: int = 2
    horas_realizadas_mes: float = 0.0
    horas_realizadas_anio: float = 0.0

class RestriccionEmpleadoBase(BaseModel):
    id: Optional[int] = None
    empleado_id: str
    fecha: str
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    descripcion: Optional[str] = None

class RestriccionEmpleadoCreate(RestriccionEmpleadoBase):
    pass

class RestriccionEmpleadoRead(RestriccionEmpleadoBase):
    pass

class HorarioTrabajadorBase(BaseModel):
    id: Optional[int] = None
    empleado_id: str
    fecha: str
    turno: str
    hora_inicio: str
    hora_fin: str
    notas: Optional[str] = None

class HorarioTrabajadorCreate(HorarioTrabajadorBase):
    pass

class HorarioTrabajadorRead(HorarioTrabajadorBase):
    pass

class HorarioBarBase(BaseModel):
    dia_semana: int
    abierto: bool = True
    apertura_manana: Optional[str] = None
    cierre_manana: Optional[str] = None
    apertura_tarde: Optional[str] = None
    cierre_tarde: Optional[str] = None

class HorarioBarCreate(HorarioBarBase):
    pass

class HorarioBarRead(HorarioBarBase):
    pass

class CoberturaRequeridaBase(BaseModel):
    id: Optional[int] = None
    dia_semana: int
    turno: str
    puesto: str
    cantidad: int = 1

class CoberturaRequeridaCreate(CoberturaRequeridaBase):
    pass

class CoberturaRequeridaRead(CoberturaRequeridaBase):
    pass

class SMTPConfigBase(BaseModel):
    id: Optional[int] = None
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    email_remitente: Optional[str] = ""

class SMTPConfigRead(SMTPConfigBase):
    pass

class FestivoBase(BaseModel):
    id: Optional[int] = None
    fecha: str
    descripcion: str

class FestivoCreate(FestivoBase):
    pass

class FestivoRead(FestivoBase):
    pass

class IncidenciaEmpleadoBase(BaseModel):
    id: Optional[int] = None
    empleado_id: str
    categoria: str
    tipo: str
    fecha_inicio: str
    fecha_fin: Optional[str] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    horas_totales: float = 0.0
    retribuido: bool = True
    justificado: bool = False
    estado: str = "Aprobado"
    descripcion: Optional[str] = None
    documento_adjunto: Optional[str] = None

class IncidenciaEmpleadoCreate(IncidenciaEmpleadoBase):
    pass

class IncidenciaEmpleadoRead(IncidenciaEmpleadoBase):
    pass

class RegistroFichajeBase(BaseModel):
    id: Optional[int] = None
    empleado_id: str
    fecha: str
    hora: str
    tipo: str
    dispositivo: Optional[str] = "TPV"
    notas: Optional[str] = None

class RegistroFichajeCreate(RegistroFichajeBase):
    pass

class RegistroFichajeRead(RegistroFichajeBase):
    pass

class ResumenFichajesDia(BaseModel):
    fecha: str
    empleado_id: str
    empleado_nombre: str
    primer_fichaje: Optional[str] = None
    ultimo_fichaje: Optional[str] = None
    horas_trabajadas: float = 0.0
    fichajes: List[RegistroFichajeRead] = []

class PrePayrollSummary(BaseModel):
    empleado_id: str
    empleado_nombre: str
    nif: Optional[str] = None
    nass: Optional[str] = None
    iban: Optional[str] = None
    salario_base: float = 0.0
    horas_contrato_mes: float = 0.0
    horas_planificadas: float = 0.0
    horas_trabajadas: float = 0.0
    horas_extra: float = 0.0
    dias_trabajados: int = 0
    dias_baja: int = 0
    dias_permiso: int = 0
    dias_vacaciones: int = 0
    dias_falta: int = 0

class EmpresaConfigBase(BaseModel):
    nombre: str
    nif: str
    direccion: str
    telefono: str
    email: str

class EmpresaConfigRead(EmpresaConfigBase):
    id: int

class EmpresaConfigUpdate(EmpresaConfigBase):
    pass
