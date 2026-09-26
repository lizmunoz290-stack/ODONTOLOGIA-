# Publicar la aplicación en internet (Railway)

Con esta guía tendrá su aplicación en una dirección como `https://miclinica.up.railway.app`, disponible desde cualquier computadora o celular. Toma unos 10 minutos y no hace falta saber programar.

> **Costo aproximado:** Railway cobra según el uso. Una clínica pequeña suele gastar alrededor de **US$ 5 al mes** (plan Hobby). Revise los precios vigentes en <https://railway.com/pricing>.

## Antes de empezar

- Una cuenta de **GitHub** con este repositorio. Ya la tiene.
- Que el pull request esté **fusionado en `main`** (botón *Merge pull request* en GitHub).

## Paso 1: crear la cuenta

1. Entre a <https://railway.com> y haga clic en **Login → Login with GitHub**.
2. Autorice a Railway a ver sus repositorios.
3. Elija el plan **Hobby** y registre una tarjeta de pago.

## Paso 2: crear el proyecto

1. Haga clic en **New Project → Deploy from GitHub repo**.
2. Elija el repositorio **ODONTOLOGIA-** y la rama **main**.
3. Railway detecta el `Dockerfile` y empieza a construir la aplicación. **El primer intento va a fallar**, porque todavía faltan los pasos 3 y 4. Es normal.

## Paso 3: agregar el disco para la base de datos

Así los datos no se pierden cuando la aplicación se reinicia.

1. Dentro del servicio, haga clic derecho (o *⋯*) y elija **Attach Volume**.
2. En **Mount path**, escriba exactamente: `/data`

## Paso 4: configurar las variables

En el servicio abra la pestaña **Variables → Raw Editor** y pegue esto, cambiando los valores:

```
AUTH_SECRET=pegue-aqui-una-clave-larga-de-al-menos-32-caracteres
ADMIN_EMAIL=su-correo@su-clinica.pe
ADMIN_PASSWORD=UnaContraseñaSegura2026
NOMBRE_CLINICA=Nombre de su Clínica
```

| Variable | Para qué sirve |
|---|---|
| `AUTH_SECRET` | Protege las sesiones. Invente una frase larga y aleatoria, o genérela en <https://generate-secret.vercel.app/32>. **No la comparta.** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Son el usuario y la contraseña del **administrador inicial**, con los que entrará la primera vez. La contraseña debe tener mínimo 8 caracteres. |
| `NOMBRE_CLINICA` | Nombre que aparece en la pantalla de ingreso y en los Excel. Después se puede cambiar en **Configuración**. |
| `CARGAR_DATOS_EJEMPLO` | *(Opcional)* Si la pone en `true`, la primera vez se cargan los 6 meses de datos de demostración con sus usuarios de prueba (`admin@clinica.pe` / `admin123`, etc.). **No la use con datos reales.** |

Al guardar las variables, Railway vuelve a desplegar la aplicación automáticamente.

## Paso 5: obtener la dirección web

1. Vaya a **Settings → Networking → Generate Domain**.
2. Railway le da una dirección como `https://odontologia-production.up.railway.app`. Ábrala e ingrese con su `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

Si tiene un dominio propio (por ejemplo, `sistema.miclinica.pe`), puede conectarlo en la misma sección con **Custom Domain**.

## Paso 6: cargar la información de su clínica

Siga el orden de la sección **Guía de uso** del [README](README.md):

1. Configuración
2. Materiales y equipos
3. Odontólogos y usuarios
4. Servicios con su ficha técnica
5. Costos indirectos
6. Atenciones (manual o importándolas desde Excel)

## Preguntas frecuentes

**¿Se borran mis datos al actualizar la aplicación?**
No. Los datos viven en el disco `/data`. Al arrancar, la aplicación solo aplica las actualizaciones de la base de datos y nunca borra información: si ya hay usuarios, no toca nada.

**¿Cómo hago copias de seguridad?**
En Railway, entre al volumen y use **Backups** para programar copias automáticas. También puede descargar el reporte **Consolidado** en Excel cada mes.

**Olvidé la contraseña del administrador.**
Si hay otro administrador, puede cambiársela desde **Usuarios**. Si no, la persona que dé soporte técnico puede restablecerla desde la consola de Railway.

**¿Puedo usar otro proveedor?**
Sí. El `Dockerfile` sirve para cualquier servicio que ejecute contenedores Docker con un disco persistente montado en `/data` (Render, Fly.io, un VPS). Se usan las mismas variables.
