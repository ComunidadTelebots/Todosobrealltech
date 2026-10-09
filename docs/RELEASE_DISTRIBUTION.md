# Reparto de funciones por madurez

Análisis del 22 de septiembre de 2026. Alcance: Todosobrealltech (incluye su API)
y moon-multibot. El inventario reproducible está en `release-branch-audit.json`.
No se han desplegado contenedores, cambiado permisos ni modificado producción.

## Reparto preparado

| Canal | Moonbot | Todosobrealltech | Alcance |
|---|---|---|---|
| Dev | Nueva rama `dev`, candidato `c39aeca` | `develop`, candidato `1266c52` | Integración completa; TDLib nativo, gateway oficial y cola experimental; panel de preparación y contadores de cola. |
| Alpha | `alpha`, candidato `0c3c46c` | `alpha`, candidato `df7cf8f` | Telemetría, ranking por tipos de mensajes, ping entre nodos, pausa y transferencia; acceso a entornos, detección de abuso, actualizaciones y mapa de workers con bots. |
| Beta | Se conserva `5604906` | Se conserva `6c617be` | No se certifican nuevas funciones como beta sin validación completa de ambos servicios y recuperación ante fallos. |
| RC | Se conserva `a0dcfda` | Se conserva `6c617be` | Sin nuevas promociones; requiere un candidato beta probado y congelado. |
| Estable | `master`, `22d2b1f` | `main`, `4dc8eee` | Base publicada actual; no se mezclan cambios experimentales ni se activa despliegue. |

Los candidatos alpha contienen los cambios anteriores necesarios: no son archivos
aislados que puedan funcionar sin las rutas de API, permisos y migraciones de su
misma versión. Las actualizaciones de dependencias ya presentes en las bases de
desarrollo permanecen en alpha; todavía no se certifican para beta/RC.

## Evidencia y límites

- CI del candidato dev de Moonbot: Python 3.12, Python 3.14 y construcción Docker
  aprobados. Prueba real acotada: un comando de calculadora, una respuesta confirmada.
- CI del candidato alpha de Moonbot `0c3c46c`: aprobada. No demuestra recuperación
  integral con varios workers ni compatibilidad completa de plugins con TDLib.
- CI de los candidatos web `df7cf8f` y `1266c52`: aprobada. En la versión más reciente,
  219 pruebas locales de API aprobadas y compilación web aprobada.
- La cola todavía no participa en el bucle principal de Moonbot; se reserva para dev.
- Los manifiestos generados dinámicamente se inventarían sin ejecutar código de otras
  ramas. La presencia de un archivo de prueba o una etiqueta `beta` no acredita madurez.
- La vista `/dev/moonbot-control` usa datos de ejemplo; no sustituye la prueba de
  la web autenticada contra la API y los Docker reales.

## Resultado de la revisión de todas las ramas remotas

### Todosobrealltech

| Rama | Resultado |
|---|---|
| `develop` | Base de integración. Recibe las novedades completas de la PR 42. |
| `alpha` | Actualmente idéntica a beta/RC; preparada actualización al candidato alpha. |
| `beta` | Mismo commit que alpha/RC; no hay evidencia de una promoción diferenciada. |
| `rc` | Mismo commit que alpha/beta; no puede considerarse candidata validada solo por el nombre. |
| `main` | Rama estable y origen del despliegue automático. |
| `master` | Línea histórica con dos commits adicionales de documentación de simuladores respecto a su base; no equivale a `main`. |
| `staging` | Base antigua, 125 commits por detrás de develop en el inventario; no debe usarse como candidata actual. |
| `agent/improve-noticiasweb3-hub` | Mismo contenido que master; conservar trazabilidad, sin promoción por antigüedad. |
| `codex-adsense-sitemaps` | Trabajo ya contenido en develop; no es un canal de versión. |
| `codex/moonbot-operations` | Trabajo integrado en develop por PR 41. |
| `codex/moonbot-environment-access` | Fuente del candidato dev; sus ocho primeros commits nuevos forman el candidato alpha. |

### Moonbot

| Rama | Resultado |
|---|---|
| `alpha` | Base actual de integración de operaciones; recibe analítica y control, hasta `0c3c46c`. |
| `alfa` | Línea distinta: 287 commits propios frente a alpha y le faltan 18 de esta. Contiene router, copias de interfaces por canal, juegos y Right to Updates. Revisión independiente pendiente. |
| `beta` | Deriva de la línea alfa; incorpora etiquetado masivo de manifiestos. No prueba que cada función sea beta. |
| `rc` | Deriva también de alfa; etiquetado masivo como RC sin cobertura CI de esa rama. |
| `prealfa` | Línea experimental divergente, con aislamiento de entornos y simuladores. Se conserva; no se fusiona a ciegas con dev. |
| `master` | Versión estable v16.85.0; no es antecesor lineal de toda la línea alpha actual. |
| `agent/improve-noticiasweb3-hub` | Router/webhook y cambios históricos; no equivale al gateway oficial TDLib. |
| `codex/operations-telemetry` | Integrada por PR 9 en alpha. |
| `codex/chat-message-ranking` | Fuente del candidato dev; primeros cuatro commits nuevos forman el candidato alpha. |

También se registran todas las ramas locales y su divergencia en el inventario.
Varias están desactualizadas respecto a GitHub; no se sobrescriben. La rama local
`agent/horizonte-202-roadmap`, sin equivalente remoto en el inventario, queda como
trabajo independiente pendiente de revisión funcional.

## Bloqueos de promoción

El `patched_api_call` de la línea alfa reenvía actualizaciones a los canales
autorizados, pero devuelve la misma respuesta completa al receptor estable.
Esto permite que el mismo evento se procese localmente y en otros canales.
Además, captura errores de reenvío sin persistencia/reintento durable y usa
`queue.Queue` en memoria. No es equivalente a distribución durable con un único
consumidor. Se necesita corregir ese recorrido y probar caídas antes de promoverlo.

Los workflows CI de beta/RC de Moonbot solo escuchan master; la CI de desarrollo
web solo escucha main/develop. Hay que ampliar la cobertura por canal y ejecutar
las pruebas en el commit exacto propuesto antes de nuevas promociones beta/RC.

Para subir de alpha a beta: probar permisos reales, pausa/drenaje, reasignación,
actualización y rollback con dos Docker de pruebas, confirmando no duplicación.
Para RC: además, compatibilidad de migraciones, backup/restore y prueba de carga.
Para estable: candidata RC validada y procedimiento de despliegue/rollback.

## Reparto aplicado en GitHub

Confirmado por el usuario y aplicado el 22 de septiembre de 2026 (hora local).

- Moonbot: PR 10 fusionada en la nueva rama `dev`, commit `5065688`.
- Todosobrealltech: PR 42 fusionada en `develop`, commit `05346bb`.
- Alpha Moonbot actualizada por fast-forward a `0c3c46c`.
- Alpha Todosobrealltech actualizada por fast-forward a `df7cf8f`.
- Beta, RC y estable verificados contra GitHub: conservan los SHA de la tabla.
- No se han realizado despliegues ni borrado ramas ni utilizado force-push.

El inventario JSON conserva la fotografía anterior al reparto para trazabilidad.
La cobertura CI adicional para dev/alpha web y beta/RC sigue pendiente antes de
futuras promociones; no se han certificado todos los plugins ni las ramas históricas.
