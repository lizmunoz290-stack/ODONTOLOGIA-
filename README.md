# Gestión y rentabilidad de clínica dental 🦷

Aplicación web para gestionar y analizar los servicios de una clínica dental en Perú. Responde a:

- ¿Qué servicio es el **más vendido** y cuál el **más rentable**?
- ¿Qué **recursos** requiere cada servicio (materiales, mano de obra, equipos, esterilización, laboratorio)?
- ¿Cuánto **cuesta realmente** cada atención, sumando los **costos directos** y los **indirectos** prorrateados?

Todo se ve en pantalla y se puede **descargar en Excel**. La interfaz está en español, los montos en soles (S/) y las fechas en formato dd/mm/aaaa (hora de Lima).

---

## Contenido

1. [Funcionalidades](#funcionalidades)
2. [Tecnologías](#tecnologías)
3. [Instalación](#instalación)
4. [Usuarios de prueba](#usuarios-de-prueba)
5. [Guía de uso](#guía-de-uso)
6. [Cómo se calculan los costos](#cómo-se-calculan-los-costos)
7. [Reportes Excel](#reportes-excel)
8. [Roles y permisos](#roles-y-permisos)
9. [Estructura del proyecto](#estructura-del-proyecto)
10. [Pruebas](#pruebas)
11. [Pasar a producción y a PostgreSQL](#pasar-a-producción-y-a-postgresql)
12. [Supuestos y decisiones](#supuestos-y-decisiones)

---

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Catálogo de servicios** | Servicios con categoría (preventiva, restauradora, endodoncia, cirugía, ortodoncia, estética, prótesis, implantología), precio, duración, n.º de sesiones y estado activo/inactivo. |
| **Ficha técnica** | Por servicio: materiales e insumos, mano de obra directa (odontólogo y asistente), equipos (depreciación por minuto), esterilización e instrumental, y servicios tercerizados (laboratorio, radiografías externas). Calcula el **costo directo total** al instante. |
| **Materiales y equipos** | Catálogos reutilizables. Si cambia el costo de un material, se actualizan todas las fichas que lo usan. |
| **Costos indirectos** | Gastos fijos mensuales por categoría (alquiler, luz, agua, sueldos administrativos, marketing, etc.), con opción de copiar el mes anterior. Prorrateo por **minutos de sillón** (por defecto), **número de atenciones** o **% de ingresos**, mostrando la fórmula con números y una comparación de los tres métodos. |
| **Atenciones (ventas)** | Registro con paciente (DNI opcional), servicio, odontólogo, turno, precio de lista, descuento, IGV, método de pago (efectivo, tarjeta, Yape/Plin, transferencia), estado (pagado/pendiente/parcial), canal de captación y registro de abonos. |
| **Importación desde Excel** | Plantilla descargable con listas desplegables. Primero se valida (con errores por número de fila) y luego se importan las filas válidas. |
| **Dashboard** | Filtros por fechas, odontólogo, categoría y turno. KPIs, alertas de margen, evolución mensual, ingresos por categoría, rankings, rentabilidad por servicio, punto de equilibrio y productividad por odontólogo y turno. |
| **Reportes** | 8 reportes en pantalla con botón **Descargar Excel** (ver [Reportes Excel](#reportes-excel)). |
| **Finanzas (libro contable)** | Importa el Excel de ingresos y gastos reales de la clínica (formato *ODM - INFORME*), corrige fechas y tipos de gasto, y muestra el **estado de resultados por especialidad** (Ortodoncia y Odontología), metas contra avance, inicios por asesora con su conversión y permisos por vencer. |
| **Usuarios y roles** | Administrador, Caja/Secretaría y Odontólogo, cada uno con sus permisos. |

La aplicación es **responsive**: funciona en celular (menú desplegable, tablas con desplazamiento horizontal).

## Tecnologías

- **Next.js 15** (App Router, Server Components y Server Actions) + **TypeScript**
- **Tailwind CSS 4**
- **Prisma 6** + **SQLite** (se puede pasar a PostgreSQL)
- **Recharts** (gráficos), **ExcelJS** (exportación e importación de Excel)
- **Zod** (validaciones con mensajes en español)
- Autenticación propia: contraseñas con **bcrypt** y sesión en cookie firmada (JWT con **jose**)
- **Vitest** (pruebas unitarias)

## Instalación

**Requisitos:** Node.js 20 o superior y npm.

```bash
# 1. Instalar dependencias (también genera el cliente de Prisma)
npm install

# 2. Crear el archivo de variables de entorno
cp .env.example .env
#    Edite AUTH_SECRET y ponga una clave aleatoria de 32 caracteres o más, por ejemplo:
#    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Crear la base de datos y cargar los datos de ejemplo
npm run setup

# 4. Iniciar en modo desarrollo
npm run dev
```

Abra <http://localhost:3000> e ingrese con alguno de los [usuarios de prueba](#usuarios-de-prueba).

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y ejecutar en modo producción |
| `npm test` | Pruebas unitarias |
| `npm run lint` | Revisión de código (ESLint) |
| `npm run setup` | Aplica las migraciones y carga los datos de ejemplo |
| `npm run db:seed` | Borra **todos** los datos y vuelve a cargar los de ejemplo |
| `npm run db:reset` | Borra la base de datos, la recrea y carga los datos de ejemplo |
| `npm run db:migrate` | Crea una nueva migración tras modificar `prisma/schema.prisma` |

### Datos de ejemplo

`npm run setup` (o `npm run db:seed`) carga:

- **13 servicios** con ficha técnica completa: profilaxis, destartraje, resina simple, resina compuesta, endodoncia unirradicular y multirradicular, extracción simple y de tercera molar, blanqueamiento, ortodoncia (mensualidad), corona, carilla e implante.
- **37 materiales**, **11 equipos** y **4 odontólogos**.
- **6 meses** de gastos indirectos (~S/ 16,800 al mes) y de atenciones (~1,850) con variaciones realistas: crecimiento mensual, descuentos por telemarketing, pagos pendientes, IGV y turnos.

Los datos se generan con una semilla fija, así que siempre salen iguales. Dos servicios quedan intencionalmente con margen bajo (profilaxis y endodoncia unirradicular) para que se vean las alertas.

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@clinica.pe` | `admin123` |
| Caja / Secretaría | `caja@clinica.pe` | `caja123` |
| Odontólogo (Dra. Ana Torres) | `ana.torres@clinica.pe` | `odonto123` |
| Odontólogo (Dr. Luis Quispe) | `luis.quispe@clinica.pe` | `odonto123` |
| Odontólogo (Dra. María Rojas) | `maria.rojas@clinica.pe` | `odonto123` |
| Odontólogo (Dr. Carlos Mendoza) | `carlos.mendoza@clinica.pe` | `odonto123` |

> ⚠️ Cambie estas contraseñas (menú **Usuarios**, o **Mi perfil** haciendo clic en su nombre) antes de usar la aplicación con datos reales.

## Guía de uso

Orden recomendado para configurar una clínica real:

1. **Configuración**: nombre de la clínica, RUC, IGV (18 %) y margen mínimo aceptable (20 %).
2. **Materiales** y **Equipos**: registre sus insumos con su costo unitario y sus equipos con el costo de adquisición y la vida útil en horas.
3. **Odontólogos** y **Usuarios**: registre a los profesionales y cree las cuentas del equipo.
4. **Servicios**: cree cada servicio y complete su **ficha técnica**. El costo directo se calcula mientras la llena.
5. **Costos indirectos**: registre los gastos fijos de cada mes (o use *Copiar gastos del mes anterior*) y elija el método de prorrateo.
6. **Atenciones**: regístrelas día a día o impórtelas desde Excel (*Atenciones → Importar desde Excel → Descargar plantilla*).
7. **Dashboard** y **Reportes**: analice los resultados y descargue los Excel.

## Finanzas: libro contable

En el menú **Finanzas → Importar libro**, suba el Excel con las hojas `INGRESOS AAAA`, `GASTOS AAAA`, `INICIOS AAAA`, `REPORTE MENSUAL` (metas) y `PERMISOS`. Primero pulse **Revisar archivo** para ver qué se leyó y qué se corrigió, y luego **Importar**. Puede subir el mismo archivo cada mes: cada fila tiene una huella y solo se agregan las nuevas.

**Correcciones automáticas al importar:**

- Se omiten los tickets **ANULADO** y las filas sin monto.
- Se ignoran los títulos y encabezados repetidos dentro de una hoja.
- Se corrigen los **años mal escritos**, por ejemplo 26/12/**2025** dentro de la hoja 2024, comparando cada fecha con la fila anterior.
- Las fechas escritas como texto ("22-07") se convierten, y las filas sin fecha toman la de la fila anterior.
- Se unifican los tipos de gasto escritos de distinta forma (RYDENT/RAYDENT…).
- El tipo **OTROS** se reparte según la descripción: alquiler, luz, agua, Entel, SUNAT, publicidad, sueldos, retiros de utilidad, préstamos…
- Se marcan los **tickets repetidos** para revisarlos en *Finanzas → Ingresos*.

**Clasificación de gastos** (*Finanzas → Clasificación de gastos*). Cada tipo de gasto va a una de estas clasificaciones:

| Clasificación | Ejemplos | Cómo se usa |
|---|---|---|
| Costo directo · Ortodoncia | Ortodoncista, laboratorio de ortodoncia, comisiones de ortodoncia | Solo a Ortodoncia |
| Costo directo · Odontología | Odontólogo, cirujano, implantólogo, endodoncista | Solo a Odontología |
| Costo directo compartido | Materiales, Raydent, laboratorio sin especialidad | Se reparte entre las dos |
| Gasto indirecto (fijo) | Sueldos, alquiler, luz, teléfono, publicidad, impuestos | Se reparte entre las dos |
| No operativo | Retiros de utilidad, préstamos, letras | No resta a la utilidad operativa; sí al flujo neto |

El reparto de lo compartido y lo fijo se hace **según los ingresos de cada especialidad** en cada mes. También se puede elegir 50/50 o un porcentaje fijo.

```
Utilidad operativa = Ingresos − (directos + compartidos + gastos fijos)
Flujo neto de caja = Utilidad operativa − gastos no operativos
```

> **Privacidad:** el libro contable contiene nombres y DNI de pacientes. Se guarda solo en la base de datos de la clínica. No lo suba al repositorio de código.

## Cómo se calculan los costos

Todos los cálculos están en funciones puras en [`src/lib/costeo/`](src/lib/costeo), con pruebas unitarias.

### Costo directo por atención (ficha técnica)

```
Materiales        = Σ cantidad usada × costo unitario
Mano de obra      = Σ (minutos ÷ 60) × costo por hora          (odontólogo + asistente)
Equipos           = Σ minutos de uso × depreciación por minuto
                    depreciación por minuto = costo de adquisición ÷ (vida útil en horas × 60)
Esterilización    = costo por atención
Tercerizados      = laboratorio + radiografías externas
COSTO DIRECTO     = materiales + mano de obra + equipos + esterilización + tercerizados
```

### Costos indirectos (prorrateo mensual)

La tasa de cada mes se calcula con **todas** las atenciones de la clínica en ese mes. Si el dashboard está filtrado por odontólogo o turno, la tasa no cambia; solo se aplica a las atenciones filtradas.

| Método | Tasa del mes | Indirecto de una atención |
|---|---|---|
| **Minutos de sillón** (defecto) | Indirectos ÷ minutos de sillón del mes | Tasa × minutos de sillón del servicio |
| **N.º de atenciones** | Indirectos ÷ n.º de atenciones del mes | Tasa (igual para todas) |
| **% de ingresos** | Indirectos ÷ ingresos netos del mes | Tasa × ingreso neto de la atención |

*Minutos de sillón* = duración por sesión × número de sesiones. La pantalla **Costos indirectos** muestra la fórmula con los números del mes (por ejemplo `S/ 16,868.14 ÷ 16,530 min = S/ 1.0205 por minuto`) y cómo se obtiene el indirecto de cada servicio.

### Rentabilidad

```
Ingreso neto   = precio cobrado ÷ 1.18   (si el precio incluye IGV; si no, el precio cobrado)
Costo total    = costo directo + costo indirecto
Utilidad       = ingreso neto − costo total
Margen neto %  = utilidad ÷ ingreso neto
```

Las alertas marcan los servicios con **margen negativo** (⛔) o **menor al margen mínimo** (⚠, 20 % por defecto).

### Punto de equilibrio mensual

```
Margen de contribución = precio neto − costo directo
Solo este servicio     = costos fijos del mes ÷ margen de contribución        (redondeado hacia arriba)
Con la mezcla actual   = costos fijos ÷ margen de contribución ponderado, repartido según la participación
                         de cada servicio en las ventas
```

## Reportes Excel

| # | Reporte | Hojas |
|---|---|---|
| 1 | Servicios más vendidos | Cantidad, ingresos, participación % y ticket promedio |
| 2 | Costeo por servicio | Desglose de directos (ficha), indirectos, costo total, utilidad y margen |
| 3 | Ficha técnica de materiales | Detalle de recursos por servicio y resumen de costos directos |
| 4 | Consumo de materiales | Cantidad consumida en el periodo y costo (útil para compras) |
| 5 | Costos indirectos y prorrateo | Gastos mensuales, tasa con su fórmula y asignación por servicio |
| 6 | Rentabilidad por odontólogo | Atenciones, horas, ingresos, ticket, S/ por hora, utilidad y margen |
| 7 | Ventas detalladas | Cada atención con precios, IGV, pagos, saldo y canal |
| 8 | Consolidado | Todas las hojas anteriores en un solo archivo |

Formato de todos los archivos:

- Encabezado con el nombre de la clínica, el RUC, el periodo, la fecha de emisión y los filtros aplicados.
- Encabezados de columna en negrita con color y columnas autoajustadas.
- Montos en `S/ #,##0.00` y porcentajes en formato `%`.
- Fila de **totales con fórmulas reales de Excel** (`SUMA`, y divisiones como margen = utilidad ÷ ingresos).
- **Filtros activados** y paneles congelados bajo el encabezado.
- Nombre del archivo: `Reporte_[tipo]_[periodo].xlsx`. Por ejemplo, `Reporte_Costeo_por_servicio_2026-08.xlsx` para un mes completo, o `Reporte_Ventas_detalladas_2026-04-01_a_2026-09-26.xlsx` para un rango.

## Roles y permisos

| | Administrador | Caja / Secretaría | Odontólogo |
|---|:-:|:-:|:-:|
| Dashboard | Completo | Sin costos ni utilidades | Solo lo suyo, sin costos |
| Catálogo de servicios | Crear y editar | Ver precios | Ver precios |
| Fichas técnicas, materiales, equipos | ✅ | ❌ | ❌ |
| Costos indirectos | ✅ | ❌ | ❌ |
| Registrar atenciones, pagos e importar | ✅ | ✅ | ❌ |
| Eliminar atenciones | ✅ | ❌ | ❌ |
| Reportes | Los 8 | Más vendidos, por odontólogo (sin costos), ventas y consolidado | Los mismos, solo con sus atenciones |
| Usuarios y configuración | ✅ | ❌ | ❌ |

Los permisos se verifican **en el servidor**: en el middleware, en cada página, en cada acción y en cada descarga de Excel. Además, al desactivar un usuario o cambiarle el rol, el cambio aplica de inmediato. Nunca se puede quedar la clínica sin un administrador activo.

## Estructura del proyecto

```
prisma/
  schema.prisma          Modelo de datos
  seed.ts, seed-data.ts  Datos de ejemplo (6 meses)
src/
  app/
    (auth)/login/        Inicio de sesión
    (app)/               Páginas con menú: dashboard, servicios, materiales, equipos,
                         costos-indirectos, atenciones, reportes, odontologos, usuarios,
                         configuracion, perfil
    api/                 Descargas: reportes Excel y plantilla de importación
  actions/               Acciones del servidor (guardar, eliminar, importar…)
  components/            UI, gráficos, filtros, formularios
  lib/
    costeo/              ★ Motor de costeo (funciones puras + pruebas)
    atenciones/          Montos de una atención, registro y paciente
    importacion/         Plantilla, lectura y validación del Excel importado
    reportes/            Definición de los 8 reportes (pantalla y Excel)
    excel/               Estilos y generador de archivos Excel
    auth/                Sesión, token y matriz de permisos
    validaciones/        Esquemas Zod
    analisis.ts          Carga de atenciones + prorrateo por mes
    dashboard.ts         Datos del dashboard
    formato.ts           Soles, fechas dd/mm/aaaa, porcentajes (hora de Lima)
  middleware.ts          Protección de rutas por rol
```

## Pruebas

```bash
npm test
```

Hay 50 pruebas que cubren:

- El costeo directo, la depreciación, el prorrateo con sus tres métodos (verifica que lo asignado sume exactamente los indirectos del mes), la rentabilidad, las alertas de margen, el IGV y el punto de equilibrio.
- Los montos de una atención (descuentos, pagos parciales) y los formatos (soles, fechas en hora de Lima, dd/mm/aaaa).
- Las validaciones de los formularios (mensajes en español) y de las filas importadas desde Excel.
- La generación de Excel: encabezado, formatos, fórmulas `SUMA`, filtros, paneles congelados y nombre de archivo.

## Pasar a producción y a PostgreSQL

**Publicar en internet (recomendado):** siga la guía paso a paso **[DESPLIEGUE.md](DESPLIEGUE.md)** para Railway. El `Dockerfile` también sirve para Render, Fly.io o un VPS.

**Producción manual:**

1. Defina `AUTH_SECRET` con una clave larga y aleatoria. Si cambia la clave, todas las sesiones se cierran.
2. Ejecute `npm run build`, luego `npx prisma migrate deploy` y finalmente `npm start`.
3. Sirva la aplicación por **HTTPS**. En producción, la cookie de sesión se marca como `secure`.
4. Haga copias de seguridad del archivo `prisma/dev.db`, o de la base PostgreSQL.

**PostgreSQL:**

1. En `prisma/schema.prisma` cambie `provider = "sqlite"` por `provider = "postgresql"`.
2. En `.env` ponga `DATABASE_URL="postgresql://usuario:clave@servidor:5432/clinica"`.
3. Borre la carpeta `prisma/migrations` y ejecute `npx prisma migrate dev --name inicial`. Esto genera las migraciones para PostgreSQL y carga los datos de ejemplo.

## Supuestos y decisiones

- **IGV:** los ingresos y márgenes se calculan sobre el **valor sin IGV**, porque el IGV no es ingreso de la clínica. Cada atención indica si su precio incluye IGV.
- **Sesiones:** el precio de un servicio cubre **todas sus sesiones**, y una atención representa el tratamiento completo. La ortodoncia se registra como una atención por mensualidad.
- **Costo registrado ("snapshot"):** cada atención guarda el costo directo y los minutos de sillón vigentes al registrarse. Si luego sube el precio de un material, la rentabilidad de los meses anteriores no cambia. Los reportes de consumo de materiales y el desglose por componentes usan la ficha técnica vigente.
- **Mano de obra:** se modela como costo por hora × minutos. Si paga a sus odontólogos por comisión, puede aproximarlo con un costo por hora equivalente.
- **Montos:** se guardan como números decimales y se redondean a céntimos en cada cálculo. Esto es suficiente para montos de una clínica.
- **Fechas:** todas las fechas se interpretan en la zona horaria de Lima (UTC−5). En pantalla y en Excel se muestran como dd/mm/aaaa. Los campos de fecha del navegador usan el formato regional de su equipo.
