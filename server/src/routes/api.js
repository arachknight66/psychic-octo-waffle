import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Resource from '../models/Resource.js';
import Quiz from '../models/Quiz.js';
import Attempt from '../models/Attempt.js';
import ResourceProgress from '../models/ResourceProgress.js';
import { requireAuth } from '../middleware/auth.js';
import { getRecommendations, recommendedLevel } from '../services/recommendations.js';

const router = Router();
const tokenFor = (user) => jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET || 'local-demo-only-change-this-secret', { expiresIn: '7d' });
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, studyGoalMinutes: user.studyGoalMinutes ?? 20, preferredTopics: user.preferredTopics || [] });

router.post('/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Enter a name between 2 and 80 characters.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Use a password with at least 8 characters.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try { const user = await User.findById(req.userId).select('name email studyGoalMinutes preferredTopics'); if (!user) return res.status(404).json({ message: 'Account not found.' }); res.json({ user: publicUser(user) }); }
  catch (error) { next(error); }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    const name = req.body.name === undefined ? user.name : String(req.body.name).trim();
    const email = req.body.email === undefined ? user.email : String(req.body.email).trim().toLowerCase();
    const studyGoalMinutes = req.body.studyGoalMinutes === undefined ? user.studyGoalMinutes : Number(req.body.studyGoalMinutes);
    const preferredTopics = req.body.preferredTopics === undefined ? user.preferredTopics : req.body.preferredTopics;
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Enter a name between 2 and 80 characters.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!Number.isInteger(studyGoalMinutes) || studyGoalMinutes < 5 || studyGoalMinutes > 180) return res.status(400).json({ message: 'Choose a daily study goal from 5 to 180 minutes.' });
    if (!Array.isArray(preferredTopics) || preferredTopics.length > 12 || preferredTopics.some((topic) => typeof topic !== 'string' || topic.length > 80)) return res.status(400).json({ message: 'Choose up to 12 valid topics.' });
    if (email !== user.email && await User.exists({ email, _id: { $ne: user._id } })) return res.status(409).json({ message: 'That email address is already in use.' });
    if (req.body.newPassword !== undefined) {
      const currentPassword = String(req.body.currentPassword || '');
      const newPassword = String(req.body.newPassword || '');
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ message: 'Your current password is incorrect.' });
      if (newPassword.length < 8) return res.status(400).json({ message: 'Use a new password with at least 8 characters.' });
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    user.name = name;
    user.email = email;
    user.studyGoalMinutes = studyGoalMinutes;
    user.preferredTopics = [...new Set(preferredTopics.map((topic) => topic.trim()).filter(Boolean))];
    await user.save();
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/resources', requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.topic) filter.topic = String(req.query.topic);
    if (req.query.subject) filter.subject = String(req.query.subject);
    const resources = await Resource.find(filter).sort({ subject: 1, topic: 1, level: 1 }).lean();
    res.json({ resources: resources.map(({ exercise, ...resource }) => ({
      ...resource,
      ...(exercise ? { exercise: { prompt: exercise.prompt, options: exercise.options } } : {})
    })) });
  } catch (error) { next(error); }
});

router.post('/resources/:resourceId/check', requireAuth, async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.resourceId).select('exercise').lean();
    if (!resource) return res.status(404).json({ message: 'Study resource not found.' });
    const answerIndex = Number(req.body.answerIndex);
    if (!resource.exercise?.options?.length || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= resource.exercise.options.length) {
      return res.status(400).json({ message: 'Choose one of the listed answers.' });
    }
    const correct = answerIndex === resource.exercise.answerIndex;
    res.json({ correct, answer: resource.exercise.options[resource.exercise.answerIndex], explanation: resource.exercise.explanation });
  } catch (error) { next(error); }
});

router.get('/resource-progress', requireAuth, async (req, res, next) => {
  try {
    const completed = await ResourceProgress.find({ userId: req.userId }).select('resourceId completedAt').lean();
    res.json({ completed: completed.map((entry) => ({ resourceId: String(entry.resourceId), completedAt: entry.completedAt })) });
  } catch (error) { next(error); }
});

