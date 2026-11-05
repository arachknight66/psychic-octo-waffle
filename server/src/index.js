import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const port = Number(process.env.PORT || process.env.API_PORT || 4000);
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/learning_demo', { serverSelectionTimeoutMS: 5000 });
  app.listen(port, '0.0.0.0', () => console.log(`Learning API listening on port ${port}`));
} catch (error) {
  console.error(`Could not connect to MongoDB: ${error.message}`);
  console.error('Start MongoDB, then run npm run dev again. See README.md for setup.');
  process.exit(1);
}
