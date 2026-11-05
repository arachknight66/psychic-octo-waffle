import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import api from './routes/api.js';

const app = express();
const allowedClientOrigins = new Set([
  ...(process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean),
  'http://localhost:5174'
]);
app.use(cors({ origin: (origin, callback) => {
  const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(Boolean).map((host) => `https://${host}`);
  if (!origin || allowedClientOrigins.has(origin) || vercelOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Origin not allowed by CORS'));
} }));
app.use(express.json({ limit: '64kb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'learning-api' }));
let databaseConnection;
app.use('/api', async (_req, res, next) => {
  if (!process.env.VERCEL) return next();
  if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'The API is not configured. Set JWT_SECRET in the deployment environment.' });
  if (!process.env.MONGODB_URI) return res.status(503).json({ message: 'The learning database is not configured. Set MONGODB_URI in the deployment environment.' });
  if (mongoose.connection.readyState === 1) return next();
  try {
    if (!databaseConnection) {
      databaseConnection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
        .catch((error) => { databaseConnection = null; throw error; });
    }
    await databaseConnection;
    next();
  } catch (error) {
    console.error(`Could not connect to MongoDB: ${error.message}`);
    res.status(503).json({ message: 'The learning database is unavailable. Configure MONGODB_URI and try again.' });
  }
});
app.use('/api', api);
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  res.status(500).json({ message: 'The request could not be completed. Check that the database is running and try again.' });
});
export default app;
