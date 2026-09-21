import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import adminOrCreatorMiddleware from '../middleware/admin-or-creator.js';
import { MOONBOT_INTERNAL_URL, moonbotAdminHeaders } from '../utils/moonbotConnection.js';

const router = express.Router();
const moonHeaders = moonbotAdminHeaders;

// Every endpoint either contacts CAS or reads/writes privileged blocklist data.
router.use(adminOrCreatorMiddleware);

// This collection blocks TodoSobreAllTech accounts. Telegram CAS/GBAN records
// remain in Moonbot's security registry and are intentionally kept separate.
router.get('/', async (req, res) => {
  try {
    const webRecords = await pb.collection('blocked_users').getFullList({ sort: '-imported_date' });
    let moon = { records: [], stats: { cas: 0, moonbot: 0, global: 0, local: 0 } };
    if (MOONBOT_INTERNAL_URL && process.env.MOON_ADMIN_API_KEY) {
      try {
        const params = new URLSearchParams({ source: String(req.query.source || 'all'), q: String(req.query.q || ''),
          page: String(req.query.page || 1), per_page: String(req.query.per_page || 100) });
        const response = await fetch(`${MOONBOT_INTERNAL_URL}/api/internal/ban-directory?${params}`, {
          headers: moonHeaders(), signal: AbortSignal.timeout(8000),
        });
        if (response.ok) moon = await response.json();
        else logger.warn(`[Web blocks] Moonbot directory returned ${response.status}`);
      } catch (error) {
        // Web-account blocks remain available even during a Moonbot restart.
        logger.warn(`[Web blocks] Moonbot directory unavailable: ${error.message}`);
      }
    }
    const source = String(req.query.source || 'all');
    const webRows = ['all', 'web'].includes(source)
      ? webRecords.map((record) => ({ ...record, registry: 'web', scope: 'web' })) : [];
    const moonRows = (moon.records || []).map((record, index) => ({ ...record,
      id: record.id || `moon:${record.source}:${record.group_id || 'global'}:${record.user_id}:${index}`,
      registry: record.source === 'cas_export' ? 'cas' : 'moonbot', is_active: record.status !== 'revoked' }));
    return res.json({ ok: true, records: [...moonRows, ...webRows], stats: {
      ...moon.stats, web: webRows.filter((record) => record.is_active).length,
    }, page: moon.page || 1, has_more: Boolean(moon.has_more) });
  } catch (error) {
    logger.error(`[Web blocks] List failed: ${error.message}`);
    return res.status(502).json({ ok: false, error: 'No se pudieron consultar los bloqueos web' });
  }
});

