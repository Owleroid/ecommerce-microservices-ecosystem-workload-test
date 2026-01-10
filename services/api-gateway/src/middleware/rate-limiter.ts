import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { config } from '../config/env';
import { logger } from 'service-common';

export const createRateLimiter = () => {
  const windowMs = parseInt(config.RATE_LIMIT_WINDOW_MS);
  const maxRequests = parseInt(config.RATE_LIMIT_MAX_REQUESTS);

  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:',
    }),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        requestId: (req as any).requestId
      });

      res.status(429).json({
        error: {
          message: 'Too many requests, please try again later',
          statusCode: 429,
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
};
