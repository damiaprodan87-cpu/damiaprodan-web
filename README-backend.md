# Cómo activar el Top de Videos automático

Esto te deja el "Top videos más vistos" actualizándose solo, sin exponer tu API key de YouTube a nadie.

## 1. Conseguí tu API key de YouTube (gratis)

1. Andá a https://console.cloud.google.com/
2. Creá un proyecto nuevo (cualquier nombre).
3. Buscá "YouTube Data API v3" y activala.
4. Andá a "Credenciales" → "Crear credenciales" → "Clave de API".
5. Copiá esa clave, la vas a necesitar en el paso 3.

Tenés 10.000 unidades gratis por día — con el caché de 6 horas que ya viene configurado, te alcanza de sobra.

## 2. Subí el proyecto a Vercel (gratis, sin tarjeta)

1. Create una cuenta en https://vercel.com (podés entrar con GitHub).
2. Subí esta carpeta completa (con `index.html` y la carpeta `api/`) a un repositorio de GitHub.
3. En Vercel: "Add New" → "Project" → elegí ese repositorio → "Deploy".

## 3. Configurá tu API key de forma segura

1. En el proyecto dentro de Vercel: "Settings" → "Environment Variables".
2. Agregá una variable:
   - **Name:** `YOUTUBE_API_KEY`
   - **Value:** la clave que copiaste en el paso 1
3. Guardá y volvé a desplegar el proyecto (Vercel te va a tirar un botón de "Redeploy").

Tu endpoint va a quedar funcionando en:
`https://tu-proyecto.vercel.app/api/top-videos`

## 4. Conectá la web con el backend

Ya está hecho en `index.html` — apenas la página carga, intenta pedirle los datos a `/api/top-videos`. Si todavía no desplegaste el backend, automáticamente muestra la lista manual (`TOP_VIDEOS`) como respaldo, así la web nunca se rompe.

Una vez que el backend esté online, el Top de Videos se va a actualizar solo cada vez que alguien entre a la página (con caché de 6hs para no gastar cuota de más).

## Nota sobre el dominio de Twitch

Aprovechá este mismo despliegue de Vercel para arreglar también el embed de Twitch: una vez que tengas tu dominio final (el que te da Vercel, tipo `damiaprodan.vercel.app`, o uno propio), reemplazá `PARENT_DOMAIN` en `index.html` por ese dominio.
