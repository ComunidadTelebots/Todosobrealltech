import { authorizeAdminOrCreator } from '../routes/stats.js';

export const createAdminOrCreatorMiddleware = (authorize = authorizeAdminOrCreator) => async (req, res, next) => {
  const auth = await authorize(req);
  if (auth.error) {
    if (auth.retryAfter) res.set('Retry-After', String(auth.retryAfter));
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }
  req.state ||= {};
  req.state.user = auth.user;
  return next();
};

export default createAdminOrCreatorMiddleware();
