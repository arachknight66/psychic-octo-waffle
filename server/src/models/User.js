import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  studyGoalMinutes: { type: Number, min: 5, max: 180, default: 20 },
  preferredTopics: { type: [String], default: [] },
  role: { type: String, enum: ['student'], default: 'student' }
}, { timestamps: true });
export default mongoose.model('User', userSchema);
