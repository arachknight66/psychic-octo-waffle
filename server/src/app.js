import express from 'express';
import cors from 'cors';
import api from './routes/api.js';

const app = express();
const allowedClientOrigins = new Set([
  ...(process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  'http://localhost:5174'
]);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedClientOrigins.has(origin)) return callback(null, true);
  callback(new Error('Origin not allowed by CORS'));
} }));
app.use(express.json({ limit: '64kb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'learning-api' }));
app.use('/api', api);
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  res.status(500).json({ message: 'The request could not be completed. Check that the database is running and try again.' });
});
export default app;
