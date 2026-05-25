import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/index.js';
import logger from './utils/logger.js';
import { startTelegramSync } from './utils/telegramSync.js';
import { startRssAutoPublisher, backfillTelegramLinks } from './utils/rssAutoPublisher.js';


const app = express();

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');

	await new Promise(resolve => setTimeout(resolve, 3000));

	logger.info('Exiting');
	process.exit();
});

app.use(helmet());
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
	origin: (origin, cb) => {
		if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
		else cb(new Error('Not allowed by CORS'));
	},
	credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - no authentication required
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.use('/', routes());

app.use(errorMiddleware);

app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 3001;

app.listen(port, async () => {
	logger.info(`🚀 API Server running on http://localhost:${port}`);
	startTelegramSync();
	await backfillTelegramLinks();
	startRssAutoPublisher();
});

export default app;