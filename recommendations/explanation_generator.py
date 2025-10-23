import os
import requests
from models import DegreeProgram, Recommendation

from dotenv import load_dotenv
load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

class ExplanationGenerator:
    """
    A class to generate explanations for degree recommendations.
    """
    def generate_explanation(self, user, degree_program: DegreeProgram, recommendation: Recommendation, trends) -> str:
        """
        Generates a natural language explanation for a recommendation using an LLM.
        """
        print(f"Generating explanation for recommendation: {getattr(recommendation, 'recommendation_id', None)}")

        # Extract user details
        academic_performance = None
        gpa = None
        if user.academic_data:
            gpa = user.academic_data.gpa
        academic_performance = f"GPA: {gpa}" if gpa is not None else "N/A"

        personal_interests = ', '.join([pi.interest for pi in user.personal_interests]) if user.personal_interests else "N/A"
        socioeconomic = user.socioeconomic.dict() if user.socioeconomic else {}
        socioeconomic_str = ', '.join([f"{k}: {v}" for k, v in socioeconomic.items()]) if socioeconomic else "N/A"

        # Degree program details
        industries = ', '.join(degree_program.industries) if degree_program.industries else "N/A"
        required_subjects = ', '.join([req.subject.subject_name for req in degree_program.subject_requirements if req.subject]) if degree_program.subject_requirements else "N/A"

        # Construct a detailed prompt for the LLM
        prompt = f"""
        Given the following user profile and recommended degree program, generate a concise and encouraging explanation for why this degree is a good fit for the user.

        User Profile:
        - Academic Performance: {academic_performance}
        - Personal Interests: {personal_interests}
        - Socioeconomic Indicators: {socioeconomic_str}

        Recommended Degree Program:
        - Program Name: {degree_program.program_name}
        - Description: {degree_program.description}
        - Industries: {industries}
        - Required Subjects: {required_subjects}

        Recommendation Details:
        - Confidence Score: {recommendation.confidence_score}
        - Market Score: {recommendation.market_score}
        - Algorithm Source: {recommendation.algorithm_source}

        Market Trends:
        {trends}

        Based on this information, explain in a friendly tone why the '{degree_program.program_name}' program is a strong recommendation for this user. Highlight connections between the user's profile and the program's features.
        """

        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "openai/gpt-oss-20b:free",
                "messages": [
                    {"role": "system", "content": "You are a helpful academic advisor."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 150
            }
            resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            explanation = data["choices"][0]["message"]["content"].strip()
            return explanation
        except Exception as e:
            print(f"Error calling LLM API: {e}")
            # Fallback explanation if the API call fails
            return f"The {degree_program.program_name} is recommended based on a {recommendation.algorithm_source} model with a confidence of {recommendation.confidence_score*100:.0f}%."
