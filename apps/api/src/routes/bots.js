import 'dotenv/config';
import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { encrypt, decrypt, maskToken } from '../utils/encryption.js';
import { validateBotToken, validateBotName } from '../utils/botValidator.js';
import { logBotActivity } from '../utils/activityLogger.js';

const router = express.Router();

/**
 * Middleware to validate Content-Type for POST/PUT/PATCH requests
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn(`Invalid Content-Type: ${contentType}`);
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Content-Type must be application/json',
        code: 400,
      });
    }
  }
  next();
};

/**
 * Middleware to validate authentication
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Unauthorized access attempt: missing authorization header');
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Authorization header is required',
      code: 401,
    });
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    logger.warn('Unauthorized access attempt: missing bearer token');
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Bearer token is required',
      code: 401,
    });
  }

  try {
    pb.authStore.save(token);
    const user = pb.authStore.model;

    if (!user || !user.id) {
      logger.warn('Unauthorized access attempt: invalid token');
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Invalid or expired authentication token',
        code: 401,
      });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Invalid or expired authentication token',
      code: 401,
    });
  }
};

router.use(validateContentType);
router.use(requireAuth);

/**
 * Helper function to verify user owns the bot
 */
async function verifyBotOwnership(botId, userId) {
  try {
    const bot = await pb.collection('user_bots').getOne(botId);

    if (!bot) {
      return { owned: false, bot: null, error: 'Bot not found' };
    }

    if (bot.user_id !== userId) {
      logger.warn(
        `Unauthorized access attempt: user ${userId} tried to access bot ${botId} owned by ${bot.user_id}`
      );
      return { owned: false, bot: null, error: 'You do not have permission to access this bot' };
    }

    return { owned: true, bot, error: null };
  } catch (error) {
    logger.error(`Error verifying bot ownership: ${error.message}`);
    return { owned: false, bot: null, error: 'Failed to verify bot ownership' };
  }
}

/**
 * Helper function to format bot response with masked token
 */
function formatBotResponse(bot) {
  return {
    id: bot.id,
    bot_name: bot.bot_name,
    bot_token: maskToken(bot.bot_token),
    bot_type: bot.bot_type,
    status: bot.status || 'active',
    config: bot.config ? JSON.parse(bot.config) : null,
    created_date: bot.created,
    last_activity: bot.last_activity,
  };
}

/**
 * Helper function to test bot connection
 */
async function testBotConnection(botType, decryptedToken) {
  try {
    if (botType === 'telegram') {
      // Test Telegram bot by calling getMe endpoint
      const response = await fetch(`https://api.telegram.org/bot${decryptedToken}/getMe`);

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API returned error: ${data.description}`);
      }

      return {
        success: true,
        message: 'Telegram bot connection successful',
        botInfo: {
          name: data.result.first_name,
          username: data.result.username,
          type: 'telegram',
          status: 'active',
        },
      };
    } else if (botType === 'discord') {
      // Test Discord bot by calling /users/@me endpoint
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${decryptedToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        message: 'Discord bot connection successful',
        botInfo: {
          name: data.username,
          id: data.id,
          type: 'discord',
          status: 'active',
        },
      };
    } else if (botType === 'slack') {
      // Test Slack bot by calling auth.test endpoint
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API returned error: ${data.error}`);
      }

      return {
        success: true,
        message: 'Slack bot connection successful',
        botInfo: {
          name: data.user_id,
          team: data.team_id,
          type: 'slack',
          status: 'active',
        },
      };
    } else if (botType === 'custom') {
      // Custom bot type - just verify token is not empty
      return {
        success: true,
        message: 'Custom bot type - manual verification required',
        botInfo: {
          name: 'Custom Bot',
          type: 'custom',
          status: 'active',
        },
      };
    }
  } catch (error) {
    logger.error(`Bot connection test failed: ${error.message}`);
    throw error;
  }
}

/**
 * POST /bots - Create a new bot
 */
