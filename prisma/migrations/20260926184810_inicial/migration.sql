-- CreateTable
CREATE TABLE "Configuracion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "nombreClinica" TEXT NOT NULL DEFAULT 'Clínica Dental',
    "ruc" TEXT,
    "direccion" TEXT,
    "metodoProrrateo" TEXT NOT NULL DEFAULT 'MINUTOS',
    "igvPorcentaje" REAL NOT NULL DEFAULT 0.18,
    "margenMinimo" REAL NOT NULL DEFAULT 0.20,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "odontologoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Usuario_odontologoId_fkey" FOREIGN KEY ("odontologoId") REFERENCES "Odontologo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Odontologo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "cop" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "sesiones" INTEGER NOT NULL DEFAULT 1,
    "costoEsterilizacion" REAL NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "costoUnitario" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Equipo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "costoAdquisicion" REAL NOT NULL,
    "vidaUtilHoras" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "FichaMaterial" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "cantidad" REAL NOT NULL,
    CONSTRAINT "FichaMaterial_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FichaMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FichaManoObra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "rol" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL,
    "costoHora" REAL NOT NULL,
    CONSTRAINT "FichaManoObra_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FichaEquipo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "equipoId" INTEGER NOT NULL,
    "minutosUso" INTEGER NOT NULL,
    CONSTRAINT "FichaEquipo_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FichaEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FichaTercerizado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "servicioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "costo" REAL NOT NULL,
    CONSTRAINT "FichaTercerizado_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GastoIndirecto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "periodo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Atencion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "odontologoId" INTEGER NOT NULL,
    "turno" TEXT NOT NULL,
    "precioLista" REAL NOT NULL,
    "descuento" REAL NOT NULL DEFAULT 0,
    "precioCobrado" REAL NOT NULL,
    "incluyeIgv" BOOLEAN NOT NULL DEFAULT true,
    "ingresoNeto" REAL NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "estadoPago" TEXT NOT NULL,
    "montoPagado" REAL NOT NULL,
    "canal" TEXT NOT NULL,
    "costoDirectoSnapshot" REAL NOT NULL,
    "minutosSnapshot" INTEGER NOT NULL,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Atencion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Atencion_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Atencion_odontologoId_fkey" FOREIGN KEY ("odontologoId") REFERENCES "Odontologo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_odontologoId_key" ON "Usuario"("odontologoId");

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_nombre_key" ON "Servicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Material_nombre_key" ON "Material"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Equipo_nombre_key" ON "Equipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FichaMaterial_servicioId_materialId_key" ON "FichaMaterial"("servicioId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "FichaEquipo_servicioId_equipoId_key" ON "FichaEquipo"("servicioId", "equipoId");

-- CreateIndex
CREATE INDEX "GastoIndirecto_periodo_idx" ON "GastoIndirecto"("periodo");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_dni_key" ON "Paciente"("dni");

-- CreateIndex
CREATE INDEX "Atencion_fecha_idx" ON "Atencion"("fecha");

-- CreateIndex
CREATE INDEX "Atencion_servicioId_idx" ON "Atencion"("servicioId");

-- CreateIndex
CREATE INDEX "Atencion_odontologoId_idx" ON "Atencion"("odontologoId");
