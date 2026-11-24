# Valida web services del modulo Control sanciones (SAUL3).
# Uso:
#   $env:SAUL3_API_URL = 'http://localhost:8000/api'
#   $env:SAUL3_USUARIO = 'mi_usuario'
#   $env:SAUL3_CONTRASENA = 'mi_clave'
#   .\scripts\validar-control-sanciones-api.ps1

param(
    [string]$ApiUrl = $(if ($env:SAUL3_API_URL) { $env:SAUL3_API_URL } else { 'http://localhost:8000/api' }),
    [string]$Usuario = $env:SAUL3_USUARIO,
    [string]$Contrasena = $env:SAUL3_CONTRASENA,
    [string]$Estado = 'pendiente'
)

$ApiUrl = $ApiUrl.TrimEnd('/')

function Invoke-Saul3Get {
    param([string]$Path, [string]$Token)
    $headers = @{ Authorization = "Bearer $Token"; Accept = 'application/json' }
    return Invoke-RestMethod -Uri "$ApiUrl$Path" -Headers $headers -Method Get
}

Write-Host "=== Control sanciones - validacion API ===" -ForegroundColor Cyan
Write-Host "Base: $ApiUrl"

try {
    $probe = Invoke-WebRequest -Uri "$ApiUrl/usuario/permisos" -UseBasicParsing -ErrorAction Stop
    Write-Host "Servidor accesible (sin token: HTTP $($probe.StatusCode))" -ForegroundColor DarkGray
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host 'Servidor accesible: 401 sin token (esperado)' -ForegroundColor DarkGray
    } else {
        Write-Host "ERROR: no se pudo contactar $ApiUrl - $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

if (-not $Usuario -or -not $Contrasena) {
    Write-Host "Defina SAUL3_USUARIO y SAUL3_CONTRASENA para probar endpoints autenticados." -ForegroundColor Yellow
    exit 0
}

$loginBody = @{ usuario = $Usuario; contrasena = $Contrasena } | ConvertTo-Json -Compress
try {
    $login = Invoke-RestMethod -Uri "$ApiUrl/auth/login" -Method Post -Body $loginBody -ContentType 'application/json'
} catch {
    Write-Host "Login falló: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if (-not $login.success) {
    Write-Host "Login rechazado: $($login.message)" -ForegroundColor Red
    exit 1
}

$token = $login.data.token
Write-Host "Login OK - usuario id $($login.data.id)" -ForegroundColor Green

$permisos = Invoke-Saul3Get -Path '/usuario/permisos' -Token $token
Write-Host "Permisos: $($permisos.permisos.Count) codigo(s)"

$inspecciones = Invoke-Saul3Get -Path '/control-sanciones/inspector/getall' -Token $token
$countIns = @($inspecciones.data).Count
Write-Host "Inspecciones: $countIns registro(s)"

$listado = Invoke-Saul3Get -Path "/control-sanciones/expediente/get?estado=$([uri]::EscapeDataString($Estado))" -Token $token
$filas = @($listado.data)
Write-Host "Expedientes (estado=$Estado): $($filas.Count) fila(s)"
if ($filas.Count -gt 0) {
    $muestra = $filas[0] | ConvertTo-Json -Compress -Depth 3
    Write-Host "Ejemplo primera fila: $muestra"
}

$responsables = Invoke-Saul3Get -Path '/control-sanciones/responsables' -Token $token
$countResp = @($responsables).Count
if ($responsables -is [System.Array]) {
    Write-Host "Responsables: $countResp"
} else {
    Write-Host "Responsables: respuesta recibida (tipo $($responsables.GetType().Name))"
}

Write-Host '=== Validacion completada ===' -ForegroundColor Cyan