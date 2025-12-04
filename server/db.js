const { Pool } = require('pg');
require('dotenv').config();

// Check if we are in production mode (Render sets this automatically)
const isProduction = process.env.NODE_ENV === 'production';

// Render and Neon provide a single connection string named DATABASE_URL
const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for hosted databases like Neon
      },
    }
  : {
      // Local fallback
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'nexus_chat',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    };

const pool = new Pool(poolConfig);

module.exports = {
  query: (text, params) => pool.query(text, params),
};