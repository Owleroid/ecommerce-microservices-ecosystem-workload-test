import express, { Application } from 'express';
import { 
  logger, 
  createRequestLogger, 
  errorHandler, 
  notFoundHandler,
  createHealthHandler 
} from 'service-common';
import { config } from './config/env';
import { connectRedis, checkRedisHealth, redisClient } from './config/redis';
import { createRateLimiter } from './middleware/rate-limiter';
import { createAuthRoutes } from './routes/auth.routes';
import { createUserRoutes } from './routes/user.routes';
import { createMediaRoutes } from './routes/media.routes';

export const createApp = async (): Promise<Application> => {
  const app = express();

  // Trust proxy (important for rate limiting by IP)
  app.set('trust proxy', 1);

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(createRequestLogger());

  // Health check (before rate limiting)
  app.get('/health', createHealthHandler(
    config.SERVICE_NAME,
    async () => ({
      redis: await checkRedisHealth()
    })
  ));

  // Rate limiting
  app.use(createRateLimiter());

  // Service routes (proxied to downstream services)
  app.use(createAuthRoutes());
  app.use(createUserRoutes());
  app.use(createMediaRoutes());

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      service: config.SERVICE_NAME,
      version: '1.0.0',
      endpoints: {
        auth: '/auth/*',
        users: '/users/*',
        media: '/media/*',
        health: '/health'
      }
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting API gateway...');

    // Connect to Redis
    await connectRedis();

    // Create and start app
    const app = await createApp();
    const port = parseInt(config.PORT);

    const server = app.listen(port, () => {
      logger.info(`API gateway listening on port ${port}`, {
        service: config.SERVICE_NAME,
        port,
        nodeEnv: config.NODE_ENV,
        routes: {
          auth: config.AUTH_SERVICE_URL,
          user: config.USER_SERVICE_URL,
          media: config.MEDIA_SERVICE_URL
        }
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await redisClient.quit();
          logger.info('Redis connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    console.error('Full error:', error);
    process.exit(1);
  }
};
