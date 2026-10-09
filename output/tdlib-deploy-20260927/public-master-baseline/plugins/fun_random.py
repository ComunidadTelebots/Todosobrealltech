import random


CHOICES = [
    "Si",
    "No",
    "Tal vez",
    "Mejor no",
    "Definitivamente",
    "No por ahora",
]


def handle_command(bot, cid, uid, text, rank):
    t = text.strip()
    low = t.lower()

    if low == "/coin":
        bot.send_msg(cid, "Cara" if random.randint(0, 1) == 0 else "Cruz")
        return True

    if low.startswith("/dice"):
        parts = low.split()
        faces = 6
        if len(parts) > 1 and parts[1].isdigit():
            faces = max(2, min(100, int(parts[1])))
        val = random.randint(1, faces)
        bot.send_msg(cid, f"Dado ({faces}): `{val}`")
        return True

    if low.startswith("/8ball "):
        bot.send_msg(cid, random.choice(CHOICES))
        return True

    return False
