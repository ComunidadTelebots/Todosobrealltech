import time
from moon_multibot import ia_nativa, db, add_web_log

def run_quijote_seed():
    print("--- Iniciando Inyeccion de Literatura Maestra (Don Quijote) ---")
    add_web_log("IA", "Iniciando Inyeccion de Literatura Maestra: Don Quijote de la Mancha...")
    
    file_path = r"C:\Users\adria\.gemini\antigravity\brain\dd913efe-bdf7-42ef-9271-72d255a97e5b\.system_generated\steps\4627\content.md"
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Saltamos el encabezado de Gutenberg (aprox 35 lineas)
        actual_text = lines[35:5000] # Primeras 5000 lineas son suficientes para miles de neuronas
        
        full_corpus = "".join(actual_text)
        print(f"Procesando {len(full_corpus)} caracteres de literatura pura...")
        
        # Aprendizaje en bloques de 50 lineas para ver progreso
        step = 50
        for i in range(0, len(actual_text), step):
            block = "".join(actual_text[i:i+step])
            ia_nativa.learn(block, source="Biblioteca Clasica: Cervantes")
            if i % 500 == 0:
                stats = ia_nativa.get_stats()
                print(f"Progreso: {i}/{len(actual_text)} lineas. Neuronas actuales: {stats['words']}")
                add_web_log("IA", f"Procesadas {i} lineas del Quijote. Neuronas: {stats['words']}")
        
        add_web_log("SUCCESS", "Inyeccion literaria completada. La IA ha absorbido el alma de Cervantes.")
        print("--- Operacion finalizada ---")
        print(f"Estadisticas finales: {ia_nativa.get_stats()}")
        
    except Exception as e:
        print(f"Error en la inyeccion: {e}")
        add_web_log("ERROR", f"Fallo en la inyeccion literaria: {e}")

if __name__ == "__main__":
    run_quijote_seed()
