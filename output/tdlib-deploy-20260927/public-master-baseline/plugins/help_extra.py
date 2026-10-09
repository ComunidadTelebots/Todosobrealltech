HELP_TEXT = """Comandos extra instalados:
/calc <expr>
/genpass [len]
/note add|del, /notes
/todo add|done, /todos
/extracturls <texto>
/domain <url>
/upper, /lower, /reverse, /count
/coin, /dice [caras], /8ball <pregunta>
/poll Pregunta | op1 | op2
/remind <seg> <mensaje>
/id
/welcome, /setwelcome <mensaje>
/tutorial
"""


def handle_command(bot, cid, uid, text, rank):
    if text.strip().lower() != "/helpplus":
        return False
    bot.send_msg(cid, HELP_TEXT)
    return True
