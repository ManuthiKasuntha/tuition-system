import { initDatabase, pool } from '../config/db.js';
import { config } from '../config/env.js';

await initDatabase();
console.log(`Database "${config.db.database}" and tables are ready.`);
await pool.end();
