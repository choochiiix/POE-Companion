$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeCandidates = @(
    if ($nodeCommand) { $nodeCommand.Source }
    (Join-Path $env:ProgramFiles 'nodejs\node.exe')
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe')
)
$nodePath = $nodeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $nodePath) { throw 'Node.js 22.18 or newer was not found. Install Node.js, reopen this launcher, and try again.' }
$nodeVersion = & $nodePath --version
if ($LASTEXITCODE -ne 0 -or [version]($nodeVersion.TrimStart('v')) -lt [version]'22.18') {
    throw "Node.js 22.18 or newer is required; found $nodeVersion. Install a current Node.js release and try again."
}
Write-Host 'Open http://127.0.0.1:4317 in your browser. Keep this window open. Ctrl+C stops the server.'
& $nodePath (Join-Path $PSScriptRoot 'server.mjs')
