import express from 'express';
import axios from 'axios';
import logger from '../utils/logger.js';
import adminOrCreatorMiddleware from '../middleware/admin-or-creator.js';

const router = express.Router();

// Prevent unauthenticated callers from using the server as a network scanner.
router.use(adminOrCreatorMiddleware);

/**
 * Helper function to build proxy URL from components
 */
function buildProxyUrl(proxyUrl, proxyType, username, password) {
  // If proxyUrl already includes protocol, use it as-is
  if (proxyUrl.includes('://')) {
    // If credentials provided, inject them into the URL
    if (username && password) {
      const urlObj = new URL(proxyUrl);
      urlObj.username = username;
      urlObj.password = password;
      return urlObj.toString();
    }
    return proxyUrl;
  }

  // Build proxy URL from components
  const protocol = proxyType || 'http';
  const credentials = username && password ? `${username}:${password}@` : '';
  return `${protocol}://${credentials}${proxyUrl}`;
}

/**
 * Helper function to create axios proxy config
 */
function createProxyConfig(proxyUrl, proxyType) {
  const protocol = proxyType || 'http';
  const proxyConfig = {};

  // Parse proxy URL to extract components
  try {
    const url = new URL(proxyUrl);
    const proxyHost = url.hostname;
    const proxyPort = url.port || (protocol === 'https' ? 443 : 80);
    const proxyAuth = url.username && url.password ? {
      username: url.username,
      password: url.password,
    } : undefined;

    proxyConfig[protocol] = `${protocol}://${proxyHost}:${proxyPort}`;

    return { proxy: proxyConfig, auth: proxyAuth };
  } catch (error) {
    logger.error(`Failed to parse proxy URL: ${error.message}`);
    throw new Error(`Invalid proxy URL format: ${error.message}`);
  }
}

/**
 * POST /test-proxy - Test proxy connection
 */
router.post('/', async (req, res) => {
  const { proxy_url, proxy_type, username, password } = req.body;

  // Validate required fields
  if (!proxy_url) {
    return res.status(400).json({
      success: false,
      message: 'proxy_url is required',
      responseTime: null,
    });
  }

  logger.info(`Testing proxy connection: ${proxy_url} (type: ${proxy_type || 'http'})`);

  const startTime = Date.now();

  try {
    // Build full proxy URL with credentials if provided
    const fullProxyUrl = buildProxyUrl(proxy_url, proxy_type, username, password);
    logger.info(`Full proxy URL constructed: ${proxy_url}`);

    // Create axios instance with proxy configuration
    const proxyConfig = createProxyConfig(fullProxyUrl, proxy_type);

    const axiosInstance = axios.create({
      httpAgent: proxyConfig.proxy.http ? new (await import('http')).Agent({
        proxy: proxyConfig.proxy.http,
      }) : undefined,
      httpsAgent: proxyConfig.proxy.https ? new (await import('https')).Agent({
        proxy: proxyConfig.proxy.https,
      }) : undefined,
      timeout: 10000, // 10 second timeout
    });

    // Test proxy by making a simple request to a reliable endpoint
    const testUrl = 'http://httpbin.org/ip';
    logger.info(`Making test request to ${testUrl} through proxy`);

    const response = await axiosInstance.get(testUrl);

    const responseTime = Date.now() - startTime;

    logger.info(`Proxy test successful in ${responseTime}ms`);

    res.json({
      success: true,
      message: 'Proxy connection successful',
      responseTime,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error.message || 'Unknown error';

    logger.error(`Proxy test failed: ${errorMessage}`);

    // Throw error so errorMiddleware catches it
    throw new Error(`Proxy connection failed: ${errorMessage}`);
  }
});

export default router;
