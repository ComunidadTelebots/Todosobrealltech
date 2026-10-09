FROM python:3.12-slim

WORKDIR /app

ENV PYTHONIOENCODING=utf-8
ENV LANG=C.UTF-8

# Dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc git curl libssl3 zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Usa libtdjson.so local si fue copiado al contexto de build (setup_tdlib.sh),
# de lo contrario descarga el binario pre-compilado desde el GitHub Release.
ARG TDLIB_SO_URL=https://github.com/ComunidadTelebots/moon-multibot/releases/download/tdlib-prebuilt/libtdjson.so
RUN if [ -f libtdjson.so ]; then \
        echo "[TDLib] Usando binario local"; \
        mv libtdjson.so /usr/local/lib/libtdjson.so; \
    else \
        echo "[TDLib] Descargando desde GitHub Release"; \
        curl -fL "${TDLIB_SO_URL}" -o /usr/local/lib/libtdjson.so; \
    fi && ldconfig

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["bash", "start.sh"]
