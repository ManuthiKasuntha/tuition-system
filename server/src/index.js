import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { initDatabaseWithRetry } from './config/db.js';
import { config } from './config/env.js';
import { MAX_FILE_MB } from './middleware/upload.js';
import routes from './routes/index.js';

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? `File is too large (max ${MAX_FILE_MB} MB)` : err.message;
    return res.status(400).json({ message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? 'Something went wrong on the server' : err.message,
    errors: err.errors,
  });
});

try {
  await initDatabaseWithRetry();
  console.log(`Connected to MySQL database "${config.db.database}"`);
} catch (err) {
  console.error('\nCould not set up the MySQL database:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('-> Check DB_USER and DB_PASSWORD in server/.env');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('-> Is the MySQL service running on', `${config.db.host}:${config.db.port}?`);
  }
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`API running at http://localhost:${config.port}/api`);
});
