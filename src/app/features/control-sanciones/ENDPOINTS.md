# Endpoints — Control sanciones (expedientes físicos)

Base HTTP: `environment.SAUL3_API_URL` (Laravel SAUL3, Bearer Sanctum).

Validación local: `scripts/validar-control-sanciones-api.ps1` (variables `SAUL3_USUARIO`, `SAUL3_CONTRASENA`).

| # | Método | Ruta | Uso |
|---|--------|------|-----|
| 1 | GET | `/usuario/permisos` | Roles/permisos del usuario autenticado |
| 2 | GET | `/control-sanciones/comparendo/get/{numeroFormato}` | Buscar por número de comparendo o expediente |
| 3 | GET | `/comparendo/expediente/get/{idComparendo}` | Expediente a gestionar |
| 4 | GET | `/control-sanciones/responsables` | Lista para asignación |
| 5 | GET | `/control-sanciones/movimiento-comparendo/{idComparendo}` | Historial de traslados |
| 6 | GET | `/comparendo/pago/get/{idComparendo}` | Alertas de pago / pedagogía |
| 7 | GET | `/control-sanciones/consultar-expediente-fisico/{idComparendo}` | Indica si hay expediente físico (0 = digital) |
| 8 | POST | `/control-sanciones/registrar-movimiento` | Registrar movimiento individual |
| 9 | GET | `/control-sanciones/expediente/get?estado=&inspeccion=` | Listado masivo por estado |
| 10 | POST | `/control-sanciones/registrar-movimiento-multiple` | Registrar movimiento masivo |
| 11 | GET | `/control-sanciones/inspector/getall` | Inspecciones (filtro en masivo) |

## Rutas Angular (ssjfront)

- `/control-sanciones/registrar-movimiento` — movimiento individual
- `/control-sanciones/registrar-movimiento?comparendo=…` — búsqueda precargada desde listado (número de comparendo)
- `/control-sanciones/registrar-movimiento-multiple` — movimiento múltiple
- (Compat.) `/control-sanciones/registrarmovimiento*` redirige a las rutas anteriores

Equivalente legacy: `#!/controlsanciones/registrarmovimiento/:id` y `#!/controlsanciones/registrarmovimientomultiple`.