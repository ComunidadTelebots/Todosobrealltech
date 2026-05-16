import 'dotenv/config';
import pb from './pocketbaseClient.js';
import logger from './logger.js';

/**
 * Log a bot action to the audit trail
 * @param {string} userId - The user ID performing the action
 * @param {string} botId - The bot ID (optional, null for creation attempts)
 * @param {string} action - The action type: 'create', 'update', 'delete', 'status_change', 'test_connection', 'unauthorized_access_attempt'
 * @param {object} details - Additional details about the action
 * @param {boolean} success - Whether the action was successful
 * @param {string} ipAddress - The IP address of the request (optional)
 * @returns {Promise<object>} - The created audit log record
 */
export async function logBotAction(userId, botId, action, details = {}, success = true, ipAddress = null) {
  try {
    const auditRecord = await pb.collection('audit_logs').create({
      user_id: userId,
      bot_id: botId || '',
      action_type: action,
      details: JSON.stringify(details),
      success,
      ip_address: ipAddress || '',
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `Audit log created: user=${userId}, bot=${botId}, action=${action}, success=${success}`
    );

    return auditRecord;
  } catch (error) {
    logger.error(`Failed to create audit log: ${error.message}`);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * Log bot activity (for tracking last_activity timestamp)
 * @param {string} botId - The bot ID
 * @param {string} activityType - Type of activity: 'test_connection', 'config_updated', 'status_changed', 'created', 'deleted'
 * @param {object} details - Additional details
 * @returns {Promise<void>}
 */
export async function logBotActivity(botId, activityType, details = {}) {
  try {
    // Update the bot's last_activity timestamp
    await pb.collection('bots').update(botId, {
      last_activity: new Date().toISOString(),
    });

    logger.info(`Bot activity logged: bot=${botId}, type=${activityType}`);
  } catch (error) {
    logger.error(`Failed to log bot activity: ${error.message}`);
    // Don't throw - activity logging should not break the main operation
  }
}