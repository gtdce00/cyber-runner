@echo off
chcp 65001 >nul
title สร้างโฟลเดอร์พกพา Cyber Runner
echo กำลังสร้างโฟลเดอร์  CyberRunner-พกพา  บนเดสก์ท็อป...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\pack-usb.ps1"
echo.
echo เสร็จแล้ว — นำไป copy ใส่ USB ได้เลย
pause
