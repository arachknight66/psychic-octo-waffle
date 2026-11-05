from fastapi import FastAPI
from pydantic import BaseModel
from rules import recommend

app = FastAPI(title="Learnwell recommendation service", version="1.0.0")

class Topic(BaseModel):
    topic: str
    accuracy: int = 0
    attempts: int = 0

class Resource(BaseModel):
    id: str
    title: str
    subject: str
    topic: str
    kind: str
    level: str
    duration: str
    description: str
    accent: str = "blue"

class RecommendationRequest(BaseModel):
    topics: list[Topic]
    resources: list[Resource]

@app.get("/health")
def health():
    return {"status": "ok", "service": "learnwell-recommender"}

@app.post("/recommend")
def recommendations(payload: RecommendationRequest):
    return {"recommendations": recommend(
        [topic.model_dump() for topic in payload.topics],
        [resource.model_dump() for resource in payload.resources]
    )}
