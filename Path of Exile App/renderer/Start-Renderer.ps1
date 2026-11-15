$ErrorActionPreference = 'Stop'
$rendererNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$rendererNodePath = if ($rendererNodeCommand) { $rendererNodeCommand.Source } else { 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $rendererNodePath)) { throw 'Install Node.js 22.18 or newer, then run this script again.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist/index.html'))) { throw 'Build the renderer first. See renderer/README.md for install and build commands.' }
$rendererPreviewPort = if ($env:RENDERER_PORT) { $env:RENDERER_PORT } else { '4321' }
Write-Host "Open http://127.0.0.1:$rendererPreviewPort in your browser. Keep this window open. Ctrl+C stops this preview only."
& $rendererNodePath (Join-Path $PSScriptRoot 'server.mjs')
