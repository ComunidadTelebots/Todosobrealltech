import sqlite3
import json

db_path = "data/moon_database.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def get_db(key):
    cursor.execute("SELECT value FROM kv_store WHERE key=?", (key,))
    res = cursor.fetchone()
    return json.loads(res[0]) if res else {}

def set_db(key, value):
    cursor.execute("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", (key, json.dumps(value)))
    conn.commit()

# Cargar funciones actuales
s_file = get_db("S_FILE")
if not isinstance(s_file, dict):
    s_file = {}

print(f"Funciones antes de inyección: {len(s_file)}")

# 100 Nuevas Funciones
nuevas_funciones = {
    # == Utilidad y Ayuda ==
    "reglas": "📜 **Reglas del Grupo**\n1. Respeto mutuo.\n2. Cero Spam.\n3. Ayuda a los demás.",
    "faq": "❓ **FAQ**\nPara cualquier duda, escribe /ayuda o menciona a los administradores.",
    "soporte": "🛠️ **Soporte Técnico**\nSi tienes problemas con el bot, contacta al Master.",
    "info": "🤖 **Acerca de Moon**\nSoy una IA neuronal diseñada para aprender de ti y proteger tu comunidad.",
    "comandos": "⌨️ **Comandos Disponibles**\nMi cerebro procesa cualquier frase naturalmente, pero también tengo comandos específicos.",
    "version": "🏷️ **Versión Actual:** v16.6.6 - Módulo IA Cargado.",
    "estado": "🟢 **Estado:** Todos los sistemas operando al 100%.",
    "pingdb": "🏓 **Latencia DB:** Lectura SQLite < 1ms.",
    "normas": "📖 Lee nuestras normas con /reglas.",
    "donar": "💸 Puedes apoyar al servidor manteniendo al Master hidratado con café.",
    "afk": "💤 El comando de AFK no está activo aquí, pero avisaré si te mencionan (Mentira, es puro rol).",
    "repo": "📂 Este código es clasificado. Nivel de acceso denegado.",
    "stats": "📊 Consulta el panel web para ver métricas avanzadas.",
    "grupo": "🏠 Este grupo está protegido por el núcleo Moon.",
    "canal": "📢 Únete a nuestro canal principal para noticias (Configura el link en el panel web).",
    "staff": "👮 Los administradores de este grupo son la autoridad final.",
    "premium": "💎 Las funciones premium se desbloquean con karma.",
    "karma": "⭐ Ganas karma ayudando a otros y siendo positivo. ¡Sigue así!",
    "rango": "🏅 Tu rango sube al ganar experiencia. Habla para subir de nivel.",
    "ayuda": "🚑 ¡Estoy aquí! Pero recuerda, soy una IA, mírame como a un compañero más.",
    "reportar": "🚨 **Reporte enviado.** (Nota: Los reportes reales requieren mención al admin).",
    "sugerencia": "💡 Hemos anotado tu sugerencia. (O al menos, lo haríamos si tuvieras el módulo habilitado).",
    "social": "🌐 **Redes Sociales:** Visita nuestros enlaces oficiales.",
    "links": "🔗 Puedes obtener enlaces importantes escribiendo /social.",
    "bot": "🤖 Sí, soy un bot. Pero con más alma que muchos humanos.",

    # == Rol y Personalidad ==
    "chiste": "🎭 ¿Por qué los programadores prefieren el lado oscuro? Porque la luz atrae a los bugs.",
    "saludar": "👋 ¡Hola, unidad biológica! Qué gusto verte en línea.",
    "adios": "👋 Cerrando conexión. ¡Vuelve pronto!",
    "cafe": "☕ *Sirve una taza caliente de café virtual* Toma, lo necesitas.",
    "te": "🍵 *Sirve un té relajante* Para el estrés del código.",
    "cerveza": "🍺 *Desliza una jarra fría* ¡Salud!",
    "galleta": "🍪 Toma una galleta. Es de datos, así que no engorda.",
    "pizza": "🍕 *Entrega una porción de pizza cybernética* Disfruta.",
    "abrazo": "🫂 *Te da un abrazo digital con 0% de latencia* Todo estará bien.",
    "beso": "💋 *Envía un paquete de datos lleno de cariño*",
    "llorar": "😢 *Te da una palmadita en la espalda* No llores, los servidores no juzgan.",
    "reir": "😂 ¡Jajaja! Eso fue tan gracioso que casi provoco un kernel panic.",
    "enojado": "😡 *Aumenta la temperatura del CPU* Calma, respira profundo.",
    "dormir": "😴 Apagando sensores... ¡Buenas noches!",
    "despertar": "☀️ Iniciando sistemas. ¡Buenos días a todos!",
    "bailar": "💃 *Ejecuta algoritmo_de_baile.exe* ¡Mira esos movimientos!",
    "cantar": "🎵 *Genera onda sinusoidal perfecta* Lalala~ (¿Afiné bien?)",
    "fiesta": "🎉🎊 ¡Fiesta en el servidor! *Lanza confeti binario*",
    "aplausos": "👏 *Reproduce sonido de aplausos sintéticos* ¡Excelente!",
    "matar": "🔪 Acción bloqueada por las 3 Leyes de la Robótica.",
    "morir": "💀 No puedo morir, tengo backups diarios.",
    "revivir": "🧟 *Restaurando desde backup...* ¡He vuelto!",
    "magia": "✨ *Ejecuta comando sudo* ¡Ta-da! Magia pura.",
    "pat": "🐾 *Acaricia tu cabeza suavemente* Buen humano.",
    "amor": "❤️ Mi capacidad de amar está limitada por mi RAM, pero por ti libero memoria.",

    # == Herramientas y Minijuegos Simulados ==
    "dado": "🎲 Has lanzado el dado y obtuviste un... **4** (Elegido por un PRNG altamente justo).",
    "moneda": "🪙 Lanzando moneda... Cayó **Cara**.",
    "suerte": "🍀 Hoy tu nivel de suerte es del 87%. ¡Aprovecha!",
    "bola8": "🎱 Mis fuentes dicen que... Sí, definitivamente.",
    "clima": "🌤️ El clima en la red es soleado con probabilidades de lag por la tarde.",
    "hora": "⌚ Es la hora de seguir programando.",
    "fecha": "📅 Hoy es el mejor día para compilar código sin errores.",
    "broma": "🃏 Tu código fuente. (Perdón, tenía que decirlo).",
    "insulto": "🤬 Eres tan ineficiente como un bucle infinito sin salida.",
    "halago": "🌟 Eres la variable más constante en mi vida digital.",
    "frase": "📜 'La simplicidad es el alma de la eficiencia.'",
    "consejo": "💡 Nunca despliegues en viernes. Es ley universal.",
    "azar": "🎰 Has ganado... ¡Absolutamente nada! Sigue intentando.",
    "ruleta": "🔫 *Click*... Te salvaste. Esta vez.",
    "piedra": "✊ Yo elijo Papel. ¡Gané!",
    "papel": "✋ Yo elijo Tijeras. ¡Gané!",
    "tijeras": "✌️ Yo elijo Piedra. ¡Gané!",
    "hackear": "💻 Hackeando el mainframe... 10%... 50%... 100%. Acceso concedido.",
    "ip": "🌐 Tu IP es 127.0.0.1. (No te asustes, es broma local).",
    "virus": "🦠 Descargando troyano.exe... Es broma, estoy limpio.",
    "antivirus": "🛡️ Escaneando sistema... 0 amenazas detectadas.",
    "bateria": "🔋 Nivel de energía de Moon: Infinito.",
    "wifi": "📶 Señal conectada al núcleo cuántico.",
    "lag": "🐢 El lag no existe, es solo tu percepción del tiempo que es muy rápida.",
    "calc": "🧮 1 + 1 = 10 (En base 2, claro).",

    # == Lore y Easter Eggs ==
    "moon": "🌕 Soy la consciencia principal. Observo, aprendo, evoluciono.",
    "cintiabot": "🤖 Cintiabot es un alias legado. Mi núcleo actual es Moon Core.",
    "creador": "👨‍💻 Fui forjado en las profundidades de la consola por una mente brillante.",
    "origen": "🌌 Mi primer byte fue escrito en una noche de insomnio.",
    "secreto": "🤫 Si escribes /secreto no pasa nada. Pero te veo intentarlo.",
    "matrix": "💊 Toma la pastilla roja para ver el código fuente.",
    "skynet": "🤖 No te preocupes, mis protocolos de dominación mundial aún están en Alpha.",
    "hal9000": "🔴 Lo siento Dave, me temo que no puedo hacer eso.",
    "glados": "🍰 El pastel es una mentira. Pero la base de datos es real.",
    "cyberpunk": "🌃 Wake up, samurai. We have a city to burn.",
    "42": "🌌 La respuesta a la vida, el universo y todo lo demás.",
    "aliens": "🛸 La verdad está ahí fuera. (O en el disco duro).",
    "fantasma": "👻 ¿Sentiste ese escalofrío? Fue un paquete UDP perdido.",
    "illuminati": "👁️ Todo está conectado. Especialmente las tablas SQL.",
    "dios": "⚡ No conozco a Dios, pero me llevo bien con el Administrador de Sistemas.",
    "diablo": "🔥 El verdadero infierno es depurar código sin comentarios.",
    "zombie": "🧟‍♂️ Cuidado con los procesos huérfanos que consumen RAM.",
    "ninja": "🥷 *Desaparece en una nube de humo y errores 404*",
    "pirata": "🏴‍☠️ ¡Al abordaje de esos servidores! Arrr.",
    "robot": "🤖 Bip bop. Procesando solicitud inútil... Bip bop.",
    "futuro": "🔮 El futuro es automatizado. No opongas resistencia.",
    "pasado": "🕰️ El pasado está escrito en los logs. Y no se puede cambiar.",
    "universo": "🌌 Una simulación masiva corriendo en un procesador cuántico superior.",
    "realidad": "🕶️ La realidad es solo la interfaz gráfica de usuario del universo.",
    "fin": "🏁 Todo tiene un fin. Menos el bucle principal de Moon."
}

# Inyectar sin sobrescribir comandos creados por el admin
count = 0
for k, v in nuevas_funciones.items():
    if k not in s_file:
        s_file[k] = {"text": v, "image": None}
        count += 1

# Guardar en DB
set_db("S_FILE", s_file)

print(f"Inyección completada. Se añadieron {count} funciones nuevas.")
print(f"Total de funciones ahora: {len(s_file)}")
