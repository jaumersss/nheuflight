# Monitor Telegram DGT

Esta carpeta es independiente de la web. No hace falta subirla al hosting ni abrir ninguna pestana del navegador.

La unica maquina que importa es la que ejecute este script: tu Mac, una Raspberry Pi, un VPS, un NAS o un servidor.

## 1. Requisitos

Instala Node.js 20 o superior.

Comprueba la version:

```bash
node -v
```

Si no tienes Node:

- En macOS con Homebrew:

```bash
brew install node
```

- En Raspberry/Debian/Ubuntu puedes usar NodeSource o el gestor que prefieras, pero intenta que sea Node 20 o superior.

## 2. Crear el bot de Telegram

1. Abre Telegram.
2. Busca `@BotFather`.
3. Envia:

```text
/newbot
```

4. Sigue los pasos.
5. Guarda el token que te da BotFather. Sera `TELEGRAM_BOT_TOKEN`.

Importante: abre el chat con tu bot y enviale un mensaje, por ejemplo `hola`. Si no le escribes primero, el bot no podra enviarte mensajes.

## 3. Obtener el chat id

Abre esta URL cambiando `TU_TOKEN` por el token real:

```text
https://api.telegram.org/botTU_TOKEN/getUpdates
```

Busca:

```json
"chat":{"id":123456789
```

Ese numero es `TELEGRAM_CHAT_ID`.

Si usas un grupo, mete el bot en el grupo, escribe un mensaje en el grupo y vuelve a mirar `getUpdates`. El id de grupo normalmente empieza por `-100`.

## 4. Configurar variables

Opcion simple para probar en terminal:

```bash
export TELEGRAM_BOT_TOKEN="tu_token"
export TELEGRAM_CHAT_ID="tu_chat_id"
npm run monitor:dgt
```

Tambien puedes crear un archivo `.env` copiando `.env.example`, pero el script no lo carga automaticamente. Si quieres usar `.env`, ejecuta:

```bash
set -a
source .env
set +a
npm run monitor:dgt
```

## 5. Probar que Telegram funciona

Antes de esperar a que aparezca un helicoptero, prueba el envio directo:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\":\"$TELEGRAM_CHAT_ID\",\"text\":\"Prueba alerta DGT OK\"}"
```

Si llega el mensaje, Telegram esta bien configurado.

## 6. Ejecutar el monitor una vez

Desde esta carpeta:

```bash
npm run monitor:dgt
```

El script:

- consulta APIs ADS-B publicas;
- cubre Espana por sectores;
- detecta helicopteros DGT por matricula/callsign;
- envia Telegram solo cuando pasa de no detectado a detectado;
- guarda el estado en `state.json`.

## 7. Ejecutarlo cada 5 minutos en una maquina

### macOS o Linux con cron

Abre el crontab:

```bash
crontab -e
```

Anade una linea como esta, cambiando la ruta por la ruta real de esta carpeta:

```cron
*/5 * * * * cd /RUTA/REAL/dgt-telegram-monitor && TELEGRAM_BOT_TOKEN="tu_token" TELEGRAM_CHAT_ID="tu_chat_id" /usr/bin/env npm run monitor:dgt >> monitor.log 2>&1
```

Para ver logs:

```bash
tail -f monitor.log
```

### systemd timer en Raspberry/Ubuntu

Cron es suficiente y mas simple. Usa systemd solo si quieres gestionarlo como servicio del sistema.

## 8. Estado y anti-spam

`state.json` guarda que helicopteros estaban detectados.

No repite alerta mientras el mismo helicoptero siga activo. Si desaparece, no manda mensaje de apagado. Para evitar falsos cambios por fluctuaciones de la API, no se marca OFF hasta que falte en 2 ejecuciones consecutivas.

## 9. Limitaciones

- Es polling cada 5 minutos, no tiempo real.
- Puede haber retraso por GitHub Actions, cron o las APIs ADS-B.
- La cobertura ADS-B publica puede tener huecos.
- "Despegue" aqui significa primera aparicion detectada en vuelo tras estar ausente.
