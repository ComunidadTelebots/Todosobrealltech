import random
import string


def _gen_password(length=16):
    alphabet = string.ascii_letters + string.digits + "!@#$%&*_-+=?"
    return "".join(random.choice(alphabet) for _ in range(length))


def handle_command(bot, cid, uid, text, rank):
    parts = text.strip().split()
    if not parts or parts[0].lower() != "/genpass":
        return False
    length = 16
    if len(parts) > 1 and parts[1].isdigit():
        length = max(8, min(64, int(parts[1])))
    pwd = _gen_password(length)
    bot.send_msg(cid, f"Password ({length}): `{pwd}`")
    return True
