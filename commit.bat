@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  set /p "MESSAGE=Commit message: "
) else (
  set "MESSAGE=%~1"
)
if not defined MESSAGE (
  echo Commit message is required.
  exit /b 1
)
git add -A
if errorlevel 1 exit /b %errorlevel%
git commit -m "%MESSAGE%"
exit /b %errorlevel%
