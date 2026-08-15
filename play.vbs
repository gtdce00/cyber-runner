' Cyber Runner — เปิดเกมจากไอคอนเดียว (ไม่ต้องมี Python)
Option Explicit
Dim fso, sh, root, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & root & "\play.ps1"""
sh.Run cmd, 0, False
