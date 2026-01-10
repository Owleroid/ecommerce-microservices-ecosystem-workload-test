import { Worker, Job } from 'bullmq';
import sharp from 'sharp';
import { minioClient } from '../config/minio';
import { config } from '../config/env';
import { logger, createEventBase, UserAvatarProcessedEvent } from 'service-common';
import { UploadJobData, ProcessedImageData } from '../models/upload.model';
import { Readable } from 'stream';
import { eventEmitter } from '../config/redis';

const connection = {
  host: config.REDIS_HOST,
  port: parseInt(config.REDIS_PORT),
  password: config.REDIS_PASSWORD || undefined
};

export const createImageWorker = (): Worker => {
  const worker = new Worker(
    'image-processing',
    async (job: Job<UploadJobData>) => {
      logger.info('Processing image job', {
        jobId: job.id,
        fileName: job.data.fileName
      });

      try {
        // Download original image from MinIO
        const originalBuffer = await downloadFromMinIO(job.data.fileName);

        // Update progress
        await job.updateProgress(20);

        // Get image metadata
        const metadata = await sharp(originalBuffer).metadata();
        logger.info('Image metadata extracted', {
          jobId: job.id,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });

        await job.updateProgress(40);

        // Process image (resize, optimize)
        const processedBuffer = await sharp(originalBuffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        await job.updateProgress(60);

        // Create thumbnail
        const thumbnailBuffer = await sharp(originalBuffer)
          .resize(150, 150, {
            fit: 'cover'
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        await job.updateProgress(70);

        // Upload processed images back to MinIO
        const processedFileName = job.data.fileName.replace(
          /\.(jpg|jpeg|png|gif|webp)$/i,
          '-processed.jpg'
        );
        const thumbnailFileName = job.data.fileName.replace(
          /\.(jpg|jpeg|png|gif|webp)$/i,
          '-thumb.jpg'
        );

        await uploadToMinIO(processedFileName, processedBuffer, 'image/jpeg');
        await uploadToMinIO(thumbnailFileName, thumbnailBuffer, 'image/jpeg');

        await job.updateProgress(90);

        // Generate URLs
        const minioEndpoint = config.MINIO_USE_SSL === 'true' 
          ? `https://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`
          : `http://${config.MINIO_ENDPOINT}:${config.MINIO_PORT}`;

        const result: ProcessedImageData = {
          originalUrl: `${minioEndpoint}/${config.MINIO_BUCKET}/${processedFileName}`,
          thumbnailUrl: `${minioEndpoint}/${config.MINIO_BUCKET}/${thumbnailFileName}`,
          width: metadata.width || 0,
          height: metadata.height || 0,
          size: processedBuffer.length
        };

        await job.updateProgress(100);

        logger.info('Image processing completed', {
          jobId: job.id,
          result
        });

        // Emit avatar processed event
        await emitAvatarProcessedEvent(job.data.userId, job.id!, result, 'completed');

        return result;
      } catch (error) {
        logger.error('Image processing failed', {
          jobId: job.id,
          error
        });

        // Emit avatar processed event with failure
        await emitAvatarProcessedEvent(
          job.data.userId,
          job.id!,
          undefined,
          'failed',
          error instanceof Error ? error.message : 'Unknown error'
        );

        throw error;
      }
    },
    { connection }
  );

  worker.on('completed', (job) => {
    logger.info('Worker completed job', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('Worker failed job', {
      jobId: job?.id,
      error: err.message
    });
  });

  return worker;
};

async function downloadFromMinIO(fileName: string): Promise<Buffer> {
  const stream = await minioClient.getObject(config.MINIO_BUCKET, fileName);
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function uploadToMinIO(
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

async function emitAvatarProcessedEvent(
  userId: number,
  jobId: string,
  result: ProcessedImageData | undefined,
  status: 'completed' | 'failed',
  error?: string
): Promise<void> {
  try {
    const event: UserAvatarProcessedEvent = {
      ...createEventBase('user.avatar.processed'),
      eventType: 'user.avatar.processed',
      data: {
        userId,
        jobId,
        originalUrl: result?.originalUrl || '',
        thumbnailUrl: result?.thumbnailUrl || '',
        status,
        error
      }
    };

    await eventEmitter.emit(event);

    logger.info('Avatar processed event emitted', {
      userId,
      jobId,
      status,
      eventId: event.eventId
    });
  } catch (error) {
    logger.error('Failed to emit avatar processed event', {
      error,
      userId,
      jobId
    });
    // Don't throw - event emission failure shouldn't break the processing
  }
}
