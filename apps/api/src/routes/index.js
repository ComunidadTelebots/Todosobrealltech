import { Router } from 'express';
import healthCheck from './health-check.js';
import translateRouter from './translate.js';
import authRouter from './auth.js';
import onionRouter from './onion.js';
import proxiesRouter from './proxies.js';
import testProxyRouter from './test-proxy.js';
import freezeAccountRouter from './freeze-account.js';
import blockedUsersRouter from './blocked-users.js';
import botsRouter from './bots.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/translate', translateRouter);
    router.use('/auth', authRouter);
    router.use('/onion', onionRouter);
    router.use('/proxies', proxiesRouter);
    router.use('/test-proxy', testProxyRouter);
    router.use('/freeze-account', freezeAccountRouter);
    router.use('/blocked-users', blockedUsersRouter);
    router.use('/bots', botsRouter);

    return router;
};