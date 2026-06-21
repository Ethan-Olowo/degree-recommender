# Helper to get grade by subject name
def get_grade(subject_grades, subject_name):
    if not subject_grades:
        return 0
    for sg in subject_grades:
        subj = getattr(sg, "subject", None)
        if subj and getattr(subj, "subject_name", None) == subject_name:
            try:
                return normalize_grade(sg.grade)
            except (ValueError, TypeError):
                return 0
    return 0

def normalize_grade(grade: str) -> float:
    """
    A placeholder function to normalize different grade formats to a 0-1 scale.
    This should be expanded to handle various grading systems (A-F, 1-100, etc.).
    """
    # Simple example for letter grades
    grade_map = {'A+': 100, 'A': 95, 'A-': 90, 'B+': 85, 'B': 80, 'B-': 75,
                 'C+': 70, 'C': 65, 'C-': 60, 'D': 50, 'F': 0}
    return grade_map.get(str(grade).upper(), 0)