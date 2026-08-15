; Cyber Runner — สคริปต์ Inno Setup (ถ้าต้องการไฟล์ Setup.exe)
; ต้องติดตั้ง Inno Setup ก่อน: https://jrsoftware.org/isinfo.php
; แล้วเปิดไฟล์นี้ กด Build

#define MyAppName "Cyber Runner"
#define MyAppVersion "1.0"
#define MyAppPublisher "วันวิทยาศาสตร์"

[Setup]
AppId={{8C3E2B11-9A44-4D7E-9F21-CYBERRUNNER01}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\CyberRunner
DefaultGroupName=Cyber Runner
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=CyberRunner-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
SetupIconFile=assets\ui\game-icon.ico
UninstallDisplayIcon={app}\assets\ui\game-icon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".git,node_modules,tools\\*.iss"

[Icons]
Name: "{autodesktop}\Cyber Runner"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\play.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\assets\ui\game-icon.ico"
Name: "{group}\Cyber Runner"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\play.vbs"""; WorkingDir: "{app}"; IconFilename: "{app}\assets\ui\game-icon.ico"

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\play.vbs"""; WorkingDir: "{app}"; Description: "เล่นเกมเลย"; Flags: nowait postinstall skipifsilent
