"""
Plugin para gestionar configuraciÃ³n de IA en modo Inline y Guest
Comandos:
- /ia_stats: Ver estadÃ­sticas de uso de IA
- /ia_set_default <ollama|gemini|hybrid>: Establecer IA por defecto
- /ia_info: InformaciÃ³n del sistema IA actual
"""

def handle_command(bot, cid, uid, text, rank):
    """Maneja comandos de configuraciÃ³n de IA para inline y guest."""
    
    t_lower = text.lower()
    
    # Comando: /ia_stats - Ver estadÃ­sticas de IA
    if t_lower.startswith("/ia_stats"):
        if str(rank).lower() != "master":
            bot.send_msg(cid, "âŒ Solo master puede ver estadÃ­sticas")
            return True
        
        try:
            stats = bot.ia_nativa.get_ai_statistics()
            
            summary = stats["summary"]
            distribution = stats["ai_distribution"]
            results = stats["results"]
            
            message = (
                f"ðŸ“Š *EstadÃ­sticas de IA (Inline + Guest)*\n\n"
                f"*Resumen General:*\n"
                f"â€¢ Total de solicitudes: {summary['total_requests']}\n"
                f"â€¢ Inline: {summary['inline_requests']}\n"
                f"â€¢ Guest: {summary['guest_requests']}\n"
                f"â€¢ Tasa Ã©xito: {summary['success_rate_percent']}%\n"
                f"â€¢ Tiempo promedio: {summary['avg_response_time_ms']}ms\n\n"
                f"*DistribuciÃ³n de IA:*\n"
                f"â€¢ Ollama: {distribution['ollama']}\n"
                f"â€¢ Gemini: {distribution['gemini']}\n"
                f"â€¢ HÃ­brida: {distribution['hybrid']}\n\n"
                f"*Resultados:*\n"
                f"â€¢ âœ… Exitosas: {results['success']}\n"
                f"â€¢ âŒ Fallidas: {results['failed']}\n"
            )
            
            # Mostrar Ãºltimos eventos
            recent = stats.get("recent_events", [])
            if recent:
                message += f"\n*Ãšltimos 5 eventos:*\n"
                for event in recent[-5:]:
                    time_str = event["time"]
                    mode = "ðŸ“±" if event["mode"] == "inline" else "ðŸ‘¤"
                    ai = event["ai_used"]
                    status = "âœ…" if event["success"] else "âŒ"
                    message += f"{status} {mode} [{ai}] {time_str}\n"
            
            bot.send_msg(cid, message, parse_mode="Markdown")
        except Exception as e:
            bot.send_msg(cid, f"âŒ Error: {str(e)}")
        
        return True
    
    # Comando: /ia_set_default - Cambiar IA por defecto
    elif t_lower.startswith("/ia_set_default"):
        if str(rank).lower() != "master":
            bot.send_msg(cid, "âŒ Solo master puede cambiar configuraciÃ³n")
            return True
        
        parts = text.split()
        if len(parts) < 2:
            bot.send_msg(cid, 
                "âŒ Uso: /ia_set_default <ollama|gemini|hybrid>\n"
                "Ejemplo: /ia_set_default hybrid"
            )
            return True
        
        ai_mode = parts[1].lower()
        if ai_mode not in ["ollama", "gemini", "hybrid"]:
            bot.send_msg(cid, 
                "âŒ IA vÃ¡lidas: ollama, gemini, hybrid\n"
                "Ejemplo: /ia_set_default hybrid"
            )
            return True
        
        try:
            settings = bot.db.get("GLOBAL_SETTINGS", {})
            old_mode = settings.get("default_ai_mode", "hybrid")
            settings["default_ai_mode"] = ai_mode
            bot.db.set("GLOBAL_SETTINGS", settings)
            
            from moon_multibot import add_web_log
            add_web_log("INFO", f"IA por defecto cambiada de {old_mode} a {ai_mode}")
            
            message = (
                f"âœ… *IA por defecto actualizada*\n\n"
                f"â€¢ Anterior: {old_mode}\n"
                f"â€¢ Nueva: {ai_mode}\n\n"
                f"Los nuevos queries inline y guest usarÃ¡n *{ai_mode}*"
            )
            bot.send_msg(cid, message, parse_mode="Markdown")
        except Exception as e:
            bot.send_msg(cid, f"âŒ Error: {str(e)}")
        
        return True
    
    # Comando: /ia_info - InformaciÃ³n del sistema IA
    elif t_lower.startswith("/ia_info"):
        if str(rank).lower() not in ["admin", "master"]:
            bot.send_msg(cid, "âŒ Solo admin/master pueden ver esta informaciÃ³n")
            return True
        
        try:
            settings = bot.db.get("GLOBAL_SETTINGS", {})
            default_ai = settings.get("default_ai_mode", "hybrid")
            
            # InformaciÃ³n del sistema
            import os
            from core.config import GEMINI_API_KEY, OLLAMA_MODEL, USE_EXTERNAL_LLM
            
            gemini_status = "âœ… Configurado" if GEMINI_API_KEY else "âŒ No configurado"
            ollama_status = f"âœ… {OLLAMA_MODEL}"
            external_llm_status = "âœ… Habilitado" if USE_EXTERNAL_LLM else "âŒ Deshabilitado"
            
            message = (
                f"ðŸ§  *ConfiguraciÃ³n de IA del Sistema*\n\n"
                f"*IA por Defecto:*\n"
                f"â€¢ {default_ai.upper()}\n\n"
                f"*Modelos Disponibles:*\n"
                f"â€¢ Ollama: {ollama_status}\n"
                f"â€¢ Gemini: {gemini_status}\n"
                f"â€¢ LLM Externo: {external_llm_status}\n\n"
                f"*Modo de OperaciÃ³n:*\n"
                f"â€¢ El sistema usa la IA seleccionada por defecto\n"
                f"â€¢ Los usuarios pueden usar /ollama, /gemini o /hybrid en sus queries\n"
                f"â€¢ Las respuestas son registradas para estadÃ­sticas\n"
            )
            
            bot.send_msg(cid, message, parse_mode="Markdown")
        except Exception as e:
            bot.send_msg(cid, f"âŒ Error: {str(e)}")
        
        return True
    
    return False

