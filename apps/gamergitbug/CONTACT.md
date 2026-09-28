# Contacto oficial

El widget abre https://t.me/CintiaBot?start=gamergitbug_contact. Telegram requiere que el usuario pulse Iniciar; la web no envía mensajes por su cuenta.

Moonbot interpreta /start gamergitbug_contact o /contacto_gamergitbug en chats privados de CintiaBot. Captura la siguiente consulta de texto durante 30 minutos y después devuelve el control al bot habitual. /cancelar_contacto permite salir. Los demás comandos y bots conservan sus funciones.

La bandeja /contacto-admin/ reutiliza PocketBase y las API master de Moonbot existentes. Requiere una cuenta creator verificada por el servidor; no basta con cargar la página. No almacena el token en disco, cookies ni URL. Si la cuenta solo usa login Telegram, está disponible el panel master original de TodoSobreAllTech.

Docker debe compartir la red de los servicios todosobrealltech-api:3001 y todosobrealltech-pocketbase:8090. La API debe disponer de /moonbot-admin/development-access y /moonbot-admin/bot-conversations, y conectar a Moonbot. No iniciar un segundo polling ni cambiar el webhook del bot.

La bandeja muestra todos los chats privados de CintiaBot, no únicamente consultas del portfolio. Solo responde mensajes conservados con identidad verificable. El envío no se reintenta tras timeout: hay que revisar el historial antes de repetir.

Pruebas: node --test apps/gamergitbug/test/contact.test.mjs. En Moonbot: python -m unittest discover -s tests -p test_gamergitbug_contact.py.
