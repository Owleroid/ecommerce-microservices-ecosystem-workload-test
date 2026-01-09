import { validateEnv } from 'service-common';

export const config = validateEnv({
  SERVICE_NAME: { required: true, default: 'auth-service' },
  PORT: { required: true, default: '3001' },
  NODE_ENV: { required: true, default: 'development' },
  
  JWT_SECRET: { required: true },
  JWT_EXPIRY: { required: true, default: '1h' },
  REFRESH_TOKEN_EXPIRY: { required: true, default: '7d' },
  
  DB_HOST: { required: true },
  DB_PORT: { required: true, default: '5432' },
  DB_NAME: { required: true },
  DB_USER: { required: true },
  DB_PASSWORD: { required: true },
  
  REDIS_HOST: { required: true },
  REDIS_PORT: { required: true, default: '6379' },
  REDIS_PASSWORD: { required: false, default: '' }
});
