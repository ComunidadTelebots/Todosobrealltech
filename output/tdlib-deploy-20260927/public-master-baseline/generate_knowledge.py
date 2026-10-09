import json

categories = {
    "tech": [
        "procesador", "memoria", "algoritmo", "servidor", "nube", "red", "fibra", "datos", "encriptacion", "kernel",
        "binario", "compilador", "depuracion", "interfaz", "usuario", "experiencia", "diseño", "front-end", "back-end", "full-stack",
        "framework", "libreria", "api", "endpoint", "token", "sesion", "cookie", "cache", "buffer", "pila", "cola",
        "hilo", "proceso", "concurrencia", "paralelismo", "asincrono", "promesa", "callback", "evento", "oyente",
        "microservicio", "contenedor", "docker", "kubernetes", "nube", "aws", "azure", "google-cloud", "firebase", "mongodb",
        "sql", "nosql", "relacional", "clave-valor", "documental", "grafos", "indice", "consulta", "transaccion", "rollback",
        "seguridad", "firewall", "proxy", "vpn", "antivirus", "malware", "phishing", "ransomware", "exploit", "vulnerabilidad",
        "parche", "actualizacion", "version", "git", "repositorio", "commit", "push", "pull", "merge", "branch", "fork",
        "despliegue", "ci/cd", "automatizacion", "script", "consola", "terminal", "shell", "bash", "powershell", "python",
        "javascript", "typescript", "html", "css", "sass", "less", "bootstrap", "tailwind", "react", "vue", "angular", "node",
        "express", "django", "flask", "fastapi", "php", "laravel", "ruby", "rails", "go", "rust", "cpp", "java", "kotlin", "swift"
    ],
    "space": [
        "galaxia", "estrella", "planeta", "satelite", "asteroide", "cometa", "meteoro", "nebulosa", "constelacion", "universo",
        "cosmos", "vacio", "gravedad", "orbita", "trayectoria", "lanzamiento", "cohete", "nave", "modulo", "estacion",
        "telescopio", "observatorio", "espectro", "luz", "fotón", "agujero-negro", "singularidad", "horizonte", "eventos",
        "materia-oscura", "energia-oscura", "expansion", "big-bang", "inflacion", "multiverso", "dimension", "tiempo", "relatividad",
        "curvatura", "espacio-tiempo", "geodesica", "pulsar", "quasar", "magnetar", "supernova", "enana-blanca", "gigante-roja",
        "sistema-solar", "sol", "mercurio", "venus", "tierra", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton",
        "exoplaneta", "habitable", "atmosfera", "oxigeno", "nitrogeno", "hidrogeno", "helio", "fusion", "fision", "nucleo",
        "manto", "corteza", "placa", "tectonica", "vulcanismo", "crater", "anillo", "luna", "fase", "eclipse", "marea",
        "radiacion", "viento-solar", "aurora", "campo-magnetico", "ionosfera", "estratosfera", "ozono", "clima", "vacio-cuantico"
    ],
    "cyber": [
        "neon", "cromo", "implante", "neuronal", "enlace", "matriz", "red", "suburbio", "megacorporacion", "sintetico",
        "androide", "cyborg", "hacker", "deck", "consola", "espacio-virtual", "avatar", "identidad", "anonimato", "criptomoneda",
        "blockchain", "smart-contract", "ia", "conciencia", "digital", "fuga", "sobrecarga", "voltaje", "pulso", "electromagnetico",
        "laser", "optica", "fibra", "datos", "trafico", "ancho-de-banda", "latencia", "ping", "lag", "glitch", "bug", "error",
        "sistema", "operativo", "codigo", "fuente", "binario", "hexadecimal", "bits", "bytes", "megas", "gigas", "teras",
        "petas", "exas", "zettas", "yottas", "infinito", "bucle", "recursividad", "pila", "memoria-viva", "almacenamiento",
        "disco-duro", "ssd", "nvme", "velocidad", "rendimiento", "overclock", "refrigeracion", "liquida", "nitrogeno", "silicio",
        "carbono", "nanotecnologia", "nanobot", "enjambre", "colmena", "mente", "colectiva", "red-social", "algoritmo", "filtro"
    ],
    "science": [
        "atomo", "molecula", "celula", "organismo", "especie", "evolucion", "genetica", "adn", "arn", "proteina", "enzima",
        "metabolismo", "energia", "materia", "masa", "peso", "fuerza", "aceleracion", "velocidad", "impulso", "energia-cinetica",
        "energia-potencial", "termodinamica", "entropia", "entalpia", "calor", "temperatura", "presion", "volumen", "densidad",
        "viscosidad", "tension", "superficial", "capilaridad", "osmosis", "difusion", "reaccion", "quimica", "enlace-ionico",
        "enlace-covalente", "catalizador", "acido", "base", "ph", "solucion", "mezcla", "elemento", "tabla-periodica",
        "metal", "no-metal", "gas-noble", "halogeno", "alcalino", "isotopo", "radiactividad", "particula", "electron", "proton",
        "neutron", "quark", "lepton", "boson", "higgs", "campo", "electrico", "magnetico", "electromagnetismo", "onda",
        "frecuencia", "amplitud", "longitud", "espectro", "refraccion", "difraccion", "interferencia", "polarizacion", "cuantica"
    ],
    "world": [
        "montaña", "valle", "rio", "lago", "oceano", "mar", "costa", "playa", "isla", "archipielago", "continente", "pais",
        "ciudad", "pueblo", "aldea", "metropolis", "capital", "frontera", "region", "desierto", "selva", "bosque", "tundra",
        "estepa", "sabana", "pantano", "glaciar", "volcan", "terremoto", "tsunami", "huracan", "tornado", "tormenta", "lluvia",
        "nieve", "granizo", "viento", "sol", "nube", "niebla", "humedad", "ecosistema", "habitat", "fauna", "flora", "animal",
        "planta", "arbol", "flor", "fruto", "semilla", "raiz", "tallo", "hoja", "fotosintesis", "respiracion", "circulacion",
        "sistema-nervioso", "cerebro", "corazon", "pulmon", "higado", "riñon", "estomago", "intestino", "musculo", "hueso",
        "esqueleto", "piel", "sangre", "linfa", "hormona", "anticuerpo", "virus", "bacteria", "hongo", "parasito", "simbiosis"
    ]
}

