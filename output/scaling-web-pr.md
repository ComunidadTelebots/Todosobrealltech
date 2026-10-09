El panel generaba una recogida completa por visitante. Comparte las lecturas durante dos segundos por proceso, agrupa solicitudes concurrentes y descarta resultados anteriores a una operación de control. La autorización permanece por petición.

También consulta telemetría independiente en paralelo, reduce reintentos del panel ante fallos y añade compresión y caché solo a assets versionados. No cambia el despliegue ni activa réplicas.

Validación: suite API de 226 pruebas; pruebas de 1.000 lectores concurrentes e invalidación durante operaciones; ESLint y build Vite; nginx -t con la configuración candidata. Caché local al proceso, sin coordinación entre réplicas. No incluye el mapa de actividad pendiente.
