@echo off
chcp 65001 >nul
title ติดตั้ง Cyber Runner
echo.
echo   กำลังติดตั้ง Cyber Runner ลงเครื่องนี้...
echo   กรุณารอสักครู่
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install.ps1"
if errorlevel 1 (
  echo ติดตั้งไม่สำเร็จ
  pause
)
