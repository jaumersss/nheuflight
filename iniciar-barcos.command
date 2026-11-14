#!/bin/bash
cd "$(dirname "$0")/nheu-marine"
echo "======================================================="
echo "           NheuMarine - Radar de Barcos AIS"
echo "======================================================="
echo ""
echo " Iniciando servidor de trafico maritimo en puerto 8085..."
echo ""
open "http://localhost:8085"
node server.js
