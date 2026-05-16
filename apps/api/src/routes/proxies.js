import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /proxies - Fetch MTProto proxies from PocketBase collection
router.get('/', async (req, res) => {
  logger.info('Fetching proxies from PocketBase collection');

  const result = await pb.collection('proxies').getList(1, 500);

  logger.info(`Retrieved ${result.items.length} proxies from PocketBase`);

  const formattedProxies = result.items.map(proxy => ({
    id: proxy.id,
    server: proxy.server,
    port: proxy.port,
    secret: proxy.secret,
  }));

  res.json(formattedProxies);
});

export default router;