# Generate 1000 concepts by mixing words and adding context
knowledge = []

# Add single words as nodes
for cat in categories:
    knowledge.extend(categories[cat])

# Add phrases/connections
prefixes = ["analizando el concepto de", "conectando neuronas sobre", "aprendiendo sobre", "procesando datos de", "expandiendo red de", "vinculando", "explorando"]
suffixes = ["en el sistema", "de forma recursiva", "con alta precision", "en tiempo real", "mediante algoritmos", "en la matriz", "de forma infinita"]

for i in range(500):
    cat = list(categories.keys())[i % len(categories)]
    word1 = categories[cat][(i * 7) % len(categories[cat])]
    word2 = categories[cat][(i * 13) % len(categories[cat])]
    if word1 != word2:
        phrase = f"{word1} {word2}"
        knowledge.append(phrase)
        
        # Add structured phrases
        if i % 2 == 0:
            knowledge.append(f"{categories['tech'][i % len(categories['tech'])]} es fundamental para {categories['tech'][(i+1) % len(categories['tech'])]}")
        if i % 3 == 0:
            knowledge.append(f"la relacion entre {categories['science'][i % len(categories['science'])]} y {categories['space'][i % len(categories['space'])]} es fascinante")

# Ensure at least 1000 items
while len(knowledge) < 1200:
    cat = list(categories.keys())[len(knowledge) % len(categories)]
    w1 = categories[cat][len(knowledge) % len(categories[cat])]
    w2 = categories[cat][(len(knowledge) + 5) % len(categories[cat])]
    knowledge.append(f"{w1} {w2}")

with open("data/initial_knowledge.json", "w", encoding="utf-8") as f:
    json.dump(knowledge, f, ensure_ascii=False, indent=2)

print(f"Generated {len(knowledge)} items of knowledge.")
