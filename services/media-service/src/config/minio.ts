import { Client } from 'minio';
import { logger } from 'service-common';
import { config } from '../config/env';

export const minioClient = new Client({
  endPoint: config.MINIO_ENDPOINT,
  port: parseInt(config.MINIO_PORT),
  useSSL: config.MINIO_USE_SSL === 'true',
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY
});

export const initMinIO = async (): Promise<void> => {
  try {
    const bucketName = config.MINIO_BUCKET;
    const bucketExists = await minioClient.bucketExists(bucketName);
    
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      logger.info('MinIO bucket created', { bucket: bucketName });
      
      // Set bucket policy to allow public read access for avatars
      const policy = {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }]
      };
      
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      logger.info('MinIO bucket policy set', { bucket: bucketName });
    } else {
      logger.info('MinIO bucket already exists', { bucket: bucketName });
    }
  } catch (error) {
    logger.error('MinIO initialization failed', { error });
    throw error;
  }
};

export const checkMinIOHealth = async (): Promise<boolean> => {
  try {
    await minioClient.bucketExists(config.MINIO_BUCKET);
    return true;
  } catch (error) {
    logger.error('MinIO health check failed', { error });
    return false;
  }
};
