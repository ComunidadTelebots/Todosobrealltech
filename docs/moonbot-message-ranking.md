# Ranking de mensajes de Moonbot

El panel del creador incluye Ranking de mensajes: últimas 24 horas, 7 días o 30 días, selección por tipo y desglose por chat. Ordena por número de mensajes del tipo seleccionado; el porcentaje usa todos los chats coincidentes, aunque solo se muestran los primeros 100. Los empates se ordenan por ID.

Se necesita desplegar también la implementación de `core/message_analytics.py` en Moonbot. Su endpoint interno `/api/internal/message-ranking` usa la autenticación servidor a servidor existente. Todosobrealltech expone `/moonbot-admin/message-ranking` solo al creador, porque contiene información global de grupos y canales. No hay ranking público.

Moonbot almacena únicamente ID de chat, título, ID de mensaje, instante de recepción y categoría en `data/message-analytics.sqlite3`, configurable con `MOON_MESSAGE_ANALYTICS_FILE`. Mantener ese archivo en el volumen persistente del despliegue. SQLite serializa escrituras y elimina duplicados por chat/mensaje dentro de la retención. La limpieza ocurre como máximo una vez por hora al recibir mensajes y conserva 30 días; sin tráfico quedan filas antiguas en disco, pero no aparecen en los periodos consultados. No guarda textos, pies de foto, remitentes ni archivos multimedia.

Los contadores comienzan al activar esta versión. Se cuentan mensajes nuevos de grupos y canales recibidos por el bucle de actualizaciones, antes de la moderación; se excluyen mensajes privados, ediciones y envíos directos del bot. Fotos con pie cuentan como foto, animaciones como animación aunque Telegram adjunte también documento. Mensajes de servicio y tipos no reconocidos van a Otros y servicio. No permite reconstruir el pasado a partir del antiguo historial global de 300 entradas, que no conserva tipos fiables.

El ranking corresponde al despliegue conectado, no fusiona réplicas o Docker independientes. La cobertura depende de las actualizaciones que Telegram entregue al bot y del funcionamiento del almacenamiento; no es el total histórico real del chat. Un fallo de registro se anota en Moonbot sin detener la moderación. La vista `/dev/moonbot-control` utiliza ejemplos explícitos, con filtros funcionales.
