La instrumentación reconstruía ventanas de estadísticas en cada evento y el dashboard seguía consultando secciones invisibles. Limita la limpieza a cada segundo, evita solicitudes de estado solapadas y añade tiempo máximo y reintentos progresivos. Las consultas periódicas de IA y moderación se restringen a su pestaña visible.

Incluye CI para dev y pruebas del polling. Conserva los contadores, el transporte Telegram y los plugins; no introduce una cola distribuida.

Validación local: 7 pruebas de telemetría, incluida concurrencia de 10.000 eventos; 2 pruebas de polling; sintaxis JavaScript. No incluye los cambios pendientes del mapa.
