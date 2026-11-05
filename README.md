# Learnwell — Personalized Learning Demo

A locally runnable student learning app for a college project. It uses quiz results to show topic progress and recommend study material with plain-language reasons. The demo uses synthetic learning data; its rules are educational examples, not evidence of improved learning outcomes.

## What’s included

- Student sign-in, registration, and a seeded demo account.
- Study library with guides, practice activities, and short video-style resources.
- Multiple-choice quizzes graded by the API, with answer explanations.
- Topic-level progress and quiz history.
- Difficulty adjustment from recent topic accuracy: below 50% suggests easy, 50–84% medium, and 85% or higher hard.
- Recommendations from a small Python API, with a matching local fallback if that API is unavailable.

## Technology

- React and Vite for the student web app.
- Node.js, Express, Mongoose, and MongoDB for authentication and learning records.
- FastAPI for transparent resource matching and recommendation reasons.

## Run locally

Requirements: Node.js 22.12+, npm, Python 3.10+, and MongoDB 6+ running locally. Docker is optional; a MongoDB installation can also run as a local service.

1. Copy `.env.example` to `.env`. Set a private `JWT_SECRET` for your machine. The defaults use local MongoDB and the local development ports.
2. Start MongoDB. For a local installation, start its `mongod` service. If Docker is installed, you can use:

   ```sh
   docker run --name learnwell-mongo -p 27017:27017 -d mongo:7
   ```

3. Install JavaScript dependencies and seed the synthetic demo records:

   ```sh
   npm install
   npm run seed
   ```

4. In a separate terminal, start the recommendation service:

   ```sh
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r recommender/requirements.txt
   uvicorn app:app --app-dir recommender --reload --port 8000
   ```

5. In another terminal, start the Express API and Vite app:

   ```sh
   npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173).

Demo sign-in: **student@learnwell.demo** / **learnwell123**. The seed command resets the demo database collections before inserting synthetic content and attempts. Don’t use it against a database with information you need to keep.

If the Python service is stopped, the Express API continues to serve recommendations using the same basic rules in Node. The dashboard identifies when it is using that fallback. If MongoDB is stopped, the API exits with a setup hint; start MongoDB and run it again.

## Project structure

```text
client/       React application and responsive styling
server/       Express API, Mongoose models, and seed data
recommender/  FastAPI recommendation rules
docs/         Architecture diagram and project report
```

## API overview

All `/api` routes except registration and login require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a student account |
| POST | `/api/auth/login` | Sign in and receive a session token |
| GET | `/api/me` | Read the current student profile |
| GET | `/api/resources` | List study resources; optional `topic` and `subject` filters |
| GET | `/api/quizzes?topic=...` | Get a quiz at the level suggested by recent results |
| POST | `/api/quizzes/submit` | Submit `{ "quizId": "...", "answers": [0, 1, 2] }` for server grading |
| GET | `/api/progress` | Read topic summaries, recent attempts, and overall accuracy |
| GET | `/api/recommendations` | Read personalized materials and recommendation source |

The API computes quiz scores from stored answer keys. It rejects missing or invalid answers and never accepts a client-supplied score.

## Verify

```sh
npm test
npm run build
```

The tests cover the recommendation thresholds, recommendation explanations, graceful Python-service fallback, quiz answer validation and grading logic, and backend authentication/learning flows against a disposable MongoDB instance.
