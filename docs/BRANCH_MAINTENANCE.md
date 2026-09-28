# Revisión de ramas — 28 septiembre 2026

Inventario de todas las ramas remotas: historial, diferencias de archivos y últimos commits exclusivos. No certifica funcionamiento ni madurez por el nombre de la rama.

## Política acordada

No crear ramas nuevas por cada tarea. Reutilizar las ramas de versión existentes. Si el remoto avanza, traer sus cambios y resolver la divergencia sin force-push. No eliminar trabajo exclusivo. No convertir automáticamente una rama en estable por estar desplegada.

| Repositorio | Estable | Integración | Canales conservados |
|---|---|---|---|
| Todosobrealltech | main | develop | alpha, beta, rc |
| moon-multibot | master | dev | prealfa, alfa, alpha, beta, rc |

Moonbot tiene alfa y alpha divergentes: no son alias y no se renombran ni fusionan a ciegas. La web no tiene prealfa remota; el selector visual no crea un canal Git.

## Ramas revisadas

### web

Comparación con origin/develop. Faltan = commits de integración ausentes. Propios = commits exclusivos, no necesariamente parches exclusivos.

| Rama | SHA | Faltan | Propios |
|---|---|---:|---:|
| agent/improve-noticiasweb3-hub | b90ebb12 | 66 | 2 |
| alpha | df7cf8f6 | 17 | 0 |
| beta | 6c617bed | 145 | 0 |
| codex-adsense-sitemaps | 742f6db9 | 438 | 0 |
| codex/activity-deployment-fixes | d12d5529 | 5 | 0 |
| codex/bot-conversation-explorer | bbad6639 | 2 | 3 |
| codex/dashboard-worker-link | 250706c8 | 2 | 1 |
| codex/gamergitbug-projects | f403fcdd | 14 | 2 |
| codex/moonbot-environment-access | 1266c52e | 15 | 0 |
| codex/moonbot-operations | 86241094 | 26 | 0 |
| codex/scaling-components | 701ade0b | 13 | 0 |
| codex/stable-panels-tdlib-review | 3c1c930c | 2 | 0 |
| codex/unified-activity-map | 9b7ee6c2 | 8 | 0 |
| codex/web-release-selector | 45e293cf | 2 | 19 |
| dependabot/npm_and_yarn/eslint-10.11.0 | 0e02c068 | 66 | 1 |
| dependabot/npm_and_yarn/eslint/js-10.0.1 | 87742718 | 66 | 1 |
| dependabot/npm_and_yarn/multi-de36fa8f59 | fcf7226e | 66 | 1 |
| dependabot/npm_and_yarn/radix-ui/react-aspect-ratio-1.1.15 | 88d2490a | 66 | 1 |
| dependabot/npm_and_yarn/radix-ui/react-checkbox-1.3.11 | fa5dc10e | 66 | 1 |
| dependabot/npm_and_yarn/radix-ui/react-progress-1.1.16 | a68436d5 | 66 | 1 |
| dependabot/npm_and_yarn/radix-ui/react-tooltip-1.2.16 | a4085fbb | 66 | 1 |
| dependabot/npm_and_yarn/react-router-dom-7.18.4 | 9823df81 | 66 | 1 |
| dependabot/npm_and_yarn/types/node-26.6.2 | 87bb6141 | 66 | 1 |
| dependabot/npm_and_yarn/vitejs/plugin-react-6.1.1 | a23cf19c | 66 | 1 |
| develop | 984e7d6b | 0 | 0 |
| main | 4dc8eee1 | 66 | 0 |
| master | b90ebb12 | 66 | 2 |
| rc | 6c617bed | 145 | 0 |
| staging | cf025fc9 | 150 | 0 |

### moonbot

Comparación con origin/dev. Faltan = commits de integración ausentes. Propios = commits exclusivos, no necesariamente parches exclusivos.

| Rama | SHA | Faltan | Propios |
|---|---|---:|---:|
| agent/improve-noticiasweb3-hub | dda8aabe | 46 | 187 |
| alfa | 899d8059 | 46 | 288 |
| alpha | 0c3c46c2 | 24 | 0 |
| beta | 5604906a | 46 | 289 |
| codex/chat-message-ranking | c39aecaf | 20 | 0 |
| codex/hub-explicit-visitor-consent | 153f4b60 | 8 | 0 |
| codex/hub-version-switcher | d7336c22 | 13 | 0 |
| codex/managed-support-managers | 6f0109c5 | 3 | 0 |
| codex/operations-telemetry | 356447b9 | 29 | 0 |
| codex/release-startup-guard | fa00941d | 15 | 0 |
| codex/scaling-monitoring | 07edd766 | 17 | 0 |
| codex/stable-bot-conversations | a36f9bc4 | 266 | 12 |
| codex/stable-bot-governor | fc16e918 | 266 | 21 |
| codex/stable-panels-tdlib-review | 048b5659 | 4 | 0 |
| codex/stable-tdlib-gateway | e66377aa | 266 | 9 |
| codex/unified-activity-map | 5f8223a7 | 10 | 0 |
| dev | f5f61e4d | 0 | 0 |
| master | 22d2b1f6 | 266 | 7 |
| prealfa | cae50956 | 46 | 295 |
| rc | a0dcfdad | 46 | 288 |

## Aplicado y pendiente

- GamerGitBug: Tot Roba, Morla y buscador integrados en develop mediante d1323e1. Compilación comprobada. La versión pública ya contiene ese mismo parche.
- La línea codex/web-release-selector contiene RSS, inventario de hijos, diagrama y mejoras operativas todavía fuera de develop; necesita integración con pruebas de API y web.
- La línea codex/stable-bot-governor contiene cola, RSS y preparación de hijos fuera de master/dev. Requiere integrar adaptadores y comprobar compatibilidad entre las líneas históricas antes de promover.
- Las ramas técnicas ya contenidas pueden retirarse después de comprobar PRs y worktrees; las que tienen trabajo exclusivo se conservan hasta integrarlo.
- Beta/RC no se actualizan por simple igualdad de etiquetas. No se ha fusionado código experimental en estable ni modificado producción durante esta revisión.
- Las ramas dependabot se tratan como propuestas de actualización, no como canales de desarrollo.
