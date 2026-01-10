import { validateEnv } from 'service-common';

export const config = validateEnv({
  SERVICE_NAME: { required: true, default: 'user-service' },
  PORT: { required: true, default: '3002' },
  NODE_ENV: { required: true, default: 'development' },
  
  JWT_SECRET: { required: true },
  
  DB_HOST: { required: true },
  DB_PORT: { required: true, default: '5432' },
  DB_NAME: { required: true },
  DB_USER: { required: true },
  DB_PASSWORD: { required: true },
  
  REDIS_HOST: { required: true },
  REDIS_PORT: { required: true, default: '6379' },
  REDIS_PASSWORD: { required: false, default: '' },
  
  CACHE_TTL: { required: false, default: '300' }
});
