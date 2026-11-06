@echo off
setlocal
cd /d "%~dp0" || goto folder_error
where node >nul 2>nul
if errorlevel 1 goto static_page
call :check_server
if not errorlevel 1 goto open_site
echo Starting the learning website...
start "Java-AI-Learn-Server" /min cmd /c "node server.js"
for /l %%i in (1,1,10) do (
  call :check_server
  if not errorlevel 1 goto open_site
  ping 127.0.0.1 -n 2 >nul
)
echo Could not start the website on port 5178.
echo Check whether another program is using this port.
echo Opening the offline page instead. Your local progress may differ.
goto static_page
:open_site
echo Opening http://127.0.0.1:5178/
start "" "http://127.0.0.1:5178/"
if errorlevel 1 goto browser_error
exit /b 0
:static_page
echo Opening the offline page. Progress is stored separately from the local server.
start "" "%~dp0index.html"
if errorlevel 1 goto browser_error
exit /b 0
:check_server
powershell -NoProfile -NonInteractive -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri 'http://127.0.0.1:5178/content/guides.js'; if ($r.Content.Contains('var guides =')) { exit 0 }; exit 1 } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%
:folder_error
echo Cannot open the website folder. Check that the files are still together.
pause
exit /b 1
:browser_error
echo Could not open a browser. Open http://127.0.0.1:5178/ manually.
pause
exit /b 1
