@echo off
rem Madrevieja: enciende el servidor local y abre la instalacion en pantalla completa.
rem Para salir de la pantalla completa: Alt+F4.
cd /d "%~dp0"

set PUERTO=8765
set URL=http://localhost:%PUERTO%/
rem Perfil propio del navegador: aqui quedan guardados los datos de entrenamiento y el estado.
set PERFIL=%LOCALAPPDATA%\Madrevieja\navegador

start "Madrevieja - servidor (no cerrar)" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1" -Puerto %PUERTO%
timeout /t 2 /nobreak >nul

set CHROME=
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe

if defined CHROME (
  start "" "%CHROME%" --user-data-dir="%PERFIL%" --kiosk --no-first-run --disable-features=Translate --autoplay-policy=no-user-gesture-required %URL%
) else (
  start "" msedge --user-data-dir="%PERFIL%" --kiosk %URL% --edge-kiosk-type=fullscreen --no-first-run
)
