# NheuFlight

Para iniciar la web en local, usa Node.js 22 o posterior y ejecuta `node server.js`. En Windows también puedes usar `iniciar.bat`. Abre http://localhost:8080. El radar marítimo independiente se puede iniciar con `node nheu-marine/server.js` en el puerto 8085.

## Credenciales

El servidor lee `CARTO_API_KEY`, `AVIATIONSTACK_API_KEY` y `AIS_KEY` del entorno. Para uso local admite un archivo `.env` fuera del proyecto en `%LOCALAPPDATA%/NheuFlight/.env` (Windows) o `~/.config/NheuFlight/.env` (macOS y Linux). Se puede indicar otra ruta con `NHEU_SECRETS_FILE`. Escribe una asignación `NOMBRE=valor` por línea.

Sin CARTO la web usa el mapa alternativo de Esri. Sin Aviationstack se conservan las estimaciones de horarios. Para recibir barcos en vivo, el servidor Node necesita una clave de AISStream.

En Netlify añade las variables CARTO y Aviationstack con alcance de Functions y vuelve a desplegar. La capa AIS necesita un servidor Node persistente con `AIS_KEY`. Para conectarlo desde otro dominio, define `window.NHEU_MARINE_BACKEND_API` en `app-config.js` con la URL HTTPS pública de ese servidor.

Los monitores DGT usan `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` desde su entorno o desde los secretos de GitHub Actions.
