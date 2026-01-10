import express, { Application } from 'express';
import { 
  logger, 
  createRequestLogger, 
  errorHandler, 
  notFoundHandler,
  createHealthHandler 
} from 'service-common';
import { config } from './config/env';
import { initDatabase, checkDatabaseHealth } from './config/database';
import { connectRedis, checkRedisHealth, redisClient } from './config/redis';
import { UserRepository } from './models/user.repository';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { createAuthRoutes } from './routes/auth.routes';

export const createApp = async (): Promise<Application> => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(createRequestLogger());

  // Health check
  app.get('/health', createHealthHandler(
    config.SERVICE_NAME,
    async () => ({
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth()
    })
  ));

  // Initialize dependencies
  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  // Routes
  app.use('/auth', createAuthRoutes(authController));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting auth service...');

    // Connect to databases
    await initDatabase();
    await connectRedis();

    // Create and start app
    const app = await createApp();
    const port = parseInt(config.PORT);

    const server = app.listen(port, () => {
      logger.info(`Auth service listening on port ${port}`, {
        service: config.SERVICE_NAME,
        port,
        nodeEnv: config.NODE_ENV
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
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};