router.put('/resources/:resourceId/completion', requireAuth, async (req, res, next) => {
  try {
    if (!await Resource.exists({ _id: req.params.resourceId })) return res.status(404).json({ message: 'Study resource not found.' });
    const completion = await ResourceProgress.findOneAndUpdate(
      { userId: req.userId, resourceId: req.params.resourceId },
      { $set: { completedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ completed: true, completedAt: completion.completedAt });
  } catch (error) { next(error); }
});

router.delete('/resources/:resourceId/completion', requireAuth, async (req, res, next) => {
  try {
    await ResourceProgress.deleteOne({ userId: req.userId, resourceId: req.params.resourceId });
    res.json({ completed: false });
  } catch (error) { next(error); }
});

async function getTopicStats(userId) {
  const [allTopics, attempts] = await Promise.all([
    Quiz.distinct('topic'), Attempt.find({ userId }).sort({ createdAt: -1 }).lean()
  ]);
  return allTopics.map((topic) => {
    const recent = attempts.filter((attempt) => attempt.topic === topic).slice(0, 5);
    const accuracy = recent.length ? Math.round(recent.reduce((sum, item) => sum + item.accuracy, 0) / recent.length) : 0;
    return { topic, accuracy, attempts: recent.length, latestAt: recent[0]?.createdAt || null };
  });
}

router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const [topics, attempts] = await Promise.all([getTopicStats(req.userId), Attempt.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(8).lean()]);
    const completed = attempts.length;
    const overall = completed ? Math.round(attempts.reduce((sum, item) => sum + item.accuracy, 0) / completed) : 0;
    res.json({ topics, recentAttempts: attempts, summary: { quizzesCompleted: completed, overallAccuracy: overall, topicsTracked: topics.length } });
  } catch (error) { next(error); }
});

router.get('/quizzes', requireAuth, async (req, res, next) => {
  try {
    const quizzes = await Quiz.find().lean();
    const topicStats = await getTopicStats(req.userId);
    let topic = String(req.query.topic || '');
    if (!topic) topic = topicStats[0]?.topic || quizzes[0]?.topic;
    if (!topicStats.some((item) => item.topic === topic)) return res.status(404).json({ message: 'No quiz is available for that topic.' });
    const stats = topicStats.find((item) => item.topic === topic);
    const difficulty = ({ Beginner: 'easy', Intermediate: 'medium', Advanced: 'hard' })[recommendedLevel(stats.accuracy)];
    const quiz = quizzes.find((item) => item.topic === topic && item.difficulty === difficulty);
    if (!quiz) return res.status(404).json({ message: 'No quiz is available for that topic and level yet.' });
    res.json({ quiz: { id: quiz._id, title: quiz.title, subject: quiz.subject, topic: quiz.topic, difficulty: quiz.difficulty, questions: quiz.questions.map(({ prompt, options }) => ({ prompt, options })) }, suggestedDifficulty: difficulty, recentAccuracy: stats.accuracy });
  } catch (error) { next(error); }
});

router.post('/quizzes/submit', requireAuth, async (req, res, next) => {
  try {
    const { quizId, answers } = req.body;
    if (!quizId || !Array.isArray(answers)) return res.status(400).json({ message: 'Choose a quiz and answer every question.' });
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    if (answers.length !== quiz.questions.length || answers.some((answer, index) => !Number.isInteger(answer) || answer < 0 || answer >= quiz.questions[index].options.length)) {
      return res.status(400).json({ message: 'Answer every question before submitting.' });
    }
    const score = answers.reduce((count, answer, index) => count + (answer === quiz.questions[index].answerIndex ? 1 : 0), 0);
    const accuracy = Math.round(score / quiz.questions.length * 100);
    const attempt = await Attempt.create({ userId: req.userId, quizId: quiz._id, topic: quiz.topic, difficulty: quiz.difficulty, score, total: quiz.questions.length, accuracy, answers });
    const topicStats = await getTopicStats(req.userId);
    const stats = topicStats.find((item) => item.topic === quiz.topic);
    res.status(201).json({ result: { score, total: quiz.questions.length, accuracy, topic: quiz.topic, difficulty: quiz.difficulty, attemptId: attempt._id, nextDifficulty: recommendedLevel(stats.accuracy) }, explanations: quiz.questions.map((question, index) => ({ correct: answers[index] === question.answerIndex, answer: question.options[question.answerIndex], explanation: question.explanation })) });
  } catch (error) { next(error); }
});

router.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const [topics, resources, user] = await Promise.all([getTopicStats(req.userId), Resource.find().sort({ topic: 1, level: 1 }), User.findById(req.userId).select('preferredTopics')]);
    const result = await getRecommendations(topics, resources);
    const preferredOrder = new Map((user?.preferredTopics || []).map((topic, index) => [topic, index]));
    const recommendations = [...result.items].sort((a, b) => {
      const aOrder = preferredOrder.has(a.topic) ? preferredOrder.get(a.topic) : Number.MAX_SAFE_INTEGER;
      const bOrder = preferredOrder.has(b.topic) ? preferredOrder.get(b.topic) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
    res.json({ recommendations, source: result.source, topics });
  } catch (error) { next(error); }
});

export default router;
