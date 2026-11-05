import mongoose from 'mongoose';
const questionSchema = new mongoose.Schema({ prompt: String, options: [String], answerIndex: Number, explanation: String }, { _id: false });
const quizSchema = new mongoose.Schema({
  title: { type: String, required: true }, subject: { type: String, required: true }, topic: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true }, questions: [questionSchema]
}, { timestamps: true });
quizSchema.index({ topic: 1, difficulty: 1 });
export default mongoose.model('Quiz', quizSchema);