router.all('/captcha-global', async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Método no permitido' });
  // Los administradores web pueden consultar el estado. Solo el creator/master
  // puede modificar ajustes o ejecutar y cancelar campañas globales.
  if (req.method === 'POST' && req.state?.user?.role !== 'creator') {
    return res.status(403).json({ ok: false, error: 'Solo el master puede modificar el captcha global' });
  }
  if (!MOONBOT_INTERNAL_URL || !process.env.MOON_ADMIN_API_KEY) {
    return res.status(503).json({ ok: false, error: 'Conexión interna con Moonbot no configurada' });
  }
  try {
    const response = await fetch(`${MOONBOT_INTERNAL_URL}/api/internal/captcha-global`, {
      method: req.method, headers: { ...moonHeaders(), 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      // El inicio recorre todos los grupos y puede preparar cientos de usuarios.
      // Un límite corto devolvía 502 aunque Moonbot guardase la campaña.
      signal: AbortSignal.timeout(req.method === 'POST' ? 60_000 : 10_000),
    });
    return res.status(response.status).json(await response.json());
  } catch (error) {
    if (req.method === 'POST') {
      try {
        // Recupera una campaña que llegó a iniciarse aunque se perdiera la
        // respuesta del POST, evitando mostrar un fallo falso al master.
        const statusResponse = await fetch(`${MOONBOT_INTERNAL_URL}/api/internal/captcha-global`, {
          headers: moonHeaders(), signal: AbortSignal.timeout(10_000),
        });
        const statusPayload = await statusResponse.json();
        if (statusResponse.ok && statusPayload?.campaign?.status === 'running') {
          return res.status(202).json({ ...statusPayload, ok: true, started: true, recovered: true });
        }
      } catch { /* conserva el error original */ }
    }
    logger.warn(`[Global captcha] ${error.message}`);
    return res.status(502).json({ ok: false, error: 'Moonbot no respondió al control global de captcha' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const record = await pb.collection('blocked_users').update(String(req.params.id), {
      is_active: Boolean(req.body?.is_active),
    });
    return res.json({ ok: true, record });
  } catch {
    return res.status(400).json({ ok: false, error: 'No se pudo actualizar el bloqueo web' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pb.collection('blocked_users').delete(String(req.params.id));
    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ ok: false, error: 'No se pudo eliminar el bloqueo web' });
  }
});

// Helper function to implement exponential backoff retry logic
async function fetchWithRetry(url, options = {}, maxAttempts = 3) {
  const timeout = options.timeout || 5000;
  const baseDelay = 1000; // 1 second base delay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`[CAS API] Connection attempt ${attempt}/${maxAttempts} to ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      logger.info(`[CAS API] Response received - Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      const errorMessage = error.name === 'AbortError' ? 'Request timeout' : error.message;

      if (isLastAttempt) {
        logger.error(`[CAS API] Final attempt failed: ${errorMessage}`);
        throw new Error(`Failed to connect to CAS API after ${maxAttempts} attempts: ${errorMessage}`);
      }

      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
      logger.warn(`[CAS API] Attempt ${attempt} failed: ${errorMessage}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Helper function to validate blocked user data structure
function validateBlockedUserData(user) {
  const errors = [];

  if (!user.user_id && !user.id) {
    errors.push('Missing user_id or id field');
  }

  if (typeof user.user_id !== 'string' && typeof user.id !== 'string' && typeof user.user_id !== 'number' && typeof user.id !== 'number') {
    errors.push('user_id/id must be string or number');
  }

  return errors;
}

// Helper function to parse and validate import data based on source
function parseImportData(source, data) {
  logger.info(`[Import] Parsing data for source: ${source}`);

  let users = [];

  try {
    if (source === 'csv') {
      // Parse CSV format: expect string with lines of "user_id,username,reason"
      if (typeof data !== 'string') {
        throw new Error('CSV data must be a string');
      }

      const lines = data.trim().split('\n').filter(line => line.trim());
      users = lines.map((line, index) => {
        const [user_id, username, reason] = line.split(',').map(v => v.trim());
        if (!user_id) {
          throw new Error(`CSV line ${index + 1}: missing user_id`);
        }
        return { user_id, username: username || '', reason: reason || '' };
      });

      logger.info(`[Import] Parsed ${users.length} users from CSV`);
    } else if (source === 'json') {
      // Parse JSON format: expect array of objects
      if (typeof data === 'string') {
        users = JSON.parse(data);
      } else if (Array.isArray(data)) {
        users = data;
      } else {
        throw new Error('JSON data must be an array or JSON string');
      }

      if (!Array.isArray(users)) {
        throw new Error('JSON data must be an array of user objects');
      }

      logger.info(`[Import] Parsed ${users.length} users from JSON`);
    } else if (source === 'manual') {
      // Single user object
      if (!data || typeof data !== 'object') {
        throw new Error('Manual data must be a user object');
      }
      users = [data];
      logger.info('[Import] Parsed 1 user from manual input');
    } else {
      throw new Error(`Unknown source: ${source}`);
    }
  } catch (error) {
    logger.error(`[Import] Parse error for ${source}: ${error.message}`);
    throw new Error(`Failed to parse ${source} data: ${error.message}`);
  }

  return users;
}

// Helper function to check if user already exists in blocked_users collection
async function userAlreadyBlocked(userId) {
  try {
    const existing = await pb.collection('blocked_users').getFirstListItem(
      `user_id="${userId}"`
    );
    return !!existing;
  } catch (error) {
    // User doesn't exist (expected case)
    return false;
  }
}

// Helper function to test CAS API availability
async function testCasApiAvailability() {
  const casApiUrl = process.env.CAS_API_URL;

  if (!casApiUrl) {
    logger.warn('[CAS API] CAS_API_URL is not configured');
    return false;
  }

  try {
    logger.info(`[CAS API] Testing availability of ${casApiUrl}`);
    const response = await fetchWithRetry(casApiUrl, { timeout: 5000 }, 2);
    const data = await response.json();

    const users = Array.isArray(data) ? data : data.blockedUsers || data.users || data.data || [];

    if (!Array.isArray(users)) {
      logger.warn('[CAS API] Response is not in expected format');
      return false;
    }

    logger.info('[CAS API] Availability test passed');
    return true;
  } catch (error) {
    logger.warn(`[CAS API] Availability test failed: ${error.message}`);
    return false;
  }
}

// GET /blocked-users/status - Check availability of all import sources
router.get('/status', async (req, res) => {
  logger.info('[Status] Checking availability of import sources');

  let localCas = { available: false, loaded: false, records: 0 };
  let casFeed = { available: false, records: 0 };
  if (MOONBOT_INTERNAL_URL && process.env.MOON_ADMIN_API_KEY) {
    try {
      const response = await fetch(`${MOONBOT_INTERNAL_URL}/api/internal/cas-sources/status`, {
        headers: moonHeaders(), signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const payload = await response.json();
        localCas = payload.local_export || localCas;
        casFeed = payload.feed || casFeed;
      }
    } catch (error) {
      logger.warn(`[Status] Moonbot CAS local unavailable: ${error.message}`);
    }
  }
  // La consulta remota es informativa y solo se intenta cuando el export local
  // no está listo; así el panel no queda esperando una API externa innecesaria.
  const casApiAvailable = localCas.available ? false : await testCasApiAvailability();
  const casAvailable = Boolean(localCas.available || casApiAvailable);

  res.json({
    cas_available: casAvailable,
    cas_api_available: casApiAvailable,
    cas_local_available: Boolean(localCas.available),
    cas_local_records: Number(localCas.records || 0),
    cas_feed_available: Boolean(casFeed.available),
    cas_feed_records: Number(casFeed.records || 0),
    cas_mode: localCas.available ? 'moonbot_local_export' : casApiAvailable ? 'remote_api' : 'unavailable',
    csv_available: true,
    json_available: true,
    manual_available: true,
  });
});

// GET /blocked-users/import - Fetch from CAS API with graceful error handling
router.get('/import', async (req, res) => {
  const casApiUrl = process.env.CAS_API_URL;

  if (!casApiUrl) {
    logger.warn('[CAS API] CAS_API_URL is not configured');
    return res.status(503).json({
      available: false,
      message: 'CAS API is not configured',
    });
  }

  try {
    logger.info(`[CAS API] Starting import from ${casApiUrl}`);
    const startTime = new Date();

    // Fetch from CAS API with retry logic
    const response = await fetchWithRetry(casApiUrl, { timeout: 5000 }, 3);
    const data = await response.json();

    logger.info(`[CAS API] Response data structure: ${JSON.stringify(Object.keys(data))}`);

    // Extract blocked users array from response
    let blockedUsers = Array.isArray(data) ? data : data.blockedUsers || data.users || data.data || [];

    if (!Array.isArray(blockedUsers)) {
      throw new Error('Invalid response format from CAS API - expected array of users');
    }

    logger.info(`[CAS API] Fetched ${blockedUsers.length} blocked users`);

    let imported = 0;
    let duplicates = 0;
    const errors = [];
    const timestamp = new Date().toISOString();

    // Process each blocked user
    for (const user of blockedUsers) {
      try {
        const userId = user.id || user.user_id || user.userId;

        if (!userId) {
          const errorMsg = 'Missing user_id field';
          logger.warn(`[Import] Skipping user record: ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        // Check if user already exists
        const isBlocked = await userAlreadyBlocked(userId);

        if (isBlocked) {
          logger.warn(`[Import] User already blocked: ${userId}`);
          duplicates++;
        } else {
          // Create new blocked user record
          await pb.collection('blocked_users').create({
            user_id: String(userId),
            username: user.username || String(userId),
            source: 'api',
            import_source: 'cas',
            reason: user.reason || '',
            blocked_at: user.blocked_at || timestamp,
            is_active: true,
          });

          logger.info(`[Import] Created blocked user record: ${userId}`);
          imported++;
        }
      } catch (error) {
        const errorMsg = `Error processing user ${user.id || user.user_id}: ${error.message}`;
        logger.error(`[Import] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Create import log record
    const importLog = await pb.collection('import_logs').create({
      import_type: 'blocked_users',
      source: 'cas_api',
      total_processed: blockedUsers.length,
      imported,
      duplicates,
      errors: errors.length,
      timestamp,
    });

    const duration = new Date() - startTime;
    logger.info(
      `[Import] CAS API import completed in ${duration}ms: imported=${imported}, duplicates=${duplicates}, errors=${errors.length}`
    );

    res.json({
      success: true,
      imported,
      duplicates,
      errors: errors.length > 0 ? errors : undefined,
      importLogId: importLog.id,
    });
  } catch (error) {
    logger.error(`[CAS API] Import failed: ${error.message}`);
    return res.status(503).json({
      available: false,
      message: 'CAS API temporarily unavailable',
      error: error.message,
    });
  }
});

// POST /blocked-users/import - Import from multiple sources with independent error handling
router.post('/import', async (req, res) => {
  const { source, data } = req.body;

  // Validate required fields
  if (!source) {
    return res.status(400).json({ error: 'source is required (cas|csv|json|manual)' });
  }

  if (!['cas', 'csv', 'json', 'manual'].includes(source)) {
    return res.status(400).json({ error: 'source must be one of: cas, csv, json, manual' });
  }

  if (source !== 'cas' && !data) {
    return res.status(400).json({ error: `data is required for source: ${source}` });
  }

  logger.info(`[Import] Starting import from source: ${source}`);
  const startTime = new Date();

  let users = [];

  // Handle CAS source with graceful error handling
  if (source === 'cas') {
    const casApiUrl = process.env.CAS_API_URL;

    if (!casApiUrl) {
      logger.warn('[CAS API] CAS_API_URL is not configured');
      return res.status(503).json({
        available: false,
        message: 'CAS API is not configured',
      });
    }

    try {
      logger.info(`[CAS API] Fetching from ${casApiUrl}`);

      const response = await fetchWithRetry(casApiUrl, { timeout: 5000 }, 3);
      const apiData = await response.json();

      logger.info(`[CAS API] Response structure: ${JSON.stringify(Object.keys(apiData))}`);

      users = Array.isArray(apiData) ? apiData : apiData.blockedUsers || apiData.users || apiData.data || [];

      if (!Array.isArray(users)) {
        throw new Error('Invalid response format from CAS API - expected array of users');
      }

      logger.info(`[CAS API] Fetched ${users.length} users`);
    } catch (error) {
      logger.error(`[CAS API] Import failed: ${error.message}`);
      return res.status(503).json({
        available: false,
        message: 'CAS API temporarily unavailable',
        error: error.message,
      });
    }
  } else {
    // Parse data for csv, json, or manual sources
    try {
      users = parseImportData(source, data);
    } catch (error) {
      logger.error(`[Import] Parse error for ${source}: ${error.message}`);
      return res.status(400).json({
        error: `Failed to parse ${source} data: ${error.message}`,
      });
    }
  }

  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({
      error: 'No valid user data to import',
    });
  }

  let imported = 0;
  let duplicates = 0;
  const errors = [];
  const timestamp = new Date().toISOString();

  // Process each user
  for (const user of users) {
    try {
      // Validate user data
      const validationErrors = validateBlockedUserData(user);
      if (validationErrors.length > 0) {
        const errorMsg = `Validation failed: ${validationErrors.join(', ')}`;
        logger.warn(`[Import] ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }

      const userId = String(user.user_id || user.id);

      // Check if user already exists
      const isBlocked = await userAlreadyBlocked(userId);

      if (isBlocked) {
        logger.warn(`[Import] User already blocked: ${userId}`);
        duplicates++;
      } else {
        // Create new blocked user record
        await pb.collection('blocked_users').create({
          user_id: userId,
          username: user.username || userId,
          source: source === 'manual' ? 'manual' : 'api',
          import_source: source,
          reason: user.reason || '',
          blocked_at: user.blocked_at || timestamp,
          is_active: true,
        });

        logger.info(`[Import] Created blocked user: ${userId} from source ${source}`);
        imported++;
      }
    } catch (error) {
      const errorMsg = `Error processing user ${user.user_id || user.id}: ${error.message}`;
      logger.error(`[Import] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  // Create import log record
  const importLog = await pb.collection('import_logs').create({
    import_type: 'blocked_users',
    source,
    total_processed: users.length,
    imported,
    duplicates,
    errors: errors.length,
    timestamp,
  });

  const duration = new Date() - startTime;
  logger.info(
    `[Import] Import from ${source} completed in ${duration}ms: imported=${imported}, duplicates=${duplicates}, errors=${errors.length}`
  );

  res.json({
    success: true,
    imported,
    duplicates,
    errors: errors.length > 0 ? errors : undefined,
    importLogId: importLog.id,
  });
});

// POST /blocked-users/validate - Validate import source before importing
router.post('/validate', async (req, res) => {
  const { source, testData } = req.body;

  // Validate required fields
  if (!source) {
    return res.status(400).json({ error: 'source is required (cas|csv|json)' });
  }

  if (!['cas', 'csv', 'json', 'manual'].includes(source)) {
    return res.status(400).json({ error: 'source must be one of: cas, csv, json, manual' });
  }

  logger.info(`[Validate] Testing connectivity for source: ${source}`);

  try {
    if (source === 'cas') {
      const casApiUrl = process.env.CAS_API_URL;

      if (!casApiUrl) {
        return res.json({
          isValid: false,
          message: 'CAS_API_URL is not configured',
        });
      }

      logger.info(`[Validate] Testing CAS API connection to ${casApiUrl}`);

      try {
        const response = await fetchWithRetry(casApiUrl, { timeout: 5000 }, 2);
        const data = await response.json();

        const users = Array.isArray(data) ? data : data.blockedUsers || data.users || data.data || [];

        if (!Array.isArray(users)) {
          return res.json({
            isValid: false,
            message: 'CAS API response is not in expected format (expected array)',
          });
        }

        logger.info(`[Validate] CAS API validation successful - found ${users.length} users`);

        res.json({
          isValid: true,
          message: `CAS API is reachable and returns valid data (${users.length} users)`,
          sampleData: users.length > 0 ? users[0] : null,
        });
      } catch (error) {
        logger.warn(`[Validate] CAS API validation failed: ${error.message}`);
        res.json({
          isValid: false,
          message: `CAS API is unavailable: ${error.message}`,
        });
      }
    } else if (source === 'csv' || source === 'json' || source === 'manual') {
      if (!testData) {
        return res.status(400).json({ error: `testData is required for source: ${source}` });
      }

      logger.info(`[Validate] Validating ${source} format`);

      try {
        const users = parseImportData(source, testData);

        if (users.length === 0) {
          return res.json({
            isValid: false,
            message: `No valid users found in ${source} data`,
          });
        }

        // Validate first user
        const validationErrors = validateBlockedUserData(users[0]);
        if (validationErrors.length > 0) {
          return res.json({
            isValid: false,
            message: `Data validation failed: ${validationErrors.join(', ')}`,
          });
        }

        logger.info(`[Validate] ${source} validation successful - found ${users.length} users`);

        res.json({
          isValid: true,
          message: `${source.toUpperCase()} format is valid (${users.length} users)`,
          sampleData: users[0],
        });
      } catch (error) {
        logger.warn(`[Validate] ${source} validation failed: ${error.message}`);
        res.json({
          isValid: false,
          message: `${source.toUpperCase()} format is invalid: ${error.message}`,
        });
      }
    }
  } catch (error) {
    logger.error(`[Validate] Validation error for ${source}: ${error.message}`);
    res.json({
      isValid: false,
      message: `Validation failed: ${error.message}`,
    });
  }
});

export default router;
