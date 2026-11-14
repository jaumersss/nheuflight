@echo off
title NheuFlight Server
cls
echo =======================================================
echo            NheuFlight - Radar de Vuelos
echo =======================================================
echo.
echo  Iniciando servidor local y cargando aviones...
echo.
start http://localhost:8080
node server.js
pause
