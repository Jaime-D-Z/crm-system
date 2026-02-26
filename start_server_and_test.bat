@echo off
echo Starting server...
cd /d "c:\Users\jaime\Desktop\node-mvc\backend"
start "Server" cmd /k "npm start"

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Testing endpoints...
node test_endpoints.js

pause
