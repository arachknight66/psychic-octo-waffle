# Learnwell — Personalized Learning Demo

A locally runnable student learning app for a college project. It uses quiz results to show topic progress and recommend study material with plain-language reasons. The demo uses synthetic learning data; its rules are educational examples, not evidence of improved learning outcomes.

## What’s included

- Student sign-in, registration, and a seeded demo account.
- Study library with searchable guides, readable video transcripts, worked examples, server-checked practice questions, and saved completion status.
- Multiple-choice quizzes graded by the API, with answer explanations.
- Topic-level progress and quiz history.
- Profile management for account details, daily study goal, interests, and password changes.
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

Demo sign-in: **student@learnwell.demo** / **learnwell123**. The seed command resets demo collections before adding five topics, 30 lessons, quizzes, sample attempts, profile preferences, and completed resources. Don’t use it against a database with information you need to keep.

If the Python service is stopped, the Express API continues to serve recommendations using the same basic rules in Node. The dashboard identifies when it is using that fallback. If MongoDB is stopped, the API exits with a setup hint; start MongoDB and run it again.

## Deploy to Vercel

The repository includes a `vercel.json` configuration for the React app and Express API in one Vercel project. The Express app serves the built frontend and API routes; lesson URLs such as `/library/<id>` remain refreshable. MongoDB runs separately on MongoDB Atlas. On Vercel, recommendations use the built-in transparent Node rules; the Python service remains available for local development.

1. Create a MongoDB Atlas cluster and a database user with access only to the project database. Copy the connection URI and replace the username, password, and database name. Keep it private. Configure Atlas network access for Vercel’s outbound connections; use a dedicated project database and credentials.
2. Import this GitHub repository as a Vercel project with the repository root as the project root. Vercel uses `vercel.json` to install dependencies, build the Vite frontend, and package its assets with the Express function.
3. Add `MONGODB_URI` and a long random `JWT_SECRET` in the Vercel project’s Production environment. Set `CLIENT_ORIGIN` only if using a custom frontend domain; the deployment URL is allowed automatically.
4. After the environment variables are configured, deploy and run the seed command once against Atlas from this repository: `MONGODB_URI='<Atlas connection URI>' npm run seed`. This resets the demo collections. Use an empty project database and do not run this command again after students have created data you want to keep.
5. Open the Vercel project URL and sign in with **student@learnwell.demo** / **learnwell123**.

Required Vercel environment variables:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string; set privately in Vercel |
| `JWT_SECRET` | Secret used to sign student sessions; generate a unique value |
| `CLIENT_ORIGIN` | Optional allowed origin when using a custom domain |

The frontend and API share one origin, so `VITE_API_URL` does not need to be set. The app is a college demo and does not include production monitoring, automated backups, or a production security review.

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
| PATCH | `/api/me` | Update profile details, study goal, interests, and optionally password |
| GET | `/api/resources` | List study resources; optional `topic` and `subject` filters |
| POST | `/api/resources/:id/check` | Check a resource practice answer and receive its explanation |
| GET | `/api/resource-progress` | Read completed resources for the current student |
| PUT / DELETE | `/api/resources/:id/completion` | Mark a resource complete or undo completion |
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
