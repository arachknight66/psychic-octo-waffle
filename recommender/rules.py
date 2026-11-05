def target_level(accuracy: int, attempts: int) -> str:
    if attempts == 0 or accuracy < 50:
        return "Beginner"
    if accuracy >= 85:
        return "Advanced"
    return "Intermediate"


def explanation(topic: dict, level: str) -> str:
    if topic["attempts"] == 0:
        return f"Start with this {level.lower()} resource to build a baseline in {topic['topic']}."
    if topic["accuracy"] < 50:
        return f"Your recent accuracy is {topic['accuracy']}%. Review the foundations before trying another quiz."
    if topic["accuracy"] >= 85:
        return f"You’re scoring {topic['accuracy']}% recently. Try a more challenging resource to keep progressing."
    return f"Your recent accuracy is {topic['accuracy']}%. This resource matches your current level."


def recommend(topics: list[dict], resources: list[dict]) -> list[dict]:
    results = []
    for topic in sorted(topics, key=lambda item: (item["attempts"] > 0, item["accuracy"])):
        level = target_level(topic["accuracy"], topic["attempts"])
        resource = next((item for item in resources if item["topic"] == topic["topic"] and item["level"] == level), None)
        if resource is None:
            resource = next((item for item in resources if item["topic"] == topic["topic"]), None)
        if resource is None:
            continue
        result = dict(resource)
        result["reason"] = explanation(topic, level)
        results.append(result)
    return results[:4]
