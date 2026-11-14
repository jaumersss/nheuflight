@echo off
title NheuMarine Server
cls
echo =======================================================
echo            NheuMarine - Radar de Barcos AIS
echo =======================================================
echo.
echo  Iniciando servidor de trafico maritimo en puerto 8085...
echo.
start http://localhost:8085
node server.js
pause
