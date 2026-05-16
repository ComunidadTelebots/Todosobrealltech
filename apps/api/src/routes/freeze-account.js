import express from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

// POST /freeze-account - Freeze or unfreeze user account (admin only)
router.post('/', async (req, res) => {
  const { userId, action } = req.body;

  // Validate required fields
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  // Validate action value
  if (action !== 'freeze' && action !== 'unfreeze') {
    throw new Error('action must be "freeze" or "unfreeze"');
  }

  // Check if user is authenticated and has admin role
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    throw new Error('Bearer token is required');
  }

  // Validate token and check admin role
  let adminUser;
  try {
    pb.authStore.save(token);
    adminUser = pb.authStore.model;

    if (!adminUser) {
      throw new Error('Invalid authentication token');
    }

    // Check if user has admin role
    if (adminUser.role !== 'admin') {
      throw new Error('Only administrators can freeze/unfreeze accounts');
    }
  } catch (error) {
    logger.error(`Admin authentication failed: ${error.message}`);
    throw new Error('Unauthorized: admin access required');
  }

  logger.info(`Admin ${adminUser.id} attempting to ${action} account ${userId}`);

  // Check if target user exists
  let targetUser;
  try {
    targetUser = await pb.collection('users').getOne(userId);
  } catch (error) {
    logger.warn(`User not found: ${userId}`);
    throw new Error(`User with ID "${userId}" not found`);
  }

  // Update user's is_frozen status
  const isFrozen = action === 'freeze';
  const updatedUser = await pb.collection('users').update(userId, {
    is_frozen: isFrozen,
  });

  const message = isFrozen
    ? 'Cuenta congelada exitosamente'
    : 'Cuenta descongelada exitosamente';

  logger.info(`Account ${action}d for user ${userId} by admin ${adminUser.id}`);

  res.json({
    success: true,
    message,
    userId: updatedUser.id,
    is_frozen: updatedUser.is_frozen,
  });
});

export default router;