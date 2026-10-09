TUTORIAL_TEXT = """Guia rapida de uso de Moon Multibot

1) Primeros pasos
- Escribe /id para ver chat_id y user_id.
- Escribe /helpplus para ver comandos extra instalados.
- En la web del bot puedes gestionar plugins, IA y seguridad.

2) Comandos utiles (usuarios)
- /calc (2+5)*3
- /genpass 20
- /todo add Revisar reglas
- /todos
- /note add Mensaje importante
- /notes
- /coin | /dice 20 | /8ball <pregunta>

3) Comandos de texto y enlaces
- /upper texto
- /lower TEXTO
- /reverse texto
- /count texto
- /extracturls texto con links
- /domain https://example.com/ruta

4) Productividad
- /remind 600 Beber agua
- /poll Pregunta | Opcion A | Opcion B

5) Administracion (admins)
- /kick <uid>
- /mute <uid> <minutos>
- /unmute <uid>
- /pin <message_id>
- /setwelcome <mensaje>

6) Panel web
- Bots: alta/baja de tokens
- IA: modo, proveedor, feeders y estadisticas
- Moderacion: warns, mute y acciones de seguridad
- Plugins: activar/desactivar/recargar

Tip: usa comandos cortos y prueba en un grupo de test antes de produccion.
"""


def handle_command(bot, cid, uid, text, rank):
    t = text.strip().lower()
    if t not in ["/tutorial", "/guia", "/ayuda_bot"]:
        return False
    bot.send_msg(cid, TUTORIAL_TEXT)
    return True
