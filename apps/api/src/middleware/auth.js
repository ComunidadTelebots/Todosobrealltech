import 'dotenv/config';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // If no Authorization header, throw error
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  // Extract token from 'Bearer token' format
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw new Error('Bearer token is required');
  }

  // Validate token with PocketBase using authRefresh
  try {
    const authData = await pb.collection('users').authRefresh({ token });
    
    if (!authData || !authData.record) {
      throw new Error('Invalid or expired authentication token');
    }

    const user = authData.record;

    logger.info(`Authenticated user: ${user.id}`);

    // Set req.state.user with user data
    req.state = req.state || {};
    req.state.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      ...user,
    };

    next();
  } catch (error) {
    logger.error(`Authentication failed: ${error.message}`);
    throw new Error('Invalid or expired authentication token');
  }
};

export default authMiddleware;