import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL is not set in .env file!');
  console.error('👉 Please configure DATABASE_URL in BE/.env with your Neon connection string.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function runMigration() {
  console.log('🔄 Connecting to Neon PostgreSQL...');
  const client = await pool.connect();
  try {
    const migrationPath = path.resolve(__dirname, '../migrations/001_create_applications.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🚀 Executing migration: 001_create_applications.sql...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully! Table "applications" is ready.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
