El mapa existente permite seleccionar Telegram, visitas de la web o visitas del Hub. Telegram conserva su histórico lingüístico y añade filtros por chat privado, grupo/supergrupo y canal. El idioma no se presenta como ubicación física.

La recogida de vistas respeta la preferencia explícita de analítica y DNT/GPC, agrupa rutas y no almacena IP ni identificadores de visitante. Incluye ubicación aproximada, idioma, periodos, rankings y un límite visible de 10.000 eventos analizados. Las consultas administrativas comparten una caché de cinco segundos después de verificar permisos en cada petición.

Los gráficos muestran vistas reales por día, por hora y durante los últimos cinco minutos de la lectura. Se retiran del panel los porcentajes, ingresos, actividad y exportaciones simuladas. Los totales del registro se distinguen de visitantes únicos y usuarios activos. El mapa y los gráficos de la web comparten periodo.

Validación: CI completa aprobada, ESLint y compilación web correctos; siete pruebas focalizadas de agregación/caché aprobadas. Migración verificada contra PocketBase 0.31.0 y 0.38.0 en bases locales temporales: persistencia, rechazo de eventos duplicados y bloqueo de lectura/escritura anónima. No se han insertado visitas de prueba en producción.

El despliegue requiere la nueva colección PocketBase, API y web, además de proxies de confianza y CORS del Hub. La recogida nueva todavía no está activada en producción. Instrucciones en docs/WEB_VISITOR_ANALYTICS.md.
