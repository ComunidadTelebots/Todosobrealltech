# Integración de PR de desarrollo · 2026-09-21

Destino: `Todosobrealltech/develop` y `moon-multibot/alpha`. Las ramas de producción conservan su flujo de promoción separado. Dependabot y CI utilizan estas ramas de desarrollo para las siguientes actualizaciones.

## Todosobrealltech

La PR #41 incorpora las PR #9, #19, #20, #23–#32, #38 y #40 mediante merges que conservan su historial.

- #9 y #19 se resuelven contra el estado actual: se conserva Astro en las aplicaciones migradas, React Router 7.18.2 y PostCSS 8.5.25. No se reintroducen Vite ni sus plugins en aplicaciones Astro ni se baja Vite de la web a 6.4.3. Canales y Noticiasweb3 pasan a Vite 8 con el plugin React 6.
- Se conserva ESLint 9: la versión publicada de `eslint-plugin-import` declara compatibilidad hasta ESLint 9. El salto a ESLint 10 de #9 no se aplica. Morgan, concurrently y geoip-lite ya estaban actualizados.
- #29 requería actualizar también React y sus tipos, no solo React DOM. Se alinean todas las aplicaciones con React 19 y se sustituye `react-helmet` por `react-helmet-async` 3, compatible con React 19. Se elimina así la segunda copia de React 18 que rompía la renderización de Astro. Se conserva la API de los títulos y metadatos con `HelmetProvider`.
- Se integran las actualizaciones de Radix, Zod, Axios, Babel, js-yaml, postcss-selector-parser y la acción SSH. Se regeneran el lockfile del monorepo y los cinco lockfiles independientes que utilizan los contenedores.

Validación local: instalación reproducible inicial, lint, 194 pruebas API, validación del roadmap, compilación de las ocho aplicaciones y revisión visual del panel, desplegable Radix y título de la portada. CI valida de nuevo la instalación definitiva y las compilaciones, también usando los lockfiles independientes.

## Moonbot

La PR #9 integra las PR #2–#6 y #8 en `alpha`. Conserva la versión de desarrollo `v18.23.17-alpha.3`, con telemetría, conexiones reutilizables y descubrimiento CDN opcional.

La rama original de #8 (`d724a9a`) incorporaba 1.575 archivos de master y un workflow que apuntaba a un `Dockerfile.tdlib` inexistente. Se adaptó su intención a alpha: Buildx 4 compila el Dockerfile real en CI sin publicar imágenes.

Python 3.14 se valida junto a 3.12. La comprobación de carga de TDLib detectó que faltaban `libc++1` y `libc++abi1` en la imagen; se añaden ambas. CI comprueba las pruebas completas, Ruff, el JavaScript del Hub, la compilación Docker y la carga de dependencias Python y `libtdjson.so`.

Esta integración no despliega producción ni valida con credenciales reales el descubrimiento CDN; este último requiere configurar API ID/hash en Moonbot.
