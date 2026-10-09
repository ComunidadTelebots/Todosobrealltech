Un montaje vacío sobre /app oculta start.sh y provoca reinicios permanentes en los canales de pruebas. Añade un arranque protegido fuera de /app que exige activación explícita y valida archivos y sintaxis antes de ejecutar el bot.

Incluye una entrada de compatibilidad que deshabilita el autoscaler antiguo basado solo en CPU, evitando recrear receptores con asignaciones de bot duplicadas. Documenta perfiles manuales, on-failure:5, imágenes inmutables y montajes exclusivos de datos. No añade todavía escalado distribuido ni alertas nuevas en la web.

Validación: cuatro pruebas unitarias; cuarentena y preflight comprobados en tres imágenes sin red ni credenciales. Configuraciones de infraestructura y respaldos privados quedan fuera de este PR.
