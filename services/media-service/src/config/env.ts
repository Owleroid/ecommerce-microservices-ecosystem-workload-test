import { validateEnv } from 'service-common';

export const config = validateEnv({
  SERVICE_NAME: { required: true, default: 'media-service' },
  PORT: { required: true, default: '3003' },
  NODE_ENV: { required: true, default: 'development' },
  
  JWT_SECRET: { required: true },
  
  REDIS_HOST: { required: true },
  REDIS_PORT: { required: true, default: '6379' },
  REDIS_PASSWORD: { required: false, default: '' },
  
  MINIO_ENDPOINT: { required: true },
  MINIO_PORT: { required: true, default: '9000' },
  MINIO_ACCESS_KEY: { required: true },
  MINIO_SECRET_KEY: { required: true },
  MINIO_USE_SSL: { required: false, default: 'false' },
  MINIO_BUCKET: { required: true, default: 'avatars' },
  
  MAX_FILE_SIZE: { required: false, default: '5242880' }, // 5MB
  ALLOWED_MIME_TYPES: { required: false, default: 'image/jpeg,image/png,image/gif,image/webp' }
});
