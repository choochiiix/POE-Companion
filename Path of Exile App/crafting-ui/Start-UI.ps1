$ErrorActionPreference = 'Stop'
$appUrl = 'http://127.0.0.1:4317/'
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
$serverScript = Join-Path $PSScriptRoot 'server.mjs'

function Test-CompanionServer {
    try {
        $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>Exile companion</title>'
    } catch {
        return $false
    }
}

if (-not (Test-CompanionServer)) {
    $serverProcess = Start-Process -FilePath $nodePath `
        -ArgumentList ('"{0}"' -f $serverScript) `
        -WorkingDirectory (Split-Path -Parent $PSScriptRoot) `
        -WindowStyle Hidden `
        -PassThru

    $serverReady = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        if (Test-CompanionServer) {
            $serverReady = $true
            break
        }
        if ($serverProcess.HasExited) {
            throw "The app server stopped during startup (exit code $($serverProcess.ExitCode))."
        }
    }
    if (-not $serverReady) {
        throw 'The app server did not respond on 127.0.0.1:4317. Check whether another program is using that port.'
    }
}

Start-Process $appUrl
Write-Host "Exile Companion is open at $appUrl"
