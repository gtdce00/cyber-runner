# Pack a portable copy onto the Desktop for USB install
$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $src 'index.html'))) { $src = $PSScriptRoot }

$out = Join-Path ([Environment]::GetFolderPath('Desktop')) 'CyberRunner-USB'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force -Path $out | Out-Null

$rcArgs = @($src, $out, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np', '/XD', '.git', 'node_modules')
& robocopy @rcArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed: $LASTEXITCODE" }

$guide = @(
  'Cyber Runner - install on another computer',
  '',
  'WINDOWS',
  '1) Copy this whole folder to a USB drive',
  '2) On the other PC, open the folder',
  '3) Double-click   install.bat   (or ติดตั้ง.bat)',
  '4) Double-click the Cyber Runner icon on the Desktop',
  '',
  'LINUX',
  '1) Copy this whole folder (USB / shared folder)',
  '2) Open a terminal in the folder',
  '3) Run:  chmod +x install.sh play.sh && ./install.sh',
  '4) Click the Cyber Runner icon on the Desktop or in the app menu',
  '',
  'Scores upload to the school Google Sheet automatically.',
  'Internet is needed to send scores (the game still works offline).'
) -join "`r`n"
$utf8 = New-Object System.Text.UTF8Encoding $true
[IO.File]::WriteAllText((Join-Path $out 'README-INSTALL.txt'), $guide, $utf8)

Write-Output $out
