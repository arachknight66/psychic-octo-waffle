import unittest
from rules import recommend, target_level

class RecommendationTests(unittest.TestCase):
    def setUp(self):
        self.resources = [
            {"id": "a", "title": "Python foundations", "subject": "CS", "topic": "Python", "kind": "Guide", "level": "Beginner", "duration": "8 min", "description": "Basics"},
            {"id": "b", "title": "Python challenge", "subject": "CS", "topic": "Python", "kind": "Practice", "level": "Advanced", "duration": "12 min", "description": "Advanced"}
        ]

    def test_levels_follow_accuracy_bands(self):
        self.assertEqual(target_level(49, 1), "Beginner")
        self.assertEqual(target_level(50, 1), "Intermediate")
        self.assertEqual(target_level(85, 1), "Advanced")
        self.assertEqual(target_level(99, 0), "Beginner")

    def test_recommendation_matches_level_and_explains_why(self):
        result = recommend([{"topic": "Python", "accuracy": 92, "attempts": 3}], self.resources)
        self.assertEqual(result[0]["id"], "b")
        self.assertIn("92%", result[0]["reason"])

    def test_empty_resource_set_returns_no_suggestions(self):
        self.assertEqual(recommend([{"topic": "Unknown", "accuracy": 0, "attempts": 0}], []), [])

if __name__ == "__main__":
    unittest.main()
