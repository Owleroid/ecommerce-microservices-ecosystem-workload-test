import { EventSubscriber, UserAvatarProcessedEvent, logger } from 'service-common';
import { config } from '../config/env';
import { ProfileRepository } from '../models/profile.repository';

const redisUrl = config.REDIS_PASSWORD 
  ? `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`
  : `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;

export const eventSubscriber = new EventSubscriber(redisUrl);

export const connectEventSubscriber = async (
  profileRepository: ProfileRepository
): Promise<void> => {
  await eventSubscriber.connect();

  // Subscribe to avatar processed events
  await eventSubscriber.subscribe<UserAvatarProcessedEvent>(
    'user.avatar.processed',
    async (event) => {
      logger.info('Received avatar processed event', {
        eventId: event.eventId,
        userId: event.data.userId,
        status: event.data.status
      });

      // Update user profile with new avatar URL if processing succeeded
      if (event.data.status === 'completed' && event.data.originalUrl) {
        try {
          await profileRepository.update(event.data.userId, {
            avatar_url: event.data.originalUrl
          });

          logger.info('Profile avatar URL updated', {
            userId: event.data.userId,
            avatarUrl: event.data.originalUrl
          });
        } catch (error) {
          logger.error('Failed to update profile avatar URL', {
            error,
            userId: event.data.userId,
            eventId: event.eventId
          });
        }
      } else if (event.data.status === 'failed') {
        logger.warn('Avatar processing failed for user', {
          userId: event.data.userId,
          error: event.data.error,
          jobId: event.data.jobId
        });
      }
    }
  );

  logger.info('Event subscriber connected and listening for events');
};

export const disconnectEventSubscriber = async (): Promise<void> => {
  await eventSubscriber.disconnect();
};
