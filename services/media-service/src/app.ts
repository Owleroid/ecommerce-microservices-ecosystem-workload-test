import express, { Application } from 'express';
import { 
  logger, 
  createRequestLogger, 
  errorHandler, 
  notFoundHandler,
  createHealthHandler 
} from 'service-common';
import { config } from './config/env';
import { initMinIO, checkMinIOHealth } from './config/minio';
import { connectRedis, checkRedisHealth, connectEventEmitter, disconnectEventEmitter } from './config/redis';
import { checkQueueHealth } from './config/queue';
import { UploadService } from './services/upload.service';
import { UploadController } from './controllers/upload.controller';
import { createUploadRoutes } from './routes/upload.routes';
import { createImageWorker } from './workers/image-processor';

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
      redis: await checkRedisHealth(),
      minio: await checkMinIOHealth(),
      queue: await checkQueueHealth()
    })
  ));

  // Initialize dependencies
  const uploadService = new UploadService();
  const uploadController = new UploadController(uploadService);

  // Routes
  app.use('/media', createUploadRoutes(uploadController));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting media service...');

    // Connect to infrastructure
    await connectRedis();
    await connectEventEmitter();
    await initMinIO();

    // Start background worker
    const worker = createImageWorker();
    logger.info('Image processing worker started');

    // Create and start app
    const app = await createApp();
    const port = parseInt(config.PORT);

    const server = app.listen(port, () => {
      logger.info(`Media service listening on port ${port}`, {
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
          await worker.close();
          logger.info('Worker closed');
          await disconnectEventEmitter();
          logger.info('Event emitter disconnected');
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
