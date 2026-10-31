@echo off
title AVERTIQ - Start All Services
echo ===================================================
echo Launching AVERTIQ Backend & Admin Portal
echo ===================================================
start "AVERTIQ Backend" "%~dp0RUN_BACKEND.bat"
timeout /t 3 /nobreak >nul
start "AVERTIQ Admin Portal" "%~dp0RUN_FRONTEND.bat"
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo AVERTIQ systems launched!
pause

