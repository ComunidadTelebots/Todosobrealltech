import 'dotenv/config';
import logger from './utils/logger.js';
import { startTelegramSync } from './utils/telegramSync.js';
import { startRssAutoPublisher, backfillTelegramLinks } from './utils/rssAutoPublisher.js';

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
	logger.info('🛠️  Worker de jobs iniciado (telegramSync, backfill, rssAutoPublisher)');
	startTelegramSync();
	await backfillTelegramLinks();
	startRssAutoPublisher();
})();
