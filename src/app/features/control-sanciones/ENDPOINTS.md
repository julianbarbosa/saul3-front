# Endpoints — Control sanciones (expedientes físicos)

Base HTTP: `environment.SAUL3_API_URL` (Laravel SAUL3, Bearer Sanctum). Documentos/PDF: `environment.SAUL2_API_URL` hasta migrar.

Validación local: `scripts/validar-control-sanciones-api.ps1` (variables `SAUL3_USUARIO`, `SAUL3_CONTRASENA`).

| # | Método | Ruta | Uso |
|---|--------|------|-----|
| 1 | GET | `/usuario/permisos` | Roles/permisos del usuario autenticado |
| 2 | GET | `/controlsanciones/comparendo/get/{numeroFormato}` | Buscar por número de comparendo o expediente |
| 2b | GET | `/controlsanciones/expediente/interno/{id}/comparendo` | Desde listado (id comparendoxexpediente) |
| 3 | GET | `/comparendo/expediente/get/{idComparendo}` | Expediente a gestionar |
| 4 | GET | `/controlsanciones/responsables` | Lista para asignación |
| 5 | GET | `/controlsanciones/movimientocomparendo/{idComparendo}` | Historial de traslados |
| 6 | GET | `/comparendo/pago/get/{idComparendo}` | Alertas de pago / pedagogía |
| 7 | GET | `/comparendo/consultarexpedientefisico/{idComparendo}` | Indica si hay expediente físico (0 = digital) |
| 8 | POST | `/controlsanciones/registrarmovimiento` | Registrar movimiento individual |
| 9 | GET | `/controlsanciones/expediente/get?estado=&inspeccion=` | Listado masivo por estado |
| 10 | POST | `/controlsanciones/registrarmovimientomultiple` | Registrar movimiento masivo |
| 11 | GET | `/controlpolicivo/inspector/getall` | Inspecciones (filtro en masivo) |

## Descargas / documentos (nueva pestaña)

| # | Método | Ruta | Uso |
|---|--------|------|-----|
| 12 | GET | `/controlpolicivo/primerainstancia/descargarexpediente/{idComparendoXExpedienteAuto}` | PDF expediente electrónico |
| 13 | GET | `/controlsanciones/comprobantepago/{idComparendo}` | Comprobante de pago |
| 14 | GET | `/controlpolicivo/certificadoasistencia/{idComparendoXProgramacionPedagogia}` | Certificado pedagogía |
| 15 | GET | `/controlsanciones/generardocumento?codigoDocumento=&data=` | Informe secretarial (ids separados por coma) |
| 16 | GET | `/controlsanciones/generardevolucioncsv/{estado}/{idInspeccion}` | Oficio devolución CSV |
| 17 | GET | `/controlsanciones/generardevolucion/{idInspeccion}` | Oficio devolución |
| 18 | GET | `/controlsanciones/generarenviocerradoporpago/{idInspeccion}` | Informe envío cerrado por pago |
| 19 | GET | `/controlsanciones/generarfuid/{estado}/{idInspeccion}` | FUID |
| 20 | GET | `/controlsanciones/generarbase` | Base aprobados |

## Rutas Angular (ssjfront)

- `/control-sanciones/registrar-movimiento` — movimiento individual
- `/control-sanciones/registrar-movimiento/:id` — mismo flujo con id interno precargado
- `/control-sanciones/registrar-movimiento-multiple` — movimiento múltiple
- (Compat.) `/control-sanciones/registrarmovimiento*` redirige a las rutas anteriores

Equivalente legacy: `#!/controlsanciones/registrarmovimiento/:id` y `#!/controlsanciones/registrarmovimientomultiple`.