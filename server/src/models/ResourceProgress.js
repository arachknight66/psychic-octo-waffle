import mongoose from 'mongoose';
const resourceProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });
resourceProgressSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
export default mongoose.model('ResourceProgress', resourceProgressSchema);
