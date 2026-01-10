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
import { connectRedis, checkRedisHealth, redisClient, connectEventEmitter, disconnectEventEmitter } from './config/redis';
import { connectEventSubscriber, disconnectEventSubscriber } from './config/events';
import { ProfileRepository } from './models/profile.repository';
import { ProfileService } from './services/profile.service';
import { ProfileController } from './controllers/profile.controller';
import { createProfileRoutes } from './routes/profile.routes';

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
  const profileRepository = new ProfileRepository();
  const profileService = new ProfileService(profileRepository);
  const profileController = new ProfileController(profileService);

  // Routes
  app.use('/users', createProfileRoutes(profileController));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting user service...');

    // Connect to databases
    await initDatabase();
    await connectRedis();
    await connectEventEmitter();

    // Initialize dependencies
    const profileRepository = new ProfileRepository();
    
    // Connect event subscriber
    await connectEventSubscriber(profileRepository);

    // Create and start app
    const app = await createApp();
    const port = parseInt(config.PORT);

    const server = app.listen(port, () => {
      logger.info(`User service listening on port ${port}`, {
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
          await disconnectEventSubscriber();
          await disconnectEventEmitter();
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
