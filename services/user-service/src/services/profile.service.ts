import { NotFoundError, logger, createEventBase, UserProfileUpdatedEvent } from 'service-common';
import { ProfileRepository } from '../models/profile.repository';
import { UserProfile, UpdateProfileDto, ProfileResponse } from '../models/profile.model';
import { redisClient, eventEmitter } from '../config/redis';
import { config } from '../config/env';

const CACHE_PREFIX = 'user_profile:';
const CACHE_TTL = parseInt(config.CACHE_TTL);

export class ProfileService {
  constructor(private profileRepository: ProfileRepository) {}

  async getProfile(userId: number): Promise<ProfileResponse> {
    // Try cache first
    const cached = await this.getCachedProfile(userId);
    if (cached) {
      logger.info('Profile cache hit', { userId });
      return cached;
    }

    logger.info('Profile cache miss', { userId });

    // Get from database
    let profile = await this.profileRepository.findByUserId(userId);

    // Create profile if doesn't exist
    if (!profile) {
      profile = await this.profileRepository.create(userId);
    }

    const response = this.toProfileResponse(profile);

    // Cache the result
    await this.cacheProfile(userId, response);

    return response;
  }

  async updateProfile(userId: number, data: UpdateProfileDto): Promise<ProfileResponse> {
    // Validate data
    this.validateUpdateData(data);

    // Get or create profile
    let profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      profile = await this.profileRepository.create(userId);
    }

    // Update profile
    const updatedProfile = await this.profileRepository.update(userId, data);
    if (!updatedProfile) {
      throw new NotFoundError('Profile not found');
    }

    const response = this.toProfileResponse(updatedProfile);

    // Invalidate cache
    await this.invalidateCache(userId);

    // Cache the updated profile
    await this.cacheProfile(userId, response);

    logger.info('Profile updated', { userId, fields: Object.keys(data) });

    // Emit profile updated event
    await this.emitProfileUpdatedEvent(userId, data, response);

    return response;
  }

  private validateUpdateData(data: UpdateProfileDto): void {
    if (data.first_name !== undefined && data.first_name.length > 100) {
      throw new Error('First name too long (max 100 characters)');
    }
    if (data.last_name !== undefined && data.last_name.length > 100) {
      throw new Error('Last name too long (max 100 characters)');
    }
    if (data.bio !== undefined && data.bio.length > 1000) {
      throw new Error('Bio too long (max 1000 characters)');
    }
    if (data.phone !== undefined && data.phone.length > 20) {
      throw new Error('Phone too long (max 20 characters)');
    }
  }

  private toProfileResponse(profile: UserProfile): ProfileResponse {
    return {
      id: profile.id,
      userId: profile.user_id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      phone: profile.phone,
      createdAt: profile.created_at.toISOString(),
      updatedAt: profile.updated_at.toISOString()
    };
  }

  private async getCachedProfile(userId: number): Promise<ProfileResponse | null> {
    try {
      const cached = await redisClient.get(`${CACHE_PREFIX}${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.error('Cache get failed', { error, userId });
      return null;
    }
  }

  private async cacheProfile(userId: number, profile: ProfileResponse): Promise<void> {
    try {
      await redisClient.setEx(
        `${CACHE_PREFIX}${userId}`,
        CACHE_TTL,
        JSON.stringify(profile)
      );
    } catch (error) {
      logger.error('Cache set failed', { error, userId });
    }
  }

  private async invalidateCache(userId: number): Promise<void> {
    try {
      await redisClient.del(`${CACHE_PREFIX}${userId}`);
    } catch (error) {
      logger.error('Cache invalidation failed', { error, userId });
    }
  }

  private async emitProfileUpdatedEvent(
    userId: number,
    updatedFields: UpdateProfileDto,
    profile: ProfileResponse
  ): Promise<void> {
    try {
      const event: UserProfileUpdatedEvent = {
        ...createEventBase('user.profile.updated'),
        eventType: 'user.profile.updated',
        data: {
          userId,
          fields: Object.keys(updatedFields),
          profile: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            bio: profile.bio,
            phone: profile.phone,
            avatarUrl: profile.avatarUrl
          }
        }
      };

      await eventEmitter.emit(event);

      logger.info('Profile updated event emitted', {
        userId,
        eventId: event.eventId
      });
    } catch (error) {
      logger.error('Failed to emit profile updated event', {
        error,
        userId
      });
      // Don't throw - event emission failure shouldn't break the update
    }
  }
}
