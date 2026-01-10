import { createClient } from 'redis';
import { logger, EventEmitter } from 'service-common';
import { config } from '../config/env';

const redisUrl = config.REDIS_PASSWORD 
  ? `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`
  : `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;

export const redisClient = createClient({
  url: redisUrl
});

redisClient.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

export const connectRedis = async (): Promise<void> => {
  await redisClient.connect();
};

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
};

// Event emitter for publishing events
export const eventEmitter = new EventEmitter(redisUrl);

export const connectEventEmitter = async (): Promise<void> => {
  await eventEmitter.connect();
};

export const disconnectEventEmitter = async (): Promise<void> => {
  await eventEmitter.disconnect();
};
