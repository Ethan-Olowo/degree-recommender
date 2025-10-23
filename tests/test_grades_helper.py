import unittest
from recommendations.grades_helper import get_grade, normalize_grade

class DummySubject:
    def __init__(self, subject_name):
        self.subject_name = subject_name

class DummySubjectGrade:
    def __init__(self, subject, grade):
        self.subject = subject
        self.grade = grade

class TestGradesHelper(unittest.TestCase):
    def test_get_grade_empty_subject_grades(self):
        self.assertEqual(get_grade([], 'Math'), 0)
        self.assertEqual(get_grade(None, 'Math'), 0)

    def test_get_grade_subject_not_found(self):
        grades = [DummySubjectGrade(DummySubject('English'), 'A')]
        self.assertEqual(get_grade(grades, 'Math'), 0)

    def test_get_grade_valid(self):
        grades = [DummySubjectGrade(DummySubject('Math'), 'A'), DummySubjectGrade(DummySubject('English'), 'B+')]
        self.assertEqual(get_grade(grades, 'Math'), 95)
        self.assertEqual(get_grade(grades, 'English'), 85)

    def test_get_grade_invalid_grade(self):
        grades = [DummySubjectGrade(DummySubject('Math'), None)]
        self.assertEqual(get_grade(grades, 'Math'), 0)
        grades = [DummySubjectGrade(DummySubject('Math'), 'Z')]
        self.assertEqual(get_grade(grades, 'Math'), 0)

    def test_normalize_grade_letter(self):
        self.assertEqual(normalize_grade('A+'), 100)
        self.assertEqual(normalize_grade('A'), 95)
        self.assertEqual(normalize_grade('B-'), 75)
        self.assertEqual(normalize_grade('F'), 0)

    def test_normalize_grade_case_insensitive(self):
        self.assertEqual(normalize_grade('a+'), 100)
        self.assertEqual(normalize_grade('b'), 80)

    def test_normalize_grade_unknown(self):
        self.assertEqual(normalize_grade('Z'), 0)
        self.assertEqual(normalize_grade(''), 0)
        self.assertEqual(normalize_grade(None), 0)

if __name__ == '__main__':
    unittest.main()
