import 'dotenv/config';
import pb from './pocketbaseClient.js';
import logger from './logger.js';

/**
 * Log bot activity to the audit trail
 * @param {string} userId - The user ID performing the action
 * @param {string} botId - The bot ID
 * @param {string} activityType - Type of activity: 'created', 'config_updated', 'status_changed', 'test_connection', 'deleted', 'renamed'
 * @param {object} details - Additional details about the activity
 * @param {boolean} success - Whether the activity was successful
 * @returns {Promise<object|null>} - The created activity log record or null on failure
 */
export async function logBotActivity(userId, botId, activityType, details = {}, success = true) {
  try {
    const activityRecord = await pb.collection('bot_activity_logs').create({
      user_id: userId,
      bot_id: botId,
      activity_type: activityType,
      details: JSON.stringify(details),
      success,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      `Activity logged: user=${userId}, bot=${botId}, type=${activityType}, success=${success}`
    );

    return activityRecord;
  } catch (error) {
    logger.error(`Failed to log bot activity: ${error.message}`);
    // Don't throw - activity logging should not break the main operation
    return null;
  }
}