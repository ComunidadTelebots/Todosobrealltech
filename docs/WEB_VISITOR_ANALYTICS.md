# Visitas reales de la web

Panel: `/admin/statistics`, con la autenticación administrativa existente.
La sección anterior usaba datos de ejemplo; el nuevo panel no genera visitas ficticias.
Cuenta vistas de páginas, no personas únicas, sesiones ni llamadas a la API.

Despliegue: ejecutar la migración PocketBase `1790100000_create_web_pageviews.js`
y desplegar API y web de la misma revisión. La colección solo admite acceso desde
la API autenticada con PocketBase; el navegador no puede consultar eventos.
El mapa empieza a recoger después del despliegue, sin reconstruir historial previo.

El receptor público acepta eventos con consentimiento y aplica un límite de 60/minuto
por IP. El navegador respeta la preferencia de analítica existente, DNT y GPC.
No envía usuario, token, búsqueda, fragmento, título de página ni referrer; las rutas
se agrupan en secciones para no almacenar identificadores de contenido/personas.
La IP solo se utiliza transitoriamente para GeoIP y el límite de peticiones;
la colección no almacena IP. Los logs HTTP existentes tienen su propia configuración.
No se usan cookies de seguimiento adicionales ni IDs persistentes de visitante.

Si la API está detrás de proxy, configurar `TRUSTED_PROXY_CIDRS` con las IP/CIDR
reales de los proxies internos autorizados que sanitizan X-Forwarded-For. No usar
`true`, `0.0.0.0/0` ni confiar indiscriminadamente en cabeceras públicas. Sin esta
configuración puede verse ubicación desconocida o la del proxy. No se ha cambiado
la configuración del servidor de producción desde este trabajo.

Ubicación estimada mediante geoip-lite; puntos redondeados a grados enteros,
ciudades aproximadas. Idioma declarado por el navegador, nunca usado para adivinar
ubicación. VPN, proxies y redes móviles pueden alterar GeoIP. Los eventos de un
navegador no son una prueba de humanidad; no hay clasificación antibot avanzada.

Periodos 24h/7d/30d/90d, días UTC. Máximo 10.000 eventos recientes analizados por
consulta, paginados en lotes de 500; el panel indica cualquier truncamiento.
No se calcula visitantes únicos ni se mezcla con estadísticas de Telegram o GA4.
La selección de 90 días limita la consulta, no borra registros antiguos: definir
la retención de la colección en la operación de PocketBase.

Cartografía local de dominio público: Natural Earth, ne_110m_admin_0_countries,
https://github.com/nvkelso/natural-earth-vector/tree/master/geojson.
El mapa no solicita teselas ni comparte eventos con servicios cartográficos.

## Mapa único y selector de origen

El mapa existente del dashboard conserva Telegram como selección inicial y añade
web y Hub. En Telegram se ofrece el histórico de usuarios y filtros nuevos por
chat privado, grupo/supergrupo y canal. Estos filtros cuentan observaciones de
mensajes a partir del despliegue, no personas únicas ni un historial reconstruido.
Un mismo mensaje observado por varios bots puede contabilizarse varias veces.
No se guardan IDs de usuarios/chats ni contenido en los nuevos contadores.
Los canales sin idioma de remitente se clasifican como `und` (desconocido).
El backend mantiene `total_users` por compatibilidad y añade
`metric: message_observations` para los filtros nuevos; la interfaz ajusta la unidad.

Hub envía una vista por carga a la API de Todosobrealltech con su preferencia de
analítica y DNT/GPC. Configurar CORS_ORIGIN con el origen real del Hub si utiliza
otro dominio. No envía initData, token de Telegram ni credenciales de usuario.
El campo source separa web y Hub; no se suman visitas con usuarios de Telegram.
