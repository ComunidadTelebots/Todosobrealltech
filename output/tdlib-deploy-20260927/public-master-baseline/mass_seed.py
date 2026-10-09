import random
import time
from moon_multibot import ia_nativa, db, add_web_log

def run_mass_seed():
    print("--- Iniciando Operacion Infiltracion de 100k ---")
    add_web_log("IA", "Iniciando Inyección Masiva de 100,000 palabras...")
    
    subjects = ["El sistema", "La red", "El kernel", "La IA", "El cyborg", "La ciudad neón", "El protocolo", "La base de datos", "El hacker", "La luna", "El código", "El circuito", "El sensor", "La matriz", "El núcleo", "El flujo", "La señal", "El nodo", "El enlace", "El bit"]
    verbs = ["ha detectado", "procesa", "evoluciona", "encripta", "descifra", "optimiza", "bloquea", "inyecta", "sincroniza", "analiza", "modula", "transfiere", "mapea", "escanea", "purga", "alimenta", "sustenta", "conecta", "genera", "emula"]
    objects = ["los datos", "la secuencia", "el código fuente", "el enlace neuronal", "el flujo de información", "la señal", "el núcleo", "la memoria", "el buffer", "el registro", "la trama", "el paquete", "la frecuencia", "el espectro", "la clave", "el token"]
    adjectives = ["críticos", "encriptados", "sintéticos", "cuánticos", "neuronales", "binarios", "persistentes", "volátiles", "estables", "corruptos", "puros", "híbridos", "avanzados", "nativos", "maestros", "oscuros", "brillantes"]
    
    total_words = 0
    batch_size = 5000
    batches = 20 # 20 * 5000 = 100,000
    
    for i in range(batches):
        chunk = []
        for _ in range(batch_size // 4): # Cada frase tiene aprox 4-5 palabras
            s = f"{random.choice(subjects)} {random.choice(verbs)} {random.choice(objects)} {random.choice(adjectives)}."
            chunk.append(s)
        
        full_text = " ".join(chunk)
        ia_nativa.learn(full_text, source="Protocolo Semilla 100K")
        total_words += batch_size
        print(f"Lote {i+1}/{batches} completado. Total: {total_words} palabras.")
        add_web_log("IA", f"Lote {i+1} de la inyección completado. Progreso: {total_words}/100,000")
        time.sleep(0.5)

    add_web_log("SUCCESS", "Infiltracion de 100,000 palabras completada con exito.")
    print("--- Operacion finalizada ---")
    print(f"Estadisticas finales: {ia_nativa.get_stats()}")

if __name__ == "__main__":
    run_mass_seed()
