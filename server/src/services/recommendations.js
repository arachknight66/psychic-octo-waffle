const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const recommendedLevel = (accuracy) => accuracy < 50 ? 'Beginner' : accuracy >= 85 ? 'Advanced' : 'Intermediate';

export function fallbackRecommendations(topics, resources) {
  return topics.map((topic) => {
    const level = recommendedLevel(topic.accuracy);
    const resource = resources.find((item) => item.topic === topic.topic && item.level === level)
      || resources.find((item) => item.topic === topic.topic);
    if (!resource) return null;
    const reason = topic.attempts === 0
      ? `Start with this ${level.toLowerCase()} resource to build a baseline in ${topic.topic}.`
      : topic.accuracy < 50
        ? `Your recent accuracy is ${topic.accuracy}%. Review the foundations before trying another quiz.`
        : topic.accuracy >= 85
          ? `You’re scoring ${topic.accuracy}% recently. Try a more challenging resource to keep progressing.`
          : `Your recent accuracy is ${topic.accuracy}%. This resource matches your current level.`;
    return { ...resource.toObject(), reason };
  }).filter(Boolean).slice(0, 4);
}

export async function getRecommendations(topics, resources) {
  try {
    const response = await fetch(`${process.env.RECOMMENDER_URL || 'http://127.0.0.1:8000'}/recommend`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topics, resources: resources.map((r) => ({
        id: r._id.toString(), title: r.title, subject: r.subject, topic: r.topic, kind: r.kind,
        level: r.level, duration: r.duration, description: r.description, accent: r.accent
      })) }), signal: AbortSignal.timeout(1600)
    });
    if (!response.ok) throw new Error(`Recommender returned ${response.status}`);
    const data = await response.json();
    return { items: data.recommendations, source: 'python' };
  } catch {
    return { items: fallbackRecommendations(topics, resources), source: 'local-fallback' };
  }
}
export { LEVELS, recommendedLevel };
