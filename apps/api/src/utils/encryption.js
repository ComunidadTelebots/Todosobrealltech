import 'dotenv/config';
import crypto from 'crypto';
import logger from './logger.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  logger.error('ENCRYPTION_KEY is not set in .env file. Set a 64-character hex key or a 32-character text key.');
  throw new Error('ENCRYPTION_KEY must be set in .env file');
}

function parseEncryptionKey(value) {
  const trimmed = value.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const rawKey = Buffer.from(trimmed, 'utf-8');
  if (rawKey.length === 32) {
    return rawKey;
  }

  logger.error(`ENCRYPTION_KEY must be 64 hex characters or 32 UTF-8 bytes. Current length: ${trimmed.length} characters, ${rawKey.length} bytes.`);
  throw new Error('ENCRYPTION_KEY must be 64 hex characters or 32 UTF-8 bytes');
}

const key = parseEncryptionKey(ENCRYPTION_KEY);

/**
 * Encrypt a bot token using AES-256-GCM
 * @param {string} plainToken - The plain token to encrypt
 * @returns {string} - Base64 encoded string of 'iv:authTag:encryptedData'
 */
export function encrypt(plainToken) {
  try {
    if (!plainToken || typeof plainToken !== 'string') {
      logger.error('Invalid token provided for encryption');
      return null;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainToken, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData (all hex-encoded)
    const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    logger.info('Token encrypted successfully');
    return result;
  } catch (error) {
    logger.error(`Encryption error: ${error.message}`);
    return null;
  }
}

/**
 * Decrypt a bot token using AES-256-GCM
 * @param {string} encryptedToken - The encrypted token in format 'iv:authTag:encryptedData'
 * @returns {string|null} - Decrypted token or null on failure
 */
export function decrypt(encryptedToken) {
  try {
    if (!encryptedToken || typeof encryptedToken !== 'string') {
      logger.error('Invalid encrypted token provided for decryption');
      return null;
    }

    const parts = encryptedToken.split(':');
    if (parts.length !== 3) {
      logger.error('Invalid encrypted token format');
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    logger.info('Token decrypted successfully');
    return decrypted;
  } catch (error) {
    logger.error(`Decryption error: ${error.message}`);
    return null;
  }
}

/**
 * Mask a token to show only last 4 characters
 * @param {string} token - The token to mask
 * @returns {string} - Masked token in format '****...XXXX'
 */
export function maskToken(token) {
  if (!token || token.length < 4) {
    return '****';
  }
  const lastFour = token.slice(-4);
  return `****...${lastFour}`;
}
