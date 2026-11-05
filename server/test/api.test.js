import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Resource from '../src/models/Resource.js';
import Quiz from '../src/models/Quiz.js';
import Attempt from '../src/models/Attempt.js';

let mongo;
let token;
let quizId;
before(async () => {
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.RECOMMENDER_URL = 'http://127.0.0.1:1';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri());
  const user = await User.create({ name: 'Demo Student', email: 'student@learnwell.demo', passwordHash: await bcrypt.hash('learnwell123', 4) });
  const quiz = await Quiz.create({ title: 'Python basics check-in', subject: 'Computer science', topic: 'Python basics', difficulty: 'easy', questions: [
    { prompt: 'Which symbol starts a comment?', options: ['//', '#'], answerIndex: 1, explanation: 'Python comments start with #.' },
    { prompt: 'What is 3 + 2?', options: ['5', '32'], answerIndex: 0, explanation: 'Addition gives 5.' }
  ] });
  quizId = quiz._id.toString();
  await Quiz.create({ title: 'Python basics challenge', subject: 'Computer science', topic: 'Python basics', difficulty: 'hard', questions: quiz.questions });
  await Resource.create({ title: 'Python foundations', subject: 'Computer science', topic: 'Python basics', kind: 'Guide', level: 'Beginner', duration: '8 min', description: 'Start with the essentials.', content: 'Variables and comments.', accent: 'blue' });
  await Attempt.create({ userId: user._id, quizId: quiz._id, topic: 'Python basics', difficulty: 'easy', score: 0, total: 2, accuracy: 0, answers: [0, 1] });
  const login = await request(app).post('/api/auth/login').send({ email: 'student@learnwell.demo', password: 'learnwell123' });
  assert.equal(login.status, 200);
  token = login.body.token;
});
after(async () => { await mongoose.disconnect(); await mongo?.stop(); });

test('seeded student can sign in and read profile and learning content', async () => {
  const me = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.name, 'Demo Student');
  const resources = await request(app).get('/api/resources').set('Authorization', `Bearer ${token}`);
  assert.equal(resources.status, 200);
  assert.equal(resources.body.resources[0].topic, 'Python basics');
  const quiz = await request(app).get('/api/quizzes?topic=Python%20basics').set('Authorization', `Bearer ${token}`);
  assert.equal(quiz.status, 200, JSON.stringify(quiz.body));
  assert.equal(quiz.body.quiz.difficulty, 'easy');
  assert.equal('answerIndex' in quiz.body.quiz.questions[0], false);
});

test('invalid credentials are rejected', async () => {
  const response = await request(app).post('/api/auth/login').send({ email: 'student@learnwell.demo', password: 'wrong-password' });
  assert.equal(response.status, 401);
});

test('quiz answers are validated and graded on the server, then progress updates', async () => {
  const incomplete = await request(app).post('/api/quizzes/submit').set('Authorization', `Bearer ${token}`).send({ quizId, answers: [1] });
  assert.equal(incomplete.status, 400);
  const submitted = await request(app).post('/api/quizzes/submit').set('Authorization', `Bearer ${token}`).send({ quizId, answers: [1, 1] });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.result.score, 1);
  assert.equal(submitted.body.result.accuracy, 50);
  const progress = await request(app).get('/api/progress').set('Authorization', `Bearer ${token}`);
  assert.equal(progress.body.summary.quizzesCompleted, 2);
  assert.equal(progress.body.topics[0].accuracy, 25);
});

test('recent strong results raise the next quiz difficulty', async () => {
  for (let index = 0; index < 5; index += 1) {
    const submitted = await request(app).post('/api/quizzes/submit').set('Authorization', `Bearer ${token}`).send({ quizId, answers: [1, 0] });
    assert.equal(submitted.status, 201);
  }
  const nextQuiz = await request(app).get('/api/quizzes?topic=Python%20basics').set('Authorization', `Bearer ${token}`);
  assert.equal(nextQuiz.status, 200);
  assert.equal(nextQuiz.body.quiz.difficulty, 'hard');
});

test('recommendations remain available with a local fallback when Python is offline', async () => {
  const response = await request(app).get('/api/recommendations').set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.source, 'local-fallback');
  assert.match(response.body.recommendations[0].reason, /\d+%/);
});
