$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Install Node.js 22.18 or newer, then run this script again.' }
Write-Host 'Open http://127.0.0.1:4317 in your browser. Keep this window open. Ctrl+C stops the server.'
& $nodePath (Join-Path $PSScriptRoot 'server.mjs')
