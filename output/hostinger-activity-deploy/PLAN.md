# Despliegue del mapa unificado de actividad

Preparación local; producción aún no modificada.

## Destino y alcance
Cuenta Hostinger conectada, VPS 1557215, srv1557215.hstgr.cloud (72.60.186.130).
Proyectos /root/Todosobrealltech y /root/moonbot.

Web: rama local codex/hostinger-activity-deploy, commit d1a4236, basada en la versión desplegada 3ab4462817c9b1a7154d307a4a899a9ead1833e0. Actualizar únicamente web, api y PocketBase para añadir el mapa Telegram/web/Hub, filtros y colección web_pageviews.
Moonbot: cuatro archivos adaptados a la versión desplegada b426118109e259ddee711aa7dad60ad37032f200. manifest.json exige hashes de origen exactos y comprueba el resultado. Añade observaciones por privado/grupo/canal, endpoint del mapa y consentimiento del Hub.

## Secuencia y condiciones
1. Revalidar HEAD, hashes, contenedores, archivos Compose y cambios locales del servidor. Abortarlo si no coinciden; conservar llms.txt modificado.
2. Crear copia privada del código, Compose y configuración; registrar imágenes actuales. Hacer copia consistente del volumen PocketBase durante una parada breve. Copiar también los datos Moonbot necesarios para revertir el cambio. No exportar secretos fuera del VPS.
3. Construir imágenes identificadas por versión desde el código preparado. Mantener PocketBase 0.31.0 y sus hooks/migraciones actuales, añadiendo solamente 1790100000_create_web_pageviews.js. Revisar migraciones pendientes antes de arrancar: abortar si aparecen otras.
4. Conservar orígenes CORS actuales y añadir https://cintiabot.todosobreall.tech. Configurar confianza únicamente en los proxies verificados: volver a obtener las IP de Nginx y Traefik después de recrear web, antes de recrear API. No confiar globalmente en X-Forwarded-For. Documentar su actualización cuando cambien las IP.
5. Aplicar parche Moonbot solo si coinciden todos los hashes. Coordinar su autoactualizador para que no sobrescriba el parche. Reiniciar únicamente el proceso principal.
6. Arrancar PocketBase y API, comprobar salud y migración, publicar web y verificar el endpoint autenticado, el rechazo de acceso anónimo y la recepción de observaciones. No introducir visitas ficticias en las estadísticas de producción.
7. Comprobar Hub: ninguna visita enviada antes del consentimiento, respeto DNT/GPC y separación source=hub. Verificar ubicación real con la cadena de proxies; no inventar ubicación si no está disponible.

## Reversión
Conservar las imágenes anteriores con etiquetas locales y el código/configuración previo. Si falla salud o arranque, restaurar esos archivos e imágenes y reiniciar solo los servicios afectados. La colección nueva puede permanecer sin uso; no borrar datos analíticos como parte de una reversión de código. Restaurar la copia PocketBase únicamente si fuera necesario y preservando previamente cualquier escritura posterior.

## Validación local realizada
- Instalación npm ci con lockfile de producción.
- Compilación Vite correcta.
- API: 177 pruebas aprobadas. PocketBase no disponible durante estas pruebas; no constituyen una validación de persistencia real.
- Parche Moonbot: hashes correctos, sintaxis Python válida y tres scripts inline del Hub válidos.
- Pendiente: construcción Linux/Docker, migración PocketBase y comprobaciones reales tras desplegar.

## Incidencia preexistente
Alfa, beta, RC y prealfa usan montajes /app sin start.sh. No activarlos como parte de este despliegue: requieren revisar sus fuentes y tokens para evitar procesos duplicados. El principal está funcionando.

## Límites del mapa
Telegram registra observaciones nuevas por tipo de chat; el despliegue antiguo no contiene el endpoint ni un historial recuperable garantizado. Web y Hub cuentan páginas vistas con consentimiento, no personas únicas. La geolocalización es aproximada y corresponde a web/Hub, no a ubicaciones reales inferidas de idiomas Telegram.
