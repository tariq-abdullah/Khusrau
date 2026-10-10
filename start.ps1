$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) { $nodePath = 'C:\Users\tariq\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
& $nodePath 'node_modules/vite/bin/vite.js' '--host' '127.0.0.1'