router.post('/', async (req, res) => {
  const { bot_name, bot_token, bot_type, config } = req.body;
  const userId = req.userId;

  // Validate required fields
  if (!bot_name) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'bot_name is required',
      code: 400,
    });
  }

  if (!bot_token) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'bot_token is required',
      code: 400,
    });
  }

  if (!bot_type) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'bot_type is required',
      code: 400,
    });
  }

  // Validate bot_type
  const validBotTypes = ['telegram', 'discord', 'slack', 'custom'];
  if (!validBotTypes.includes(bot_type)) {
    return res.status(400).json({
      success: false,
      data: null,
      error: `bot_type must be one of: ${validBotTypes.join(', ')}`,
      code: 400,
    });
  }

  // Validate bot name
  const nameValidation = validateBotName(bot_name);
  if (!nameValidation.valid) {
    return res.status(400).json({
      success: false,
      data: null,
      error: nameValidation.error,
      code: 400,
    });
  }

  // Validate bot token
  const tokenValidation = validateBotToken(bot_token, bot_type);
  if (!tokenValidation.valid) {
    logger.warn(`Invalid bot token for type ${bot_type}: ${tokenValidation.error}`);
    await logBotActivity(userId, '', 'created', { bot_name, bot_type, error: tokenValidation.error }, false);
    return res.status(400).json({
      success: false,
      data: null,
      error: tokenValidation.error,
      code: 400,
    });
  }

  // Validate config if provided
  if (config) {
    if (typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'config must be a valid JSON object',
        code: 400,
      });
    }
  }

  try {
    // Encrypt the bot token before storing
    const encryptedToken = encrypt(bot_token);

    if (!encryptedToken) {
      throw new Error('Failed to encrypt bot token');
    }

    // Create bot record in PocketBase
    const bot = await pb.collection('user_bots').create({
      user_id: userId,
      bot_name,
      bot_token: encryptedToken,
      bot_type,
      config: config ? JSON.stringify(config) : '',
      status: 'active',
      last_activity: new Date().toISOString(),
    });

    logger.info(`Bot created successfully: ${bot.id} for user ${userId}`);
    await logBotActivity(userId, bot.id, 'created', { bot_name, bot_type }, true);

    res.status(201).json({
      success: true,
      data: formatBotResponse(bot),
      error: null,
      code: 201,
    });
  } catch (error) {
    logger.error(`Failed to create bot: ${error.message}`);
    await logBotActivity(userId, '', 'created', { bot_name, bot_type, error: error.message }, false);
    throw error;
  }
});

/**
 * GET /bots - List all bots for the authenticated user
 */
router.get('/', async (req, res) => {
  const userId = req.userId;

  try {
    const result = await pb.collection('user_bots').getList(1, 50, {
      filter: `user_id = "${userId}"`,
      sort: '-created',
    });

    logger.info(`Retrieved ${result.items.length} bots for user ${userId}`);

    const formattedBots = result.items.map(bot => formatBotResponse(bot));

    res.json({
      success: true,
      data: formattedBots,
      error: null,
      code: 200,
    });
  } catch (error) {
    logger.error(`Failed to retrieve bots: ${error.message}`);
    throw error;
  }
});

/**
 * GET /bots/:botId - Get bot details
 */
router.get('/:botId', async (req, res) => {
  const { botId } = req.params;
  const userId = req.userId;

  // Validate botId format
  if (!botId || botId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Invalid bot ID',
      code: 400,
    });
  }

  try {
    const { owned, bot, error } = await verifyBotOwnership(botId, userId);

    if (!owned) {
      const statusCode = bot ? 403 : 404;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error,
        code: statusCode,
      });
    }

    logger.info(`Retrieved bot details: ${botId} for user ${userId}`);

    res.json({
      success: true,
      data: formatBotResponse(bot),
      error: null,
      code: 200,
    });
  } catch (error) {
    logger.error(`Failed to retrieve bot details: ${error.message}`);
    throw error;
  }
});

/**
 * PUT /bots/:botId - Update bot configuration
 */
router.put('/:botId', async (req, res) => {
  const { botId } = req.params;
  const { bot_name, config } = req.body;
  const userId = req.userId;

  // Validate botId format
  if (!botId || botId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Invalid bot ID',
      code: 400,
    });
  }

  try {
    const { owned, bot, error } = await verifyBotOwnership(botId, userId);

    if (!owned) {
      const statusCode = bot ? 403 : 404;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error,
        code: statusCode,
      });
    }

    const updateData = {};
    const changedFields = [];

    // Update bot_name if provided
    if (bot_name !== undefined) {
      const nameValidation = validateBotName(bot_name);
      if (!nameValidation.valid) {
        return res.status(400).json({
          success: false,
          data: null,
          error: nameValidation.error,
          code: 400,
        });
      }
      updateData.bot_name = bot_name;
      changedFields.push('bot_name');
    }

    // Update config if provided
    if (config !== undefined) {
      if (typeof config !== 'object' || Array.isArray(config)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'config must be a valid JSON object',
          code: 400,
        });
      }
      updateData.config = config ? JSON.stringify(config) : '';
      changedFields.push('config');
    }

    // Update last_activity
    updateData.last_activity = new Date().toISOString();

    // Update bot in PocketBase
    const updatedBot = await pb.collection('user_bots').update(botId, updateData);

    logger.info(`Bot updated successfully: ${botId} for user ${userId}`);
    await logBotActivity(userId, botId, 'config_updated', { changed_fields: changedFields }, true);

    res.json({
      success: true,
      data: formatBotResponse(updatedBot),
      error: null,
      code: 200,
    });
  } catch (error) {
    logger.error(`Failed to update bot: ${error.message}`);
    await logBotActivity(userId, botId, 'config_updated', { error: error.message }, false);
    throw error;
  }
});

