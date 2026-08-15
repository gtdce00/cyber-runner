@echo off
chcp 65001 >nul
title Cyber Runner Setup
echo.
echo   Installing Cyber Runner...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install.ps1"
if errorlevel 1 (
  echo Install failed
  pause
)
