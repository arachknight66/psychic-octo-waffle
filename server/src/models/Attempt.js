import mongoose from 'mongoose';
const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  topic: { type: String, required: true }, difficulty: { type: String, required: true },
  score: { type: Number, required: true }, total: { type: Number, required: true }, accuracy: { type: Number, required: true },
  answers: [{ type: Number }]
}, { timestamps: true });
attemptSchema.index({ userId: 1, topic: 1, createdAt: -1 });
export default mongoose.model('Attempt', attemptSchema);
