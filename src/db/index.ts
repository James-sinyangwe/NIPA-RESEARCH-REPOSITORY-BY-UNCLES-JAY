import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pkg;

// Helper to sanitize environment variables by trimming and stripping outer quotes
const cleanEnvValue = (val: string | undefined): string | undefined => {
  if (!val) return val;
  let s = val.trim();
  // Strip double quotes
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1);
  }
  // Strip single quotes
  else if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return s;
};

// Log connection diagnostics to help debug server-side environment loading
const hostVal = cleanEnvValue(process.env.SQL_HOST);
const portVal = cleanEnvValue(process.env.SQL_PORT);
const dbVal = cleanEnvValue(process.env.SQL_DB_NAME);
const userVal = cleanEnvValue(process.env.SQL_USER);
const passwordVal = cleanEnvValue(process.env.SQL_PASSWORD);

console.log('=== DATABASE CONNECTION CONFIGURATION DIAGNOSTICS ===');
console.log(`SQL_HOST: ${hostVal ? `DETECTED (length: ${hostVal.length}, starts with quote: ${hostVal.startsWith('"') || hostVal.startsWith("'")})` : 'NOT DETECTED (undefined)'}`);
console.log(`SQL_PORT: ${portVal ? `DETECTED (value: ${portVal})` : 'NOT DETECTED (using default: 5432)'}`);
console.log(`SQL_DB_NAME: ${dbVal ? `DETECTED (length: ${dbVal.length}, starts with quote: ${dbVal.startsWith('"') || dbVal.startsWith("'")})` : 'NOT DETECTED (undefined)'}`);
console.log(`SQL_USER: ${userVal ? `DETECTED (length: ${userVal.length}, starts with quote: ${userVal.startsWith('"') || userVal.startsWith("'")})` : 'NOT DETECTED (undefined)'}`);
console.log(`SQL_PASSWORD: ${passwordVal ? `DETECTED (length: ${passwordVal.length}, starts with quote: ${passwordVal.startsWith('"') || passwordVal.startsWith("'")})` : 'NOT DETECTED (undefined)'}`);
console.log('=====================================================');

if (!passwordVal) {
  console.warn('⚠️ WARNING: SQL_PASSWORD is undefined or empty! This will cause "client password must be a string" errors on SCRAM/SASL database connections.');
}

// Function to create a new connection pool.
export const createPool = () => {
  const port = portVal ? parseInt(portVal, 10) : 5432;
  const useSsl = cleanEnvValue(process.env.SQL_SSL) === 'true';

  return new Pool({
    host: hostVal,
    port: port,
    user: userVal,
    password: passwordVal,
    database: dbVal,
    connectionTimeoutMillis: 15000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
