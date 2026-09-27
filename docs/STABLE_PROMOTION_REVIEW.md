# Revisión de paneles y candidato estable — 27 de septiembre de 2026

Inventario reproducible: `STABLE_PANEL_INVENTORY.json`, generado mediante
`scripts/audit_stable_panels.py`. Se examinan siete ramas de Moonbot y cinco de
Todosobrealltech sin importar código de otras ramas ni ejecutar sus plugins.
Las referencias exactas están en el JSON. Una ruta o un botón no certifican una
función operativa. Este informe no certifica el estado de ningún despliegue.

## Resultado por rama

| Repositorio / rama | Rutas estáticas | Vistas/componentes inventariados | Archivos de plugins |
|---|---:|---:|---:|
| Moonbot master | 148 | 6 | 26 |
| Moonbot dev | 278 | 10 | 35 |
| Moonbot alpha | 277 | 10 | 35 |
| Moonbot alfa | 335 | 11 | 63 |
| Moonbot beta / rc | 277* | 12 | 62 |
| Moonbot prealfa | 277* | 12 | 62 |
| Web main | 25 | 43 | — |
| Web develop | 26 | 53 | — |
| Web alpha | 26 | 52 | — |
| Web beta / rc | 25 | 43 | — |

*El archivo principal no se pudo analizar: `unexpected indent`, línea 7151 en
beta/rc y 7163 en prealfa. Sus conteos de rutas son incompletos. No promover estas
ramas completas hasta corregir sintaxis y ejecutar su conjunto de pruebas.
Los archivos de plugins incluyen auxiliares; no son un recuento de comandos.
Las vistas Hub incluyen funciones auxiliares de renderizado detectadas; no son
un recuento de funciones de negocio completas.

## Hub, web y bot: qué promover

| Bloque | Superficies y contratos | Propuesta para estable | Validación pendiente |
|---|---|---|---|
| Identidad de versión y Master | Hub `master`, selector de versiones, `/api/public/tg_auth` | Prioridad 1: versión real, permisos Master y acceso coherente | JWT de Telegram, expiración, usuario sin privilegios; no confundir versión de interfaz y backend |
| Observabilidad y mapa | Centro Moonbot, idiomas por origen, web/Hub, tráfico, recursos | Prioridad 1: lecturas y métricas reales, estados vacíos y timeouts explícitos | Contrato API/Moonbot de la misma revisión, consentimiento, carga y aislamiento de servicios |
| Permisos y moderación | Grupos, bot-permissions, join/settings, spam, sanctions/review | Prioridad 2: vista de permisos y simulación; acciones después | Derechos reales del bot, rol del operador, auditoría y no repetición de sanciones |
| Comunidad y usuarios | Hub `usuario`, roles, preferencias, engagement, directorio | Prioridad 2: preferencias y peticiones de rol | Autorización por grupo/usuario; separar perfiles web de Telegram |
| Noticias, RSS y anuncios | Hub canales/grupo, editorial, house-ads, RSS | Prioridad 2: lectura/configuración validada | Publicación única, permisos por canal, colas y errores de proveedores |
| Seguridad | Listas, apelaciones, informes, evidencia y amenazas | Prioridad 2: revisión humana antes de sancionar | Minimización de datos, alcance de listas y controles de acceso |
| Versiones y workers | Entornos, despliegues, topología, pausa y desvío | Prioridad 3: promover por contrato completo, no copiar solo la interfaz | Asignación exclusiva de tokens, drenaje, reinicio y recuperación con dos workers |
| TDLib compatible | `bot_endpoint`, servidor oficial Bot API, panel de preparación | Prioridad 1 para candidato de pruebas; promoción por bot | logOut coordinado, identidad, actualizaciones, medios, callbacks y plugins |
| TDLib nativo | `tdlib_client`, receptor de eventos y adaptadores | Mantener experimental | Adaptación completa de eventos/métodos y pruebas de todos los complementos |
| Cola distribuida | SQLite inbox y workers | Mantener experimental | Integración real con el bucle principal, orden por chat y reconciliación de efectos inciertos |
| Chat/noticias de otras ramas | Hub `chat` y `noticias` de alfa/beta/rc | Revisar aisladamente | Ramas divergentes y errores de sintaxis; un selector visual no aporta el backend |
| Catálogos y simuladores | Roadmaps, manifiestos, previews | No presentarlos como capacidad operativa | Distinguir metadatos, simulación y ejecución real |

El JSON contiene la lista completa de rutas y vistas detectadas por rama, no
solo los bloques de esta tabla. Las llamadas dinámicas, registros generados,
plugins externos y flujos privados en Telegram quedan fuera de la certificación
estática: requieren pruebas autenticadas específicas.

## Migración de todos los bots a TDLib

La vía compatible es el servidor oficial `tdlib/telegram-bot-api`: los plugins
mantienen su contrato HTTP y el servidor usa TDLib. No equivale a convertir cada
plugin en un cliente TDLib nativo ni añade reparto de trabajos automáticamente.
El inventario existente registra 59 métodos y cinco llamadas dinámicas. Aunque
la comparación estática no encontró métodos ausentes, no certifica todos los
argumentos, formatos ni efectos de los plugins. El inventario ahora detecta
además URLs directas que eluden el servidor seleccionado.

Queda un acceso directo en la utilidad `scripts/parse_backups.py`. No forma parte
del receptor habitual y no debe ejecutarse junto a este: usa `getUpdates` y avanza
el offset, lo que puede confirmar actualizaciones a pesar de lo que afirma su
comentario. Debe adaptarse o retirarse del procedimiento de migración antes de
utilizarla con bots migrados.

Secuencia propuesta, sin cambio masivo automático:

1. Preparar imagen oficial fijada, credenciales como secreto y volumen persistente;
   puerto del gateway privado, conectividad desde el worker y límites de recursos.
2. Adaptar estable con `bot_endpoint`, sus descargas de archivos y pruebas. Mantener
   desactivado el cliente TDLib nativo para los bots asignados al gateway.
3. Probar un único bot: identidad, recepción, respuesta, callback, archivo, voz,
   edición, permisos y reconexión. Comparar plugins realmente habilitados.
4. Detener el receptor anterior y drenar trabajo; seguir el procedimiento oficial
   de `logOut`. No mantener dos receptores activos del mismo token.
5. Asignar los IDs numéricos verificados en `MOON_LOCAL_BOT_IDS`. Mover por lotes
   pequeños y comprobar cada bot antes de ampliar la selección.
6. Usar `*` solo después de validar todos los bots. No hacer fallback HTTP ciego
   tras un envío ambiguo: podría duplicar mensajes. La reversión tiene que respetar
   el cambio de sesión de Telegram, no es un simple cambio de variable.

Referencias: https://github.com/tdlib/telegram-bot-api#moving-a-bot-to-a-local-server
 y https://core.telegram.org/bots/api#logout.

## Correcciones realizadas durante esta revisión

- La descarga de notas de voz respeta el gateway asignado al bot y rechaza rutas
  de archivo inseguras. Antes estaba fijada a api.telegram.org.
- El inventario TDLib detecta accesos HTTP directos, además de métodos y llamadas
  dinámicas; permite volver a identificar este tipo de incompatibilidad.
- Una configuración de gateway inválida o una sesión averiada no derriba la
  consulta de preparación de todos los bots. Se informa por bot sin revelar tokens.
- El panel web muestra estas incidencias y los accesos directos pendientes.

No se ha migrado ningún bot de producción como consecuencia de este informe.
