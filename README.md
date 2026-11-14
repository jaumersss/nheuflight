# NheuFlight

NheuFlight es un radar web para seguir aeronaves y barcos en un mapa interactivo. Puedes buscar un vuelo por su indicativo, seleccionar una aeronave para consultar su trayectoria y activar capas de meteorología, tráfico marítimo y contexto geográfico. La interfaz se adapta a escritorio y móvil.

## Radar aéreo

- **Tráfico en directo.** Muestra la posición, el rumbo, la altitud y la velocidad que recibe de fuentes ADS-B. Permite filtrar aeronaves comerciales, privadas, militares y helicópteros, y destaca las alertas por código transpondedor.
- **Seguimiento de vuelos.** La ficha de cada aeronave reúne su identificación, operador, ruta, estela y telemetría. Cuando hay datos suficientes, muestra la distancia recorrida y restante y distingue entre horas reales, programadas y estimadas.
- **Búsqueda, favoritos y alertas.** Puedes localizar aeronaves por indicativo, matrícula, origen o destino y guardar vuelos para seguirlos. El repositorio también incluye monitores independientes para enviar avisos de aeronaves de la DGT a Telegram.
- **Aeropuertos y meteorología.** El mapa incluye capas de aeropuertos, pistas, corredores aéreos y lluvia. El modo aeropuerto permite consultar vuelos asociados, además de informes METAR y pronósticos TAF cuando están disponibles.
- **Modo demo.** Genera aeronaves simuladas y permite cambiar sus parámetros para probar el seguimiento, los filtros y las alertas.

## Radar marítimo

La capa marítima muestra embarcaciones a partir de AIS y permite consultar su nombre, posición, rumbo, velocidad, identificador MMSI y destino cuando esos datos se reciben. También hay una versión independiente en [nheu-marine](nheu-marine/), con su propio mapa y servidor.

## Capas de contexto con OSIRIS

La integración de OSIRIS añade al mapa terremotos, incendios, satélites, zonas de conflicto, puertos estratégicos, cámaras públicas, radares fijos de tráfico y emisiones informativas. Los modos HORUS y JARVIS permiten acceder a estas capas desde el mismo mapa.

Esta integración está basada en [OSIRIS, el proyecto original de simplifaisoul](https://github.com/simplifaisoul/osiris), publicado bajo [licencia MIT](https://github.com/simplifaisoul/osiris/blob/master/LICENSE). La licencia permite usar, modificar y redistribuir el código original conservando su aviso de copyright y licencia. El [aviso de OSIRIS](LICENSE-OSIRIS.txt) se incluye en este repositorio.

## Cómo funciona

El navegador dibuja el mapa con Leaflet y utiliza Canvas para representar aeronaves y barcos. Entre lecturas ADS-B interpola la posición de las aeronaves para suavizar el movimiento. Un *service worker* guarda los recursos de la interfaz para acelerar las siguientes visitas y permite volver a abrirla sin conexión después de una carga previa. Los datos en directo requieren conexión.

| Parte del proyecto | Responsabilidad |
| --- | --- |
| [index.html](index.html), [app.js](app.js) y [classify.js](classify.js) | Mapa, seguimiento aéreo, filtros y fichas |
| [marine-tracker.js](marine-tracker.js) y [nheu-marine](nheu-marine/) | Capa marítima integrada y radar marítimo independiente |
| [osiris.js](osiris.js) y [data](data/) | Capas de contexto y catálogos locales |
| [server.js](server.js) y [netlify](netlify/) | Rutas de servidor para consultar proveedores y mantener las claves fuera del navegador |
| [no-hosting](no-hosting/) y [github-dgt-monitor-repo](github-dgt-monitor-repo/) | Monitores DGT que pueden ejecutarse de forma independiente |

Los datos de posición dependen de la cobertura ADS-B o AIS. Los horarios oficiales dependen de la cobertura y de la cuota de Aviationstack. Si el proveedor carece de datos de un vuelo, NheuFlight intenta estimar los horarios a partir de la trayectoria, la velocidad y las coordenadas de los aeropuertos. Cuando faltan los datos necesarios, el campo queda sin hora.

## Cómo ejecutarlo

Con Node.js 22 o posterior, abre una terminal en la carpeta del proyecto y ejecuta:

```sh
node server.js
```

Abre [NheuFlight en el puerto 8080](http://localhost:8080). En Windows también puedes usar `iniciar.bat`. Para iniciar el radar marítimo independiente en el puerto 8085, ejecuta `node nheu-marine/server.js`.

### Credenciales y despliegue

- **Servidor local.** Define `CARTO_API_KEY`, `AVIATIONSTACK_API_KEY` y `AIS_KEY` en el entorno o en un archivo `.env` fuera del repositorio. La ruta predeterminada es `%LOCALAPPDATA%/NheuFlight/.env` en Windows y `~/.config/NheuFlight/.env` en macOS y Linux. Puedes indicar otra ruta con `NHEU_SECRETS_FILE`. Escribe una asignación `NOMBRE=valor` por línea.
- **Servicios opcionales.** Sin CARTO se usa el mapa de Esri. Sin Aviationstack siguen disponibles las estimaciones cuando hay datos suficientes. La recepción de barcos en directo requiere una clave de AISStream.
- **Netlify.** Añade las variables de CARTO y Aviationstack con alcance de Functions y vuelve a desplegar. AIS necesita un servidor Node persistente con `AIS_KEY`. Para conectar la capa marítima a ese servidor desde otro dominio, define `window.NHEU_MARINE_BACKEND_API` en `app-config.js` con su URL HTTPS.
- **Avisos DGT.** Configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en el entorno del monitor o en los secretos de GitHub Actions.
