import { logger } from './logger';

interface EnvConfig {
  [key: string]: {
    required: boolean;
    default?: string;
  };
}

export const validateEnv = (config: EnvConfig): Record<string, string> => {
  const errors: string[] = [];
  const result: Record<string, string> = {};

  for (const [key, options] of Object.entries(config)) {
    const value = process.env[key];

    if (!value && options.required && !options.default) {
      errors.push(`Missing required environment variable: ${key}`);
    } else {
      result[key] = value || options.default || '';
    }
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed', { errors });
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result;
};
