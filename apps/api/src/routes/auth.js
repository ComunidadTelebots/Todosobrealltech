import express from 'express';
import crypto from 'crypto';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper function to generate random password
function generateRandomPassword(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Helper function to verify Telegram signature
function verifyTelegramSignature(data, hash) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  // Create data check string from sorted keys
  const dataCheckString = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');

  // Create HMAC signature
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const signature = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return signature === hash;
}

// POST /auth/telegram - Authenticate with Telegram
router.post('/telegram', async (req, res) => {
  const { telegram_id, telegram_username, telegram_name, telegram_photo_url, hash } = req.body;

  // Validate required fields
  if (!telegram_id || !hash) {
    return res.status(400).json({ error: 'telegram_id and hash are required' });
  }

  // Verify Telegram signature
  const dataToVerify = {
    telegram_id: String(telegram_id),
    telegram_username: telegram_username || '',
    telegram_name: telegram_name || '',
    telegram_photo_url: telegram_photo_url || '',
  };

  const isValidSignature = verifyTelegramSignature(dataToVerify, hash);
  if (!isValidSignature) {
    throw new Error('Invalid Telegram signature');
  }

  logger.info(`Telegram authentication attempt for user ${telegram_id}`);

  // Check if user already exists
  let user;
  try {
    const existingUsers = await pb.collection('users').getFullList({
      filter: `telegram_id = "${telegram_id}"`,
    });

    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
      logger.info(`Existing Telegram user found: ${user.id}`);
    }
  } catch (error) {
    logger.warn(`Error querying existing user: ${error.message}`);
  }

  // If user doesn't exist, create new user
  if (!user) {
    const email = `telegram_${telegram_id}@telegram.local`;
    const password = generateRandomPassword(32);

    user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      telegram_id: String(telegram_id),
      telegram_username: telegram_username || '',
      telegram_name: telegram_name || '',
      telegram_photo_url: telegram_photo_url || '',
    });

    logger.info(`New Telegram user created: ${user.id}`);
  }

  // Authenticate user and get auth token
  const authData = await pb.collection('users').authWithPassword(user.email, user.password);

  logger.info(`Telegram user authenticated: ${user.id}`);

  res.json({
    authToken: authData.token,
    user: {
      id: user.id,
      email: user.email,
      telegram_username: user.telegram_username,
    },
  });
});

export default router;