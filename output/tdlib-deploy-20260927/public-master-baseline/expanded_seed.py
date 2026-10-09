import time
from moon_multibot import ia_nativa, db, add_web_log

def run_expanded_seed():
    print("--- Iniciando Expansion de Conocimiento Multi-Fuente ---")
    add_web_log("IA", "Iniciando Expansion Multi-Fuente: Literatura Clasica y Lexico Avanzado...")
    
    # Fuentes descargadas
    sources = [
        {"path": r"C:\Users\adria\.gemini\antigravity\brain\dd913efe-bdf7-42ef-9271-72d255a97e5b\.system_generated\steps\4690\content.md", "name": "La Regenta (Clarin)"},
        {"path": r"C:\Users\adria\.gemini\antigravity\brain\dd913efe-bdf7-42ef-9271-72d255a97e5b\.system_generated\steps\4693\content.md", "name": "Fortunata y Jacinta (Galdos)"}
    ]
    
    cyber_terms = """
    Arcología: Masiva arquitectura autosuficiente.
    Braindance: Memorias y emociones sensoriales grabadas.
    Ciberespacio: Realidad virtual interconectada neuronalmente.
    Ciberware: Implantes robóticos y mejoras biológicas.
    Megacorporación: Poder político superior a los gobiernos.
    Netrunner: Hacker con interfaz neuronal directa.
    Black ICE: Programas de seguridad defensivos letales.
    Ciberpsicosis: Trastorno mental por exceso de implantes.
    """
    
    print("Inyectando Terminos Cyberpunk Avanzados...")
    ia_nativa.learn(cyber_terms, source="Glosario Cyberpunk 2.0")
    
    for src in sources:
        print(f"Abriendo {src['name']}...")
        try:
            with open(src['path'], "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            # Tomamos 5000 lineas de cada libro para no saturar pero dar variedad
            actual_text = lines[100:5100]
            
            step = 100
            for i in range(0, len(actual_text), step):
                block = "".join(actual_text[i:i+step])
                ia_nativa.learn(block, source=src['name'])
                if i % 1000 == 0:
                    stats = ia_nativa.get_stats()
                    print(f"Progreso {src['name']}: {i}/5000. Neuronas: {stats['words']}")
                    add_web_log("IA", f"Absorbiendo {src['name']}: {i}/5000 lineas. Neuronas: {stats['words']}")
            
        except Exception as e:
            print(f"Error procesando {src['name']}: {e}")

    add_web_log("SUCCESS", "Expansion Multi-Fuente completada. La IA ahora posee una base cultural inmensa.")
    print("--- Operacion finalizada ---")
    print(f"Estadisticas finales: {ia_nativa.get_stats()}")

if __name__ == "__main__":
    run_expanded_seed()
