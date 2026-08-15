# สร้างไอคอน Cyber Runner บนเดสก์ท็อป
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root 'index.html'))) { $root = $PSScriptRoot }

$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop 'Cyber Runner.lnk'
$png = Join-Path $root 'assets\ui\game-icon.png'
$ico = Join-Path $root 'assets\ui\game-icon.ico'
$vbs = Join-Path $root 'play.vbs'

if (Test-Path $png) {
  $bytes = [IO.File]::ReadAllBytes($png)
  $ms = New-Object IO.MemoryStream
  $bw = New-Object IO.BinaryWriter $ms
  $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
  $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32)
  $bw.Write([UInt32]$bytes.Length)
  $bw.Write([UInt32]22)
  $bw.Write($bytes)
  $bw.Flush()
  [IO.File]::WriteAllBytes($ico, $ms.ToArray())
  $bw.Close(); $ms.Close()
}

$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut($lnkPath)
$s.TargetPath = 'wscript.exe'
$s.Arguments = '"' + $vbs + '"'
$s.WorkingDirectory = $root
$s.WindowStyle = 7
$s.Description = 'Cyber Runner — วิ่ง คิด ตอบ พิชิตโลกคอมพิวเตอร์'
if (Test-Path $ico) { $s.IconLocation = $ico }
$s.Save()
Write-Output $lnkPath
