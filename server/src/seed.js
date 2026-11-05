import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Resource from './models/Resource.js';
import Quiz from './models/Quiz.js';
import Attempt from './models/Attempt.js';

const subjects = [
  { subject: 'Computer science', topic: 'Python basics', accent: 'blue', lesson: 'Python is a readable programming language. Variables give names to values, and a function groups reusable steps.' },
  { subject: 'Mathematics', topic: 'Linear equations', accent: 'gold', lesson: 'A linear equation keeps both sides balanced. Apply the same operation to each side to isolate the unknown.' },
  { subject: 'Computer science', topic: 'Database design', accent: 'mint', lesson: 'A relational database organizes information into tables. Normalization reduces repeated data and update errors.' }
];
const levels = ['Beginner', 'Intermediate', 'Advanced'];
const resources = subjects.flatMap(({ subject, topic, accent, lesson }) => levels.flatMap((level, index) => [
  { title: `${topic}: ${['the essentials', 'guided practice', 'challenge set'][index]}`, subject, topic, kind: index === 1 ? 'Practice' : 'Guide', level, duration: `${8 + index * 4} min`, description: `${level} learning material with a short explanation and a practical example.`, content: lesson, accent },
  { title: `${topic}: ${['a quick walkthrough', 'worked examples', 'put it to work'][index]}`, subject, topic, kind: 'Video', level, duration: `${6 + index * 3} min`, description: `A ${level.toLowerCase()} walkthrough followed by a worked example.`, content: lesson, accent }
]));
const questionSets = {
  'Python basics': [
    [
      ['Which symbol starts a comment in Python?', ['//', '#', '<!--', '/*'], 1, 'Python uses # for a single-line comment.'],
      ['What is the value of 3 + 2?', ['5', '32', '6', '23'], 0, 'The plus sign adds the two numbers.'],
      ['Which one is a string?', ['42', 'True', '"hello"', 'None'], 2, 'Text in quotes is a string.']
    ],
    [
      ['What does len("code") return?', ['3', '4', '5', 'code'], 1, 'There are four characters in “code”.'],
      ['Which keyword defines a function?', ['func', 'define', 'def', 'method'], 2, 'Python function definitions begin with def.'],
      ['What is [1, 2][0]?', ['1', '2', '0', '[1, 2]'], 0, 'Lists use zero-based indexing.']
    ],
    [
      ['What does range(2, 5) produce?', ['2, 3, 4', '2, 3, 4, 5', '1, 2, 3, 4', '3, 4, 5'], 0, 'The stop value is excluded from range.'],
      ['Which expression safely checks for an empty list?', ['items == []', 'items is empty', 'empty(items)', 'items.none()'], 0, 'Comparing to an empty list is a common explicit check.'],
      ['What does a return statement do?', ['Repeats a loop', 'Sends a value back from a function', 'Imports a module', 'Prints a value'], 1, 'return provides a function result to its caller.']
    ]
  ],
  'Linear equations': [
    [
      ['Solve x + 3 = 8.', ['4', '5', '11', '24'], 1, 'Subtract 3 from both sides to get x = 5.'],
      ['Which operation undoes multiplication by 4?', ['Add 4', 'Subtract 4', 'Divide by 4', 'Square'], 2, 'Division by 4 reverses multiplication by 4.'],
      ['If y = 2, what is 3y?', ['5', '6', '8', '32'], 1, '3 multiplied by 2 equals 6.']
    ],
    [
      ['Solve 2x + 4 = 12.', ['2', '4', '6', '8'], 1, 'Subtract 4, then divide by 2.'],
      ['If 3x = 21, what is x?', ['6', '7', '18', '24'], 1, 'Divide both sides by 3.'],
      ['Which is equivalent to 4(x + 2)?', ['4x + 2', '4x + 8', 'x + 8', '6x'], 1, 'Distribute 4 to both terms inside the brackets.']
    ],
    [
      ['Solve 5x − 7 = 18.', ['3', '5', '7', '11'], 1, 'Add 7 to get 25, then divide by 5.'],
      ['If 2(x − 3) = 10, what is x?', ['2', '5', '8', '13'], 2, 'Divide by 2, then add 3.'],
      ['Solve 3x + 2 = x + 10.', ['2', '3', '4', '6'], 2, 'Subtract x and 2, then divide by 2.']
    ]
  ],
  'Database design': [
    [
      ['What is a database table made up of?', ['Slides and pages', 'Rows and columns', 'Folders and files', 'Keys and locks'], 1, 'Tables organize records in rows and attributes in columns.'],
      ['What does a primary key identify?', ['A database server', 'A unique row', 'A column type', 'A backup file'], 1, 'A primary key uniquely identifies each row.'],
      ['What is a row also commonly called?', ['Record', 'Field', 'Schema', 'Index'], 0, 'A row stores one record in a table.']
    ],
    [
      ['Why normalize a relational database?', ['Increase repeated data', 'Reduce duplication and update problems', 'Remove all keys', 'Make every table larger'], 1, 'Normalization structures data to reduce redundancy and anomalies.'],
      ['What is a foreign key used for?', ['Compressing a table', 'Linking related tables', 'Encrypting a password', 'Sorting rows'], 1, 'A foreign key references a key in another table.'],
      ['In a one-to-many relationship, where is the foreign key usually placed?', ['On the many side', 'On the one side only', 'In a separate image', 'Nowhere'], 0, 'Each row on the many side can reference its related one-side row.']
    ],
    [
      ['A table is in 2NF when it is in 1NF and which condition holds?', ['Every non-key attribute depends on the whole candidate key', 'There are no foreign keys', 'Every value is numeric', 'It contains exactly two columns'], 0, '2NF removes partial dependency on part of a composite candidate key.'],
      ['What is a transitive dependency?', ['A non-key attribute depends on another non-key attribute', 'A row references itself', 'A key has one column', 'A query uses a join'], 0, 'A → B and B → C means A transitively determines C.'],
      ['Which design most directly represents a many-to-many relationship?', ['A junction table with two foreign keys', 'One very wide text column', 'A duplicated row', 'An index only'], 0, 'A junction table stores each pairing and its two references.']
    ]
  ]
};
const seedQuizzes = subjects.flatMap(({ subject, topic }) => questionSets[topic].map((questions, index) => ({
  title: `${topic} check-in`, subject, topic, difficulty: ['easy', 'medium', 'hard'][index],
  questions: questions.map(([prompt, options, answerIndex, explanation]) => ({ prompt, options, answerIndex, explanation }))
})));

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/learning_demo');
  await Promise.all([User.deleteMany({}), Resource.deleteMany({}), Quiz.deleteMany({}), Attempt.deleteMany({})]);
  await Resource.insertMany(resources);
  const quizzes = await Quiz.insertMany(seedQuizzes);
  const user = await User.create({ name: 'Alex Morgan', email: 'student@learnwell.demo', passwordHash: await bcrypt.hash('learnwell123', 10) });
  const quizFor = (topic, difficulty) => quizzes.find((quiz) => quiz.topic === topic && quiz.difficulty === difficulty);
  await Attempt.insertMany([
    { userId: user._id, quizId: quizFor('Python basics', 'easy')._id, topic: 'Python basics', difficulty: 'easy', score: 1, total: 3, accuracy: 33, answers: [1, 2, 0], createdAt: new Date(Date.now() - 86400000 * 3) },
    { userId: user._id, quizId: quizFor('Python basics', 'easy')._id, topic: 'Python basics', difficulty: 'easy', score: 2, total: 3, accuracy: 67, answers: [1, 0, 2], createdAt: new Date(Date.now() - 86400000) },
    { userId: user._id, quizId: quizFor('Linear equations', 'medium')._id, topic: 'Linear equations', difficulty: 'medium', score: 2, total: 3, accuracy: 67, answers: [1, 1, 2], createdAt: new Date(Date.now() - 86400000 * 2) },
    { userId: user._id, quizId: quizFor('Linear equations', 'medium')._id, topic: 'Linear equations', difficulty: 'medium', score: 3, total: 3, accuracy: 100, answers: [1, 1, 1], createdAt: new Date(Date.now() - 3600000) },
    { userId: user._id, quizId: quizFor('Database design', 'hard')._id, topic: 'Database design', difficulty: 'hard', score: 3, total: 3, accuracy: 100, answers: [0, 0, 0], createdAt: new Date(Date.now() - 86400000) }
  ]);
  console.log('Seed complete. Demo sign-in: student@learnwell.demo / learnwell123');
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
