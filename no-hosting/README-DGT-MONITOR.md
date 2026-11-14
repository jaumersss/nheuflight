# Monitor backend DGT

Este monitor ejecuta la deteccion del helicoptero de la DGT sin abrir la web.
Reutiliza la lista de callsigns y matriculas de `dgt-aircraft.js`, que tambien carga el frontend antes de `classify.js`.

## Prueba local

```bash
export TELEGRAM_BOT_TOKEN="token_del_bot"
export TELEGRAM_CHAT_ID="chat_id"
npm run monitor:dgt
```

Tambien puedes probar sin Telegram si no hay detecciones activas; el script hara polling y escribira logs. Si detecta un DGT y faltan variables de Telegram, fallara para no marcar la alerta como enviada.

## GitHub Secrets necesarios

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## GitHub Actions

El workflow `.github/workflows/dgt-alert.yml` se ejecuta cada 5 minutos y tambien se puede lanzar manualmente con `workflow_dispatch`.

La persistencia usa `state.json` en el propio repositorio: despues de cada cambio real de estado, el workflow commitea ese archivo con `GITHUB_TOKEN`. Asi la siguiente ejecucion sabe que aeronaves DGT ya estaban detectadas y no repite alertas mientras sigan activas.

Para evitar spam por fluctuaciones de la API, una aeronave detectada no pasa a OFF hasta que falta en 2 ejecuciones correctas consecutivas. Si reaparece antes, no se vuelve a alertar.

## Limitaciones

- GitHub Actions hace polling, no vigilancia en tiempo real; el aviso puede retrasarse hasta unos 5 minutos, mas la latencia de los proveedores ADS-B.
- Las fuentes ADS-B publicas pueden tener huecos, retrasos o cobertura incompleta.
- Si GitHub retrasa jobs programados, la frecuencia real puede ser superior a 5 minutos.
- El criterio practico de "despegue" es primera aparicion detectada en vuelo tras estar ausente.
