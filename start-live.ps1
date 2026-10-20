# LuxeTravel - run the production build locally on Windows.
#
#   .\start-live.ps1              # use the existing build/ folder
#   .\start-live.ps1 -Build       # rebuild the React app first
#
# Open http://localhost:8000 afterwards.

param(
    [switch]$Build,
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
    $python = Join-Path $root ".venv\Scripts\python.exe"
    & $python -m pip install --upgrade pip
    & $python -m pip install -r backend\requirements.txt
}

if ($Build -or -not (Test-Path (Join-Path $root "build\index.html"))) {
    Write-Host "Building the React frontend..." -ForegroundColor Cyan
    if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
        npm.cmd run build
    } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        npm run build
    } else {
        throw "npm was not found. Install Node.js 18+ and run 'npm install' first."
    }
}

Push-Location backend
try {
    Write-Host "Applying database migrations..." -ForegroundColor Cyan
    & $python manage.py migrate --noinput
    & $python manage.py collectstatic --noinput | Out-Null

    if (-not $env:DEBUG) { $env:DEBUG = "False" }
    if (-not $env:ALLOWED_HOSTS) { $env:ALLOWED_HOSTS = "localhost,127.0.0.1,0.0.0.0" }

    Write-Host ""
    Write-Host "LuxeTravel is live at http://localhost:$Port" -ForegroundColor Green
    Write-Host "API health:  http://localhost:$Port/api/health/" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
    Write-Host ""

    & $python -m waitress --listen="0.0.0.0:$Port" --threads=8 trip_planner.wsgi:application
}
finally {
    Pop-Location
}
