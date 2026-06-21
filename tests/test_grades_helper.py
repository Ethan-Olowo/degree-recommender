import pytest
from recommendations.grades_helper import get_grade, normalize_grade

class DummySubject:
    def __init__(self, subject_name):
        self.subject_name = subject_name

class DummySubjectGrade:
    def __init__(self, subject, grade):
        self.subject = subject
        self.grade = grade

def test_get_grade_empty_subject_grades():
    assert get_grade([], 'Math') == 0
    assert get_grade(None, 'Math') == 0

def test_get_grade_subject_not_found():
    grades = [DummySubjectGrade(DummySubject('English'), 'A')]
    assert get_grade(grades, 'Math') == 0

def test_get_grade_valid():
    grades = [DummySubjectGrade(DummySubject('Math'), 'A'), DummySubjectGrade(DummySubject('English'), 'B+')]
    assert get_grade(grades, 'Math') == 95
    assert get_grade(grades, 'English') == 85

def test_get_grade_invalid_grade():
    grades = [DummySubjectGrade(DummySubject('Math'), None)]
    assert get_grade(grades, 'Math') == 0
    grades = [DummySubjectGrade(DummySubject('Math'), 'Z')]
    assert get_grade(grades, 'Math') == 0

def test_normalize_grade_letter():
    assert normalize_grade('A+') == 100
    assert normalize_grade('A') == 95
    assert normalize_grade('B-') == 75
    assert normalize_grade('F') == 0

def test_normalize_grade_case_insensitive():
    assert normalize_grade('a+') == 100
    assert normalize_grade('b') == 80

def test_normalize_grade_unknown():
    assert normalize_grade('Z') == 0
    assert normalize_grade('') == 0
    assert normalize_grade(None) == 0
