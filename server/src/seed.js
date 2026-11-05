import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Resource from './models/Resource.js';
import Quiz from './models/Quiz.js';
import Attempt from './models/Attempt.js';
import ResourceProgress from './models/ResourceProgress.js';

const subjects = [
  { subject: 'Computer science', topic: 'Python basics', accent: 'blue', lesson: 'Python is a readable programming language. Variables give names to values, and a function groups reusable steps.', example: 'temperature = 22\nprint(f"Today is {temperature}°")', exercise: { prompt: 'Which value does len("study") return?', options: ['4', '5', '6', 'study'], answerIndex: 1, explanation: 'The word study contains five characters.' } },
  { subject: 'Mathematics', topic: 'Linear equations', accent: 'gold', lesson: 'A linear equation keeps both sides balanced. Apply the same operation to each side to isolate the unknown.', example: '2x + 4 = 12\n2x = 8\nx = 4', exercise: { prompt: 'Solve 3x − 6 = 9.', options: ['1', '3', '5', '15'], answerIndex: 2, explanation: 'Add 6 to get 3x = 15, then divide by 3.' } },
  { subject: 'Computer science', topic: 'Database design', accent: 'mint', lesson: 'A relational database organizes information into tables. Normalization reduces repeated data and update errors.', example: 'Students(student_id, name)\nEnrollments(student_id, course_id)', exercise: { prompt: 'What does a primary key identify?', options: ['A unique row', 'A database server', 'A backup file', 'A column type'], answerIndex: 0, explanation: 'A primary key uniquely identifies each row in its table.' } },
  { subject: 'Mathematics', topic: 'Statistics fundamentals', accent: 'blue', lesson: 'Statistics describes data with measures of center and spread. The mean uses every value, while the median is the middle value after sorting.', example: 'Data: 2, 3, 3, 8\nMean = 4\nMedian = 3', exercise: { prompt: 'What is the median of 1, 4, 7?', options: ['1', '4', '6', '7'], answerIndex: 1, explanation: 'The sorted middle value is 4.' } },
  { subject: 'Humanities', topic: 'Academic writing', accent: 'gold', lesson: 'A clear academic paragraph makes one claim, supports it with evidence, and explains how that evidence supports the claim.', example: 'Claim → evidence → explanation\nKeep each paragraph focused on one idea.', exercise: { prompt: 'What should evidence do in an academic paragraph?', options: ['Replace the claim', 'Support the claim', 'Introduce an unrelated idea', 'Repeat the title'], answerIndex: 1, explanation: 'Evidence gives the reader a basis for evaluating the paragraph’s claim.' } }
];
const levels = ['Beginner', 'Intermediate', 'Advanced'];
const resources = subjects.flatMap(({ subject, topic, accent, lesson, example, exercise }) => levels.flatMap((level, index) => [
  { title: `${topic}: ${['the essentials', 'guided practice', 'challenge set'][index]}`, subject, topic, kind: index === 1 ? 'Practice' : 'Guide', level, duration: `${8 + index * 4} min`, description: `${level} lesson with a worked example and a short knowledge check.`, content: lesson, example, exercise, accent },
  { title: `${topic}: ${['a quick walkthrough', 'worked examples', 'put it to work'][index]}`, subject, topic, kind: 'Video', level, duration: `${6 + index * 3} min`, description: `A ${level.toLowerCase()} lesson with a readable transcript and example.`, content: lesson, example, transcript: `${lesson}\n\nWorked example\n${example}`, exercise, accent }
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
  ],
  'Statistics fundamentals': [
    [
      ['What is the median of 2, 5, 9?', ['2', '5', '7', '9'], 1, 'The middle value in the ordered list is 5.'],
      ['What does the mean describe?', ['The most frequent value', 'The arithmetic average', 'The middle value only', 'The largest value'], 1, 'Add values and divide by the number of values.'],
      ['Which measure is least affected by one extreme value?', ['Mean', 'Median', 'Range', 'Sum'], 1, 'The median depends on position, so a very large value has less effect.']
    ],
    [
      ['The values are 4, 4, 6, 10. What is the mean?', ['5', '6', '7', '24'], 1, 'Their sum is 24, and 24 divided by 4 is 6.'],
      ['What is the range of 3, 8, 11?', ['3', '8', '11', '14'], 2, 'Range is maximum minus minimum: 11 − 3 = 8.'],
      ['Which graph is useful for comparing category counts?', ['Bar chart', 'Scatter plot', 'Line of best fit', 'Number line'], 0, 'Bar charts compare values across categories.']
    ],
    [
      ['A distribution has a strong high outlier. Which center is usually more robust?', ['Mean', 'Median', 'Total', 'Range'], 1, 'The median is less sensitive to extreme values.'],
      ['If every observation increases by 5, what happens to the mean?', ['It stays the same', 'It increases by 5', 'It doubles', 'It decreases by 5'], 1, 'Adding a constant to every value adds that constant to the mean.'],
      ['What does standard deviation summarize?', ['Typical distance from the mean', 'The middle observation', 'The number of categories', 'The largest observation'], 0, 'Standard deviation describes spread around the mean.']
    ]
  ],
  'Academic writing': [
    [
      ['What is the main job of a topic sentence?', ['State the paragraph’s focus', 'List every source', 'Repeat the conclusion', 'Add a page number'], 0, 'A topic sentence signals the main point of the paragraph.'],
      ['Which best supports a factual claim?', ['Relevant evidence', 'A louder opinion', 'An unrelated example', 'A longer sentence'], 0, 'Relevant evidence gives readers a reason to accept the claim.'],
      ['What should a conclusion do?', ['Synthesize the main argument', 'Introduce the whole topic for the first time', 'Add unrelated evidence', 'Repeat every sentence'], 0, 'A conclusion brings the argument together and shows why it matters.']
    ],
    [
      ['Which order makes the clearest body paragraph?', ['Evidence, claim, title', 'Claim, evidence, explanation', 'Explanation, title, claim', 'Citation, citation, citation'], 1, 'The paragraph first makes a point, then supports and explains it.'],
      ['Why cite a source?', ['To identify borrowed ideas and evidence', 'To make a paragraph longer', 'To avoid explaining a claim', 'To replace a bibliography'], 0, 'Citations credit sources and let readers trace the evidence.'],
      ['Which revision improves clarity most?', ['Replace vague words with precise terms', 'Add more adjectives', 'Use longer sentences', 'Repeat the claim twice'], 0, 'Precise wording helps readers understand exactly what is meant.']
    ],
    [
      ['A counterargument is useful when it helps a writer…', ['Address a reasonable alternative view', 'Avoid stating a thesis', 'Remove all evidence', 'Change topics'], 0, 'Considering another view can clarify and strengthen the argument.'],
      ['What makes evidence relevant?', ['It directly bears on the claim', 'It comes from any source', 'It is the longest quotation', 'It appears in every paragraph'], 0, 'Relevant evidence supports the specific claim being made.'],
      ['What is synthesis?', ['Connecting ideas across sources', 'Listing sources without a point', 'Copying a paragraph', 'Removing context'], 0, 'Synthesis explains relationships among sources and the writer’s argument.']
    ]
  ]
};
const seedQuizzes = subjects.flatMap(({ subject, topic }) => questionSets[topic].map((questions, index) => ({
  title: `${topic} check-in`, subject, topic, difficulty: ['easy', 'medium', 'hard'][index],
  questions: questions.map(([prompt, options, answerIndex, explanation]) => ({ prompt, options, answerIndex, explanation }))
})));

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/learning_demo');
  await Promise.all([User.deleteMany({}), Resource.deleteMany({}), Quiz.deleteMany({}), Attempt.deleteMany({}), ResourceProgress.deleteMany({})]);
  const createdResources = await Resource.insertMany(resources);
  const quizzes = await Quiz.insertMany(seedQuizzes);
  const user = await User.create({ name: 'Alex Morgan', email: 'student@learnwell.demo', passwordHash: await bcrypt.hash('learnwell123', 10), studyGoalMinutes: 30, preferredTopics: ['Python basics', 'Statistics fundamentals', 'Academic writing'] });
  const completedSamples = createdResources.filter((resource) => ['Python basics', 'Linear equations'].includes(resource.topic) && resource.kind === 'Guide' && resource.level === 'Beginner');
  await ResourceProgress.insertMany(completedSamples.map((resource) => ({ userId: user._id, resourceId: resource._id, completedAt: new Date(Date.now() - 86400000) })));
  const quizFor = (topic, difficulty) => quizzes.find((quiz) => quiz.topic === topic && quiz.difficulty === difficulty);
  await Attempt.insertMany([
    { userId: user._id, quizId: quizFor('Python basics', 'easy')._id, topic: 'Python basics', difficulty: 'easy', score: 1, total: 3, accuracy: 33, answers: [1, 2, 1], createdAt: new Date(Date.now() - 86400000 * 3) },
    { userId: user._id, quizId: quizFor('Python basics', 'easy')._id, topic: 'Python basics', difficulty: 'easy', score: 2, total: 3, accuracy: 67, answers: [1, 0, 0], createdAt: new Date(Date.now() - 86400000) },
    { userId: user._id, quizId: quizFor('Linear equations', 'medium')._id, topic: 'Linear equations', difficulty: 'medium', score: 2, total: 3, accuracy: 67, answers: [1, 1, 2], createdAt: new Date(Date.now() - 86400000 * 2) },
    { userId: user._id, quizId: quizFor('Linear equations', 'medium')._id, topic: 'Linear equations', difficulty: 'medium', score: 3, total: 3, accuracy: 100, answers: [1, 1, 1], createdAt: new Date(Date.now() - 3600000) },
    { userId: user._id, quizId: quizFor('Database design', 'hard')._id, topic: 'Database design', difficulty: 'hard', score: 3, total: 3, accuracy: 100, answers: [0, 0, 0], createdAt: new Date(Date.now() - 86400000) },
    { userId: user._id, quizId: quizFor('Statistics fundamentals', 'medium')._id, topic: 'Statistics fundamentals', difficulty: 'medium', score: 2, total: 3, accuracy: 67, answers: [1, 1, 1], createdAt: new Date(Date.now() - 86400000 * 2) },
    { userId: user._id, quizId: quizFor('Academic writing', 'easy')._id, topic: 'Academic writing', difficulty: 'easy', score: 2, total: 3, accuracy: 67, answers: [0, 0, 1], createdAt: new Date(Date.now() - 3600000 * 9) }
  ]);
  console.log('Seed complete. Demo sign-in: student@learnwell.demo / learnwell123');
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
