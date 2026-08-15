# Install Cyber Runner on this PC
$ErrorActionPreference = 'Stop'

function Get-SourceRoot {
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'index.html'))) { return $PSScriptRoot }
  $parent = Split-Path -Parent $PSScriptRoot
  if (Test-Path (Join-Path $parent 'index.html')) { return $parent }
  throw 'index.html not found'
}

function Ensure-Icon($root) {
  $png = Join-Path $root 'assets\ui\game-icon.png'
  $ico = Join-Path $root 'assets\ui\game-icon.ico'
  if ((Test-Path $ico) -or -not (Test-Path $png)) { return $ico }
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
  return $ico
}

function New-GameShortcut($root, $lnkPath) {
  $ico = Ensure-Icon $root
  $vbs = Join-Path $root 'play.vbs'
  $w = New-Object -ComObject WScript.Shell
  $s = $w.CreateShortcut($lnkPath)
  $s.TargetPath = 'wscript.exe'
  $s.Arguments = '"' + $vbs + '"'
  $s.WorkingDirectory = $root
  $s.WindowStyle = 7
  $s.Description = 'Cyber Runner'
  if (Test-Path $ico) { $s.IconLocation = $ico }
  $s.Save()
}

$src = Get-SourceRoot
$dest = Join-Path $env:LOCALAPPDATA 'CyberRunner'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$rcArgs = @($src, $dest, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np', '/XD', '.git', 'node_modules')
& robocopy @rcArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed: $LASTEXITCODE" }

New-GameShortcut $dest (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Cyber Runner.lnk')

$startDir = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Cyber Runner'
New-Item -ItemType Directory -Force -Path $startDir | Out-Null
New-GameShortcut $dest (Join-Path $startDir 'Cyber Runner.lnk')

Add-Type -AssemblyName PresentationFramework
[void][System.Windows.MessageBox]::Show(
  "Install complete.`n`nGame folder:`n$dest`n`nDesktop icon: Cyber Runner",
  'Cyber Runner',
  'OK',
  'Information'
)

Start-Process 'wscript.exe' -ArgumentList ('"' + (Join-Path $dest 'play.vbs') + '"')
