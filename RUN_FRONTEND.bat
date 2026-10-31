@echo off
title AVERTIQ - React Admin Command Center
cd /d "%~dp0admin-panel"
echo ===================================================
echo Starting AVERTIQ React Admin Portal on port 3000
echo ===================================================
npm run dev -- --port 3000
pause

