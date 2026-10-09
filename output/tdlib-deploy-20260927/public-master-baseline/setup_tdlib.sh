#!/bin/bash
# Detecta libtdjson.so local y lo prepara para el build de Docker.
# Ejecutar antes de: docker compose up -d --build
#
# Rutas buscadas (en orden de prioridad):
#   1. /usr/local/lib/libtdjson.so          (instalación de sistema)
#   2. ~/td/example/python/tdlib/lib/       (build estándar TDLib)
#   3. ~/td/build/                          (build alternativo)
#   4. /tmp/td/example/python/tdlib/lib/    (build temporal / CI)
#   5. /opt/td/lib/                         (build en /opt)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$SCRIPT_DIR/libtdjson.so"

SEARCH_PATHS=(
    "/usr/local/lib/libtdjson.so"
    "$HOME/td/example/python/tdlib/lib/libtdjson.so"
    "$HOME/td/build/libtdjson.so"
    "/tmp/td/example/python/tdlib/lib/libtdjson.so"
    "/opt/td/lib/libtdjson.so"
)

for path in "${SEARCH_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "[TDLib] Encontrado: $path"
        cp "$path" "$DEST"
        echo "[TDLib] Copiado a contexto de build → el Dockerfile usará este binario."
        exit 0
    fi
done

echo "[TDLib] No se encontró libtdjson.so local en rutas conocidas."
echo "[TDLib] El Dockerfile descargará el binario desde GitHub Release."
exit 0
