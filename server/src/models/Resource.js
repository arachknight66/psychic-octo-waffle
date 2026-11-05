import mongoose from 'mongoose';
const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true }, subject: { type: String, required: true }, topic: { type: String, required: true },
  kind: { type: String, enum: ['Guide', 'Video', 'Practice'], required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  duration: { type: String, required: true }, description: { type: String, required: true }, content: { type: String, required: true },
  accent: { type: String, default: 'blue' }
}, { timestamps: true });
resourceSchema.index({ topic: 1, level: 1 });
export default mongoose.model('Resource', resourceSchema);
