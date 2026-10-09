import os

from dotenv import load_dotenv

load_dotenv()

APP_VERSION = "v16.85.0-alpha"
BOT_STORE_PATH = "data/bots.json"

# --- Web / Auth ---
WEB_PASSWORD = os.getenv("WEB_PASSWORD", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
MOON_ENV = os.getenv("MOON_ENV", "prod").lower()
MOON_ROLE = os.getenv("MOON_ROLE", "master").lower()
MASTER_ID = int(os.getenv("MASTER_ID", 0))

# Bot que sirve la Mini App del hub. El initData SOLO se valida contra este
# bot (no contra cualquier bot activo). Case-insensitive.
HUB_BOT_USERNAME = os.getenv("HUB_BOT_USERNAME", "cintiabot")

# --- Flask server ---
FLASK_PORT = int(os.getenv("FLASK_PORT", "5001" if os.getenv("MOON_ENV", "prod").lower() == "dev" else "5000"))
FLASK_THREADS = int(os.getenv("FLASK_THREADS", "6"))

# --- IA & LLM ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
USE_EXTERNAL_LLM = os.getenv("USE_EXTERNAL_LLM", "false").lower() == "true"
HYBRID_PERCENTAGE = int(os.getenv("HYBRID_PERCENTAGE", "50"))
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2:0.5b")
DEEP_DREAM_MODE = os.getenv("DEEP_DREAM_MODE", "false").lower() == "true"

# --- Moderación ---
CAS_CACHE_TTL = int(os.getenv("CAS_CACHE_TTL", "1800"))

# --- TDLib (MTProto user client) ---
TDLIB_API_ID = os.getenv("TDLIB_API_ID", "")
TDLIB_API_HASH = os.getenv("TDLIB_API_HASH", "")
TDLIB_PATH = os.getenv("TDLIB_PATH", "/usr/local/lib/libtdjson.so")

# --- Proxy / VPS ---
PROXY_LOCAL_PORTS = os.getenv("PROXY_LOCAL_PORTS") or os.getenv("PROXY_PORT", "")
PROXY_LOCAL_SECRETS = os.getenv("PROXY_LOCAL_SECRETS") or os.getenv("PROXY_SECRET", "")
PROXY_VPS_HOST = os.getenv("PROXY_VPS_HOST", "")
PROXY_VPS_USER = os.getenv("PROXY_VPS_USER", "root")
PROXY_VPS_PORT = int(os.getenv("PROXY_VPS_PORT", "22"))
PROXY_VPS_KEY_PATH = os.getenv("PROXY_VPS_KEY_PATH", "")
PROXY_VPS_PASSWORD = os.getenv("PROXY_VPS_PASSWORD", "")
PROXY_VPS_KEY_PASSPHRASE = os.getenv("PROXY_VPS_KEY_PASSPHRASE", "")
PROXY_VPS_PORTS = os.getenv("PROXY_VPS_PORTS", "8443,8444,8445,8446")

# --- DB ---
DB_PATH = "data/moon_dev.db" if MOON_ENV == "dev" else "data/moon_database.db"

# --- PocketBase (directorio de canales) ---
POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://todosobrealltech-pocketbase-1:8090")
PB_SUPERUSER_EMAIL = os.getenv("PB_SUPERUSER_EMAIL", "")
PB_SUPERUSER_PASSWORD = os.getenv("PB_SUPERUSER_PASSWORD", "")
