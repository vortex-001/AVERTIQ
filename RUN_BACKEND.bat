@echo off
title AVERTIQ - FastAPI Backend Server
cd /d "%~dp0backend"
echo ===================================================
echo Starting AVERTIQ FastAPI Backend on 127.0.0.1:8000
echo ===================================================
py -3.10 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

