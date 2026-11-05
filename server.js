import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './server/src/app.js';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const clientOutput = path.join(projectRoot, 'client', 'dist');

app.use(express.static(clientOutput, { index: false }));
app.get(['/', '/library/*'], (_req, res, next) => {
  res.sendFile(path.join(clientOutput, 'index.html'), (error) => error && next(error));
});
app.use((req, res) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) return res.status(404).json({ message: 'API endpoint not found.' });
  res.status(404).send('Page not found.');
});

export default app;
