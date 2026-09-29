import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2';
import mysqlPromise from 'mysql2/promise';
import { config } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, '../../../database/schema.sql');

const rawPool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
});

// Keep every connection in UTC so DATETIME/TIMESTAMP values round-trip correctly
rawPool.on('connection', (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

export const pool = rawPool.promise();

/** Creates the database (if missing) and all tables from database/schema.sql. */
export async function initDatabase() {
  const { database, ...serverConfig } = config.db;
  const conn = await mysqlPromise.createConnection({ ...serverConfig, multipleStatements: true });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${database}\``);
    const schema = await fs.readFile(SCHEMA_PATH, 'utf8');
    await conn.query(schema);
  } finally {
    await conn.end();
  }
}
