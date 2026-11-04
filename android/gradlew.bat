@echo off
setlocal
set GRADLE_VERSION=8.2.1
where gradle >nul 2>nul
if not errorlevel 1 (
  gradle %*
  exit /b
)
set BASE=%USERPROFILE%\.gradle\sora-bootstrap\gradle-%GRADLE_VERSION%
if not exist "%BASE%\bin\gradle.bat" (
  set ARCHIVE=%USERPROFILE%\.gradle\sora-bootstrap\gradle-%GRADLE_VERSION%-bin.zip
  if not exist "%USERPROFILE%\.gradle\sora-bootstrap" mkdir "%USERPROFILE%\.gradle\sora-bootstrap"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://services.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip' -OutFile '%USERPROFILE%\.gradle\sora-bootstrap\gradle-%GRADLE_VERSION%-bin.zip'; Expand-Archive -Force '%USERPROFILE%\.gradle\sora-bootstrap\gradle-%GRADLE_VERSION%-bin.zip' '%USERPROFILE%\.gradle\sora-bootstrap'"
  if errorlevel 1 exit /b 1
)
call "%BASE%\bin\gradle.bat" %*
endlocal
