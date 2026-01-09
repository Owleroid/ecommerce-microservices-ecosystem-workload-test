import { Pool } from 'pg';
import { logger } from 'service-common';
import { config } from '../config/env';

export const pool = new Pool({
  host: config.DB_HOST,
  port: parseInt(config.DB_PORT),
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('PostgreSQL connected');
});

pool.on('error', (err: Error) => {
  logger.error('PostgreSQL error', { error: err.message });
});

export const initDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    // Create user_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        bio TEXT,
        avatar_url VARCHAR(500),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on user_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)
    `);

    logger.info('Database schema initialized');
  } catch (error) {
    logger.error('Database initialization failed', { error });
    throw error;
  } finally {
    client.release();
  }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error });
    return false;
  }
};