/**
 * DELETE /bots/:botId - Delete a bot
 */
router.delete('/:botId', async (req, res) => {
  const { botId } = req.params;
  const userId = req.userId;

  // Validate botId format
  if (!botId || botId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Invalid bot ID',
      code: 400,
    });
  }

  try {
    const { owned, bot, error } = await verifyBotOwnership(botId, userId);

    if (!owned) {
      const statusCode = bot ? 403 : 404;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error,
        code: statusCode,
      });
    }

    // Delete bot from PocketBase
    await pb.collection('user_bots').delete(botId);

    logger.info(`Bot deleted successfully: ${botId} for user ${userId}`);
    await logBotActivity(userId, botId, 'deleted', { bot_name: bot.bot_name }, true);

    res.json({
      success: true,
      data: {
        message: 'Bot deleted successfully',
        botId,
      },
      error: null,
      code: 200,
    });
  } catch (error) {
    logger.error(`Failed to delete bot: ${error.message}`);
    await logBotActivity(userId, botId, 'deleted', { error: error.message }, false);
    throw error;
  }
});

/**
 * PATCH /bots/:botId/status - Toggle bot status
 */
router.patch('/:botId/status', async (req, res) => {
  const { botId } = req.params;
  const { status } = req.body;
  const userId = req.userId;

  // Validate botId format
  if (!botId || botId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Invalid bot ID',
      code: 400,
    });
  }

  // Validate status
  if (!status) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'status is required',
      code: 400,
    });
  }

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'status must be "active" or "inactive"',
      code: 400,
    });
  }

  try {
    const { owned, bot, error } = await verifyBotOwnership(botId, userId);

    if (!owned) {
      const statusCode = bot ? 403 : 404;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error,
        code: statusCode,
      });
    }

    const oldStatus = bot.status || 'active';

    // Update bot status
    const updatedBot = await pb.collection('user_bots').update(botId, {
      status,
      last_activity: new Date().toISOString(),
    });

    logger.info(`Bot status changed: ${botId} from ${oldStatus} to ${status} for user ${userId}`);
    await logBotActivity(userId, botId, 'status_changed', { oldStatus, newStatus: status }, true);

    res.json({
      success: true,
      data: formatBotResponse(updatedBot),
      error: null,
      code: 200,
    });
  } catch (error) {
    logger.error(`Failed to update bot status: ${error.message}`);
    await logBotActivity(userId, botId, 'status_changed', { error: error.message }, false);
    throw error;
  }
});

/**
 * POST /bots/:botId/test - Test bot connection
 */
router.post('/:botId/test', async (req, res) => {
  const { botId } = req.params;
  const userId = req.userId;

  // Validate botId format
  if (!botId || botId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Invalid bot ID',
      code: 400,
    });
  }

  try {
    const { owned, bot, error } = await verifyBotOwnership(botId, userId);

    if (!owned) {
      const statusCode = bot ? 403 : 404;
      return res.status(statusCode).json({
        success: false,
        data: null,
        error,
        code: statusCode,
      });
    }

    // Decrypt bot token
    const decryptedToken = decrypt(bot.bot_token);

    if (!decryptedToken) {
      logger.error(`Failed to decrypt bot token for bot ${botId}`);
      await logBotActivity(userId, botId, 'test_connection', { error: 'Failed to decrypt token' }, false);
      throw new Error('Failed to decrypt bot token');
    }

    // Test bot connection
    try {
      const testResult = await testBotConnection(bot.bot_type, decryptedToken);

      logger.info(`Bot connection test successful: ${botId} for user ${userId}`);
      await logBotActivity(userId, botId, 'test_connection', { success: true, bot_type: bot.bot_type }, true);

      res.json({
        success: true,
        data: testResult,
        error: null,
        code: 200,
      });
    } catch (testError) {
      logger.warn(`Bot connection test failed: ${testError.message}`);
      await logBotActivity(userId, botId, 'test_connection', { success: false, error: testError.message }, false);

      res.json({
        success: false,
        data: {
          success: false,
          message: 'Connection failed',
          error: testError.message,
        },
        error: null,
        code: 200,
      });
    }
  } catch (error) {
    logger.error(`Bot connection test error: ${error.message}`);
    await logBotActivity(userId, botId, 'test_connection', { error: error.message }, false);
    throw error;
  }
});

export default router;