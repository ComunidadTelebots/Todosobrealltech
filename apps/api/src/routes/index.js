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
import noticiasRecommendedRouter from './noticias-recommended.js';
import noticiasWorkerRouter from './noticias-worker.js';
import noticiasSeoAuditRouter from './noticias-seo-audit.js';
import previewRouter from './preview.js';
import statsRouter from './stats.js';
import telegramLanguageMapRouter from './telegram-language-map.js';
import moonbotAdminRouter from './moonbot-admin.js';
import moonbotClusterRouter from './moonbot-cluster.js';
import houseAdsRouter from './house-ads.js';
import contentAnalyticsRouter from './content-analytics.js';
import { createEnvironmentRouter } from './moonbot-environments.js';
import { createEnvironmentService, environmentConfig, environmentRepository } from '../utils/moonbotEnvironments.js';
import pb from '../utils/pocketbaseClient.js';
import { authorizeAdminOrCreator } from './stats.js';

let environments;
const environmentService = () => {
    if (!environments) environments = createEnvironmentService({
        ...environmentConfig(process.env.MOON_ENVIRONMENTS, process.env.RELEASE_COOKIE_DOMAIN),
        secret: process.env.MOON_ENVIRONMENT_SECRET, repository: environmentRepository(pb),
    });
    return environments;
};

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
    router.use('/noticias/recommended', noticiasRecommendedRouter);
    router.use('/noticias/worker', noticiasWorkerRouter);
    router.use('/noticias/seo-audit', noticiasSeoAuditRouter);
    router.use('/preview', previewRouter);
    router.use('/stats', statsRouter);
    router.use('/telegram-language-map', telegramLanguageMapRouter);
    router.use('/moonbot-admin/cluster', moonbotClusterRouter);
    router.use('/moonbot-environments', createEnvironmentRouter({ service: environmentService, authenticate: authorizeAdminOrCreator }));
    router.use('/moonbot-admin', moonbotAdminRouter);
    router.use('/house-ads', houseAdsRouter);
    // Alias neutral: algunos bloqueadores interceptan cualquier URL que incluya
    // "ads", incluso cuando son recomendaciones propias sin seguimiento externo.
    router.use('/community-cards', houseAdsRouter);
    router.use('/content-analytics', contentAnalyticsRouter);

    return router;
};
