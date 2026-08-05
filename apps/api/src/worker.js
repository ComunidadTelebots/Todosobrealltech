import 'dotenv/config';
import logger from './utils/logger.js';
import { startTelegramSync } from './utils/telegramSync.js';
import { startOfficialTelegramViewsSync, startRssAutoPublisher, startRssWorkerControl, startTelegramLinkBackfill } from './utils/rssAutoPublisher.js';
import { refreshPayload } from './routes/mtproto-proxies.js';

const PROXY_CRAWL_MS = Number(process.env.MTPROTO_PAYLOAD_TTL_MS || 300_000); // 5 min

// Worker de jobs en segundo plano. Se separa del proceso HTTP (main.js) para que
// las conexiones salientes de estos jobs (fetch de RSS/Telegram) no compartan el
// pool de undici del api y no estrangulen las validaciones de /stats.

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', () => {
	logger.info('Worker interrumpido');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Worker: SIGTERM recibido');
	await new Promise((resolve) => setTimeout(resolve, 3000));
	logger.info('Worker: saliendo');
	process.exit();
});

(async () => {
	logger.info('🛠️  Worker de jobs iniciado (telegramSync, backfill, rssAutoPublisher, crawl proxies)');
	startTelegramSync();
	startTelegramLinkBackfill(); // en segundo plano: no bloquea el arranque
	startOfficialTelegramViewsSync();
	startRssAutoPublisher();
	startRssWorkerControl();

	// Crawl de proxies MTProto (@ProxyMTProto): antes ahogaba el pool del api con
	// ~2244 TCP-checks. Ahora corre aquí y persiste a /data; el api solo sirve caché.
	const crawl = () => refreshPayload().catch((err) => logger.error(`[proxyCrawl] ${err.message}`));
	crawl();
	setInterval(crawl, PROXY_CRAWL_MS);
})();
