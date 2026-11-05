# AI-Powered Personalized Learning System

## Abstract

Learnwell is a student-focused web application prototype that uses topic-level quiz history to suggest study materials and question difficulty. The implementation combines a React interface, an Express API backed by MongoDB, and a small Python recommendation service. Recommendations include plain-language reasons tied to recent performance. Sample records are synthetic; the project does not claim measured learning gains.

## Problem and objective

A single fixed path can leave learners spending too much time on familiar material or moving ahead before they feel ready. This prototype demonstrates one approach to making a study session more responsive: record quiz outcomes by topic, summarize recent performance, and make the next suggested resource and quiz level visible to the student.

The project objectives are to:

- Provide a student account and learning dashboard.
- Offer a small library of resources across general academic topics.
- Assess topic knowledge with server-graded quizzes and answer explanations.
- Show recent quiz history and topic-level progress.
- Recommend materials and quiz difficulty with explainable rules.

## Scope

The prototype includes student registration and sign-in, sample learning resources, quizzes, recommendations, and personal progress. The initial dataset covers Python basics, linear equations, and database design. It uses synthetic accounts, resources, quiz answers, and attempt history.

Teacher reporting, collaborative recommendations, trained prediction models, generative tutoring, mobile applications, and LMS integration are future work. The system supports educator judgment; it is not intended to replace it.

## Method

The API computes accuracy from trusted stored answer keys. Topic accuracy is the rounded mean of up to five most recent quiz attempts. Scores below 50% suggest beginner resources and easy quizzes, scores from 50% through 84% suggest intermediate resources and medium quizzes, and scores of at least 85% suggest advanced resources and hard quizzes. New learners begin with a beginner recommendation. Each recommendation includes a short reason explaining the selected level.

The Python service matches topic and suggested level to the available resource catalog. An equivalent Node fallback keeps the recommendation endpoint available when the Python service is stopped. This is a rule-based baseline, not a trained machine-learning model.

## Architecture and implementation

The React/Vite frontend provides the dashboard, study library, quiz flow, and progress page. The Express API validates requests, hashes passwords with bcrypt, issues JWTs, grades answers, and saves learning records. MongoDB stores students, resources, quizzes, and attempts. FastAPI provides recommendations. The architecture and learning loop are described in [architecture.md](architecture.md).

## Evaluation plan

The code-level verification checks authentication responses, server-side grading, answer validation, recording attempts, progress summaries, recommendations for weak and strong topics, and fallback behavior when the Python service is unavailable. A future educational evaluation would need a suitable dataset and learner study. Recommendation ranking measures such as Precision@K and NDCG require relevance judgments and should be reported only after those data exist.

## Limitations and ethics

The sample is small and synthetic. Accuracy is an incomplete measure of understanding and may fluctuate with question choice. Rule thresholds are illustrative and can make imperfect recommendations. Passwords are hashed and protected routes require a signed token, but this local project is not a production security review. A real deployment would require appropriate consent, data minimization, retention rules, access controls, security review, and educator oversight.

## Conclusion

Learnwell demonstrates an end-to-end personalized learning loop: quiz performance updates topic progress, which informs the next suggested resource and quiz level. Its main contribution is a working, inspectable prototype with transparent rules and reviewable explanations. The project does not establish that personalization improves educational outcomes; that would require a separate evaluation with real learners and appropriate safeguards.
