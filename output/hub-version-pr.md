Añade un selector de interfaces del Hub visible solo tras verificar el rol master con Telegram. Muestra la versión arriba a la derecha, separa la estable implementada de las ramas/etiquetas Git y permite regresar a estable conservando el contexto de Telegram.

El exportador fija commits, valida scripts y recursos y retira el selector layouts anidado de las ramas afectadas. El cambio de interfaz no cambia el backend ni los permisos: algunas funciones de desarrollo requieren un motor más reciente. No se incluyen configuraciones privadas ni copias de datos.

Validación: exportación de 13 ramas y 4 etiquetas con Hub, validación de sintaxis y recursos, dos pruebas del selector (rol master y navegación), 18 rutas publicadas verificadas incluyendo la estable. Pendiente validación interactiva con una sesión master real dentro de Telegram.
