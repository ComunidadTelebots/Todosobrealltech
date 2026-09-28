# Separación de contactos de GamerGitBug

Estos parches reproducen el cambio limitado sobre la versión que está desplegada: web/API managed-family-20260928 y Moonbot con core/bot_conversations.py. Se conservan aquí en develop porque esa rama aún no contiene el explorador de conversaciones desplegado; no se promocionan todas las diferencias experimentales para añadir un filtro.

- alltech.patch: acepta source en la API autenticada y añade tres opciones y etiquetas al explorador master.
- moonbot.patch: filtra en el servidor antes de paginar. Reconoce únicamente metadatos de contacto o /start gamergitbug_contact y /contacto_gamergitbug registrados por CintiaBot en un chat privado. No atribuye por palabras sueltas ni por mensajes de otro bot.
- source: all, gamergitbug, general. Un detalle que no pertenece al filtro devuelve 404; valores desconocidos, 400. La autenticación existente se mantiene.
- Los chats de contacto conservan su historial completo; esto clasifica conversaciones, no elimina mensajes ajenos al contacto.

Aplicación sobre la revisión compatible: git apply --check antes de git apply. No aplicar sobre una rama incompatible ni sustituir archivos diferentes sin comparar.

Pruebas Moonbot: python -m unittest discover -s tests -p test_bot_conversations.py (7 casos). La web se compila con su Dockerfile de producción. Imágenes: todosobrealltech-web:contact-filter-20260928 y todosobrealltech-api:contact-filter-20260928. Respaldos del despliegue: /root/contact-filter-20260928.
