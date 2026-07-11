# Restart the Next.js dev server detached so it survives this shell.
$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conns) {
  $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}
$root = 'C:\Users\muham\Desktop\Deckflow'
Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', 'npm run dev > dev.log 2>&1' `
  -WorkingDirectory $root `
  -WindowStyle Hidden
Start-Sleep -Seconds 14
Get-Content (Join-Path $root 'dev.log') -Tail 30
