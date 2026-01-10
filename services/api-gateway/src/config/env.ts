import { validateEnv } from 'service-common';

export const config = validateEnv({
  SERVICE_NAME: { required: true, default: 'api-gateway' },
  PORT: { required: true, default: '3000' },
  NODE_ENV: { required: true, default: 'development' },
  
  // Service URLs
  AUTH_SERVICE_URL: { required: true, default: 'http://localhost:3001' },
  USER_SERVICE_URL: { required: true, default: 'http://localhost:3002' },
  MEDIA_SERVICE_URL: { required: true, default: 'http://localhost:3003' },
  
  // Redis for rate limiting
  REDIS_HOST: { required: true },
  REDIS_PORT: { required: true, default: '6379' },
  REDIS_PASSWORD: { required: false, default: '' },
  
  // Rate limiting config
  RATE_LIMIT_WINDOW_MS: { required: false, default: '60000' }, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: { required: false, default: '100' } // 100 requests per window
});
