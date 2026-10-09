@echo off
title UNO Night server (online)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org ^(LTS^), then run this again.
  pause
  exit /b 1
)
echo Starting UNO server with an online link... (close this window to stop it)
start "" http://localhost:3000
node server.js 3000 --online
pause
