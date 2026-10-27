@echo off
rem Double-clic : ouvre la fenetre qui permet de revoir une ancienne version du site (voir afficher-version.ps1).
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%~dp0afficher-version.ps1"
