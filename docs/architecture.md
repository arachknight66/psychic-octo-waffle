# System architecture

```mermaid
flowchart LR
  Student[Student] --> UI[React + Vite]
  UI -->|Bearer token, REST| API[Node.js + Express]
  API --> AUTH[Password hashing + JWT]
  API --> DB[(MongoDB: students, lessons, quizzes, attempts, completions)]
  API -->|Topic accuracy + resources| PY[FastAPI recommendation rules]
  PY -->|Ranked resources + reason| API
  API -. Python unavailable .-> FALLBACK[Equivalent local rule fallback]
  API --> UI
```

## Learning loop

1. The student selects a topic and requests a quiz. The API derives a suggested difficulty from recent attempts (the most recent five for that topic) and returns questions without answer keys.
2. The browser submits selected option indexes. The API checks that every answer is present and valid, grades against the stored answer key, records the attempt, and returns explanations.
3. Topic accuracy and resource metadata go to the Python service. It matches each topic to a resource at a suitable level and explains the match. If the service cannot respond, Node applies the same thresholds and returns the source as `local-fallback`.
4. Saved learner interests move matching topics higher in the recommendation list while accuracy still controls the suggested level and explanation.
5. Lessons include an explanation, worked example, and server-checked knowledge check. Completion is saved per student and appears in the library and dashboard.
6. The profile page updates account details, daily study goal, interests, and password after checking the current password.

## Recommendation rules

| Recent topic accuracy | Suggested material | Quiz level |
| --- | --- | --- |
| No attempts or below 50% | Beginner | Easy |
| 50–84% | Intermediate | Medium |
| 85% or higher | Advanced | Hard |

Accuracy is the rounded mean of up to five latest attempts in the topic. These thresholds are a transparent demo policy and should be reviewed with educators before real use.
