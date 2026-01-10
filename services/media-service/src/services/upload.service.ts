import { ValidationError, logger, createEventBase, UserAvatarUploadedEvent } from 'service-common';
import { imageQueue } from '../config/queue';
import { minioClient } from '../config/minio';
import { config } from '../config/env';
import { UploadJobData, UploadResponse, JobStatusResponse, ProcessedImageData } from '../models/upload.model';
import { Readable } from 'stream';
import { eventEmitter } from '../config/redis';

export class UploadService {
  private allowedMimeTypes: string[];
  private maxFileSize: number;

  constructor() {
    this.allowedMimeTypes = config.ALLOWED_MIME_TYPES.split(',');
    this.maxFileSize = parseInt(config.MAX_FILE_SIZE);
  }

  async uploadAvatar(
    userId: number,
    file: Express.Multer.File
  ): Promise<UploadResponse> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `avatars/${userId}/${timestamp}-${file.originalname}`;

    // Upload original file to MinIO
    await this.uploadToMinIO(fileName, file.buffer, file.mimetype);

    logger.info('File uploaded to MinIO', {
      userId,
      fileName,
      size: file.size
    });

    // Create background job for processing
    const jobData: UploadJobData = {
      userId,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };

    const job = await imageQueue.add('process-avatar', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });

    logger.info('Image processing job created', {
      jobId: job.id,
      userId,
      fileName
    });

    // Emit avatar uploaded event
    await this.emitAvatarUploadedEvent(userId, job.id!, fileName);

    return {
      jobId: job.id!,
      message: 'Upload successful, processing in background',
      fileName
    };
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const job = await imageQueue.getJob(jobId);

    if (!job) {
      throw new ValidationError('Job not found');
    }

    const state = await job.getState();
    const progress = job.progress;

    const response: JobStatusResponse = {
      jobId,
      status: state as any,
      progress: typeof progress === 'number' ? progress : undefined,
      createdAt: new Date(job.timestamp)
    };

    if (state === 'completed' && job.returnvalue) {
      response.result = job.returnvalue as ProcessedImageData;
      response.processedAt = job.finishedOn ? new Date(job.finishedOn) : undefined;
    }

    if (state === 'failed' && job.failedReason) {
      response.error = job.failedReason;
    }

    return response;
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new ValidationError('No file provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new ValidationError(
        `File too large. Max size: ${this.maxFileSize / 1024 / 1024}MB`
      );
    }
  }

  private async uploadToMinIO(
    fileName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    const stream = Readable.from(buffer);
    
    await minioClient.putObject(
      config.MINIO_BUCKET,
      fileName,
      stream,
      buffer.length,
      {
        'Content-Type': contentType
      }
    );
  }

  private async emitAvatarUploadedEvent(
    userId: number,
    jobId: string,
    fileName: string
  ): Promise<void> {
    try {
      const event: UserAvatarUploadedEvent = {
        ...createEventBase('user.avatar.uploaded'),
        eventType: 'user.avatar.uploaded',
        data: {
          userId,
          jobId,
          fileName,
          uploadedAt: new Date().toISOString()
        }
      };

      await eventEmitter.emit(event);

      logger.info('Avatar uploaded event emitted', {
        userId,
        jobId,
        eventId: event.eventId
      });
    } catch (error) {
      logger.error('Failed to emit avatar uploaded event', {
        error,
        userId,
        jobId
      });
      // Don't throw - event emission failure shouldn't break the upload
    }
  }
}
