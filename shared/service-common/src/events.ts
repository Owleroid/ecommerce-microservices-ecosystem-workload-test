import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

// Event type definitions
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
}

export interface UserProfileUpdatedEvent extends BaseEvent {
  eventType: 'user.profile.updated';
  data: {
    userId: number;
    fields: string[];
    profile: {
      firstName?: string | null;
      lastName?: string | null;
      bio?: string | null;
      phone?: string | null;
      avatarUrl?: string | null;
    };
  };
}

export interface UserAvatarUploadedEvent extends BaseEvent {
  eventType: 'user.avatar.uploaded';
  data: {
    userId: number;
    jobId: string;
    fileName: string;
    uploadedAt: string;
  };
}

export interface UserAvatarProcessedEvent extends BaseEvent {
  eventType: 'user.avatar.processed';
  data: {
    userId: number;
    jobId: string;
    originalUrl: string;
    thumbnailUrl: string;
    status: 'completed' | 'failed';
    error?: string;
  };
}

export type DomainEvent = 
  | UserProfileUpdatedEvent 
  | UserAvatarUploadedEvent 
  | UserAvatarProcessedEvent;

// Event emitter
export class EventEmitter {
  private publisher: RedisClientType;
  private isConnected: boolean = false;

  constructor(redisUrl: string) {
    this.publisher = createClient({ url: redisUrl });
    
    this.publisher.on('error', (err) => {
      logger.error('Event emitter Redis error', { error: err });
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    await this.publisher.connect();
    this.isConnected = true;
    logger.info('Event emitter connected to Redis');
  }

  async emit(event: DomainEvent): Promise<void> {
    try {
      const channel = event.eventType;
      const message = JSON.stringify(event);
      
      await this.publisher.publish(channel, message);
      
      logger.info('Event emitted', {
        eventType: event.eventType,
        eventId: event.eventId
      });
    } catch (error) {
      logger.error('Failed to emit event', {
        eventType: event.eventType,
        error
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    
    await this.publisher.quit();
    this.isConnected = false;
    logger.info('Event emitter disconnected from Redis');
  }
}

// Event subscriber
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export class EventSubscriber {
  private subscriber: RedisClientType;
  private isConnected: boolean = false;
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor(redisUrl: string) {
    this.subscriber = createClient({ url: redisUrl });
    
    this.subscriber.on('error', (err) => {
      logger.error('Event subscriber Redis error', { error: err });
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    await this.subscriber.connect();
    this.isConnected = true;
    logger.info('Event subscriber connected to Redis');
  }

  async subscribe<T extends DomainEvent>(
    eventType: T['eventType'],
    handler: EventHandler<T>
  ): Promise<void> {
    // Store handler
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);

    // Subscribe to Redis channel
    await this.subscriber.subscribe(eventType, async (message) => {
      try {
        const event = JSON.parse(message) as T;
        
        logger.info('Event received', {
          eventType: event.eventType,
          eventId: event.eventId
        });

        // Execute all handlers for this event type
        const eventHandlers = this.handlers.get(eventType) || [];
        await Promise.all(
          eventHandlers.map(h => Promise.resolve(h(event)))
        );
      } catch (error) {
        logger.error('Failed to handle event', {
          eventType,
          error,
          message
        });
      }
    });

    logger.info('Subscribed to event', { eventType });
  }

  async unsubscribe(eventType: string): Promise<void> {
    await this.subscriber.unsubscribe(eventType);
    this.handlers.delete(eventType);
    logger.info('Unsubscribed from event', { eventType });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    
    // Unsubscribe from all channels
    for (const eventType of this.handlers.keys()) {
      await this.subscriber.unsubscribe(eventType);
    }
    
    this.handlers.clear();
    await this.subscriber.quit();
    this.isConnected = false;
    logger.info('Event subscriber disconnected from Redis');
  }
}

// Helper function to generate event ID
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Helper function to create event base
export function createEventBase(eventType: string): BaseEvent {
  return {
    eventId: generateEventId(),
    eventType,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
}
