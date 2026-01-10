import { Queue, QueueEvents } from 'bullmq';
import { logger } from 'service-common';
import { config } from '../config/env';

const connection = {
  host: config.REDIS_HOST,
  port: parseInt(config.REDIS_PORT),
  password: config.REDIS_PASSWORD || undefined
};

export const imageQueue = new Queue('image-processing', { connection });

export const queueEvents = new QueueEvents('image-processing', { connection });

queueEvents.on('completed', ({ jobId }) => {
  logger.info('Job completed', { jobId });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Job failed', { jobId, failedReason });
});

export const checkQueueHealth = async (): Promise<boolean> => {
  try {
    const client = await imageQueue.client;
    await client.ping();
    return true;
  } catch (error) {
    logger.error('Queue health check failed', { error });
    return false;
  }
};
