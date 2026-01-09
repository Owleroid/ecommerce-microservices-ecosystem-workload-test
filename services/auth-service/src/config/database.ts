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

// Test connection
pool.on('connect', () => {
  logger.info('PostgreSQL connected');
});

pool.on('error', (err: Error) => {
  logger.error('PostgreSQL error', { error: err.message });
});

// Initialize database schema
export const initDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on email for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
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
