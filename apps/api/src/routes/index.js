import { Router } from 'express';
import healthCheck from './health-check.js';
import translateRouter from './translate.js';
import authRouter from './auth.js';
import onionRouter from './onion.js';
import proxiesRouter from './proxies.js';
import mtprotoProxiesRouter from './mtproto-proxies.js';
import testProxyRouter from './test-proxy.js';
import freezeAccountRouter from './freeze-account.js';
import blockedUsersRouter from './blocked-users.js';
import botsRouter from './bots.js';
import telegramChannelRouter from './telegram-channel.js';
import noticiasRssRouter from './noticias-rss.js';
import noticiasViewRouter from './noticias-view.js';
import previewRouter from './preview.js';
import statsRouter from './stats.js';
import telegramLanguageMapRouter from './telegram-language-map.js';
import moonbotAdminRouter from './moonbot-admin.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/translate', translateRouter);
    router.use('/auth', authRouter);
    router.use('/onion', onionRouter);
    router.use('/proxies', proxiesRouter);
    router.use('/mtproto-proxies', mtprotoProxiesRouter);
    router.use('/test-proxy', testProxyRouter);
    router.use('/freeze-account', freezeAccountRouter);
    router.use('/blocked-users', blockedUsersRouter);
    router.use('/bots', botsRouter);
    router.use('/telegram-channel', telegramChannelRouter);
    router.use('/noticias/rss', noticiasRssRouter);
    router.use('/noticias/view', noticiasViewRouter);
    router.use('/preview', previewRouter);
    router.use('/stats', statsRouter);
    router.use('/telegram-language-map', telegramLanguageMapRouter);
    router.use('/moonbot-admin', moonbotAdminRouter);

    return router;
};
