-- CreateTable
CREATE TABLE "Ingreso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL,
    "ticket" INTEGER,
    "paciente" TEXT NOT NULL,
    "pacienteClave" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "medioPago" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "ticketRepetido" BOOLEAN NOT NULL DEFAULT false,
    "correccion" TEXT,
    "origen" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TipoGasto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "destino" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "tipoGastoId" INTEGER NOT NULL,
    "tipoOriginal" TEXT NOT NULL,
    "medioPago" TEXT NOT NULL,
    "comprobante" TEXT NOT NULL,
    "numero" TEXT,
    "correccion" TEXT,
    "origen" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Gasto_tipoGastoId_fkey" FOREIGN KEY ("tipoGastoId") REFERENCES "TipoGasto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inicio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL,
    "paciente" TEXT NOT NULL,
    "pacienteClave" TEXT NOT NULL,
    "asesora" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "origen" TEXT NOT NULL,
    "huella" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "periodo" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "valor" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "detalle" TEXT NOT NULL,
    "vencimiento" DATETIME,
    "notas" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Configuracion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "nombreClinica" TEXT NOT NULL DEFAULT 'Clínica Dental',
    "ruc" TEXT,
    "direccion" TEXT,
    "metodoProrrateo" TEXT NOT NULL DEFAULT 'MINUTOS',
    "igvPorcentaje" REAL NOT NULL DEFAULT 0.18,
    "margenMinimo" REAL NOT NULL DEFAULT 0.20,
    "repartoMetodo" TEXT NOT NULL DEFAULT 'INGRESOS',
    "repartoOrtodoncia" REAL NOT NULL DEFAULT 0.5,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Configuracion" ("direccion", "id", "igvPorcentaje", "margenMinimo", "metodoProrrateo", "nombreClinica", "ruc", "updatedAt") SELECT "direccion", "id", "igvPorcentaje", "margenMinimo", "metodoProrrateo", "nombreClinica", "ruc", "updatedAt" FROM "Configuracion";
DROP TABLE "Configuracion";
ALTER TABLE "new_Configuracion" RENAME TO "Configuracion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Ingreso_huella_key" ON "Ingreso"("huella");

-- CreateIndex
CREATE INDEX "Ingreso_fecha_idx" ON "Ingreso"("fecha");

-- CreateIndex
CREATE INDEX "Ingreso_pacienteClave_idx" ON "Ingreso"("pacienteClave");

-- CreateIndex
CREATE UNIQUE INDEX "TipoGasto_nombre_key" ON "TipoGasto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Gasto_huella_key" ON "Gasto"("huella");

-- CreateIndex
CREATE INDEX "Gasto_fecha_idx" ON "Gasto"("fecha");

-- CreateIndex
CREATE INDEX "Gasto_tipoGastoId_idx" ON "Gasto"("tipoGastoId");

-- CreateIndex
CREATE UNIQUE INDEX "Inicio_huella_key" ON "Inicio"("huella");

-- CreateIndex
CREATE INDEX "Inicio_fecha_idx" ON "Inicio"("fecha");

-- CreateIndex
CREATE INDEX "Inicio_pacienteClave_idx" ON "Inicio"("pacienteClave");

-- CreateIndex
CREATE UNIQUE INDEX "Meta_periodo_indicador_key" ON "Meta"("periodo", "indicador");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_detalle_key" ON "Permiso"("detalle");
