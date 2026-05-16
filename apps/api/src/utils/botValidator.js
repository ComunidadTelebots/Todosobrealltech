import logger from './logger.js';

/**
 * Validate bot token format based on bot type
 * @param {string} token - The bot token
 * @param {string} botType - Type of bot: 'telegram', 'discord', 'slack', 'custom'
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateBotToken(token, botType) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Bot token is required and must be a string' };
  }

  const trimmedToken = token.trim();

  if (trimmedToken.length === 0) {
    return { valid: false, error: 'Bot token cannot be empty' };
  }

  if (botType === 'telegram') {
    // Telegram bot token format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
    const telegramTokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    if (!telegramTokenRegex.test(trimmedToken)) {
      return {
        valid: false,
        error: 'Invalid Telegram bot token format. Expected format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      };
    }

    const parts = trimmedToken.split(':');
    if (parts[0].length < 5 || parts[1].length < 20) {
      return {
        valid: false,
        error: 'Telegram bot token appears to be invalid (incorrect length)',
      };
    }
  } else if (botType === 'discord') {
    // Discord bot token format: typically 72+ characters, alphanumeric with dots and underscores
    if (trimmedToken.length < 50) {
      return {
        valid: false,
        error: 'Invalid Discord bot token format. Token appears too short.',
      };
    }

    const discordTokenRegex = /^[A-Za-z0-9._-]+$/;
    if (!discordTokenRegex.test(trimmedToken)) {
      return {
        valid: false,
        error: 'Invalid Discord bot token format. Token contains invalid characters.',
      };
    }
  } else if (botType === 'slack') {
    // Slack bot token format: xoxb-... or xoxp-...
    if (!trimmedToken.startsWith('xoxb-') && !trimmedToken.startsWith('xoxp-')) {
      return {
        valid: false,
        error: 'Invalid Slack bot token format. Expected to start with xoxb- or xoxp-',
      };
    }

    if (trimmedToken.length < 20) {
      return {
        valid: false,
        error: 'Invalid Slack bot token format. Token appears too short.',
      };
    }
  } else if (botType === 'custom') {
    // Custom tokens just need to be non-empty and reasonable length
    if (trimmedToken.length < 5) {
      return {
        valid: false,
        error: 'Custom bot token must be at least 5 characters long',
      };
    }
  }

  logger.info(`Bot token validation passed for type: ${botType}`);
  return { valid: true, error: null };
}

/**
 * Validate bot name
 * @param {string} name - The bot name
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateBotName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Bot name is required and must be a string' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { valid: false, error: 'Bot name cannot be empty' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Bot name must be 100 characters or less' };
  }

  if (trimmedName.length < 1) {
    return { valid: false, error: 'Bot name must be at least 1 character' };
  }

  // Allow alphanumeric, spaces, hyphens
  const nameRegex = /^[a-zA-Z0-9\s-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return {
      valid: false,
      error: 'Bot name can only contain letters, numbers, spaces, and hyphens',
    };
  }

  logger.info(`Bot name validation passed: ${trimmedName}`);
  return { valid: true, error: null };
}