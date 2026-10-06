@echo off
:: Opens TCP port 3000 in Windows Firewall so friends on your Wi-Fi/hotspot can connect.
:: Re-launches itself as administrator if needed.
net session >nul 2>&1
if errorlevel 1 (
  echo Asking for administrator rights...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="UNO Night (TCP 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="UNO Night (TCP 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any
if errorlevel 1 (
  echo Could not add the firewall rule.
) else (
  echo Done! Port 3000 is open. Friends on your network can now join.
)
pause
