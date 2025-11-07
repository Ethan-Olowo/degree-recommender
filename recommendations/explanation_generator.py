import os
import requests
from models import DegreeProgram, Recommendation, User

from dotenv import load_dotenv
load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise EnvironmentError("OPENROUTER_API_KEY environment variable is not set.")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

class ExplanationGenerator:
    """
    A class to generate explanations for degree recommendations.
    """
    def generate_explanation(self, user: User, degree_program: DegreeProgram, recommendation: Recommendation, trends) -> str:
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
        if user.socioeconomic:
            socioeconomic_attrs = [
                ("Country Code", user.socioeconomic.country_code),
                ("Income Level", user.socioeconomic.income_level),
                ("Gender", user.socioeconomic.gender),
                ("School Type", user.socioeconomic.school_type),
                ("Father's Education", user.socioeconomic.father_education),
                ("Mother's Education", user.socioeconomic.mother_education),
                ("Funding Method", user.socioeconomic.funding_method)
            ]
            socioeconomic_str = ', '.join([f"{label}: {value}" for label, value in socioeconomic_attrs if value is not None])
            if not socioeconomic_str:
                socioeconomic_str = "N/A"
        else:
            socioeconomic_str = "N/A"


        # Degree program details
        industries_list = getattr(degree_program, 'industries', []) or []
        industries = ', '.join(industries_list) if industries_list else "N/A"
        subject_requirements_list = getattr(degree_program, 'subject_requirements', []) or []
        required_subjects = ', '.join([req.subject.subject_name for req in subject_requirements_list if getattr(req, 'subject', None)]) if subject_requirements_list else "N/A"

        # Refactored prompt for improved clarity, context structure, and LLM efficiency
        prompt = f"""
        You are an experienced academic advisor helping students choose degree programs. 
        Your task is to explain why a given program is a good fit for a specific student.

        Context:
        User Profile:
        - Academic Performance: {academic_performance}
        - Interests: {personal_interests}
        - Socioeconomic Background: {socioeconomic_str}

        Recommended Degree:
        - Name: {degree_program.program_name}
        - Description: {degree_program.description}
        - Category: {degree_program.category}
        - Industries: {industries}
        - Required Subjects: {required_subjects}

        Recommendation Insights:
        - Confidence Score: {recommendation.confidence_score}
        - Market Score: {recommendation.market_score}

        Market Trends Summary:
        {trends}

        Instructions:
        1. Write a concise and encouraging explanation (max 150 words).
        2. Use friendly, clear language understandable to a high school student.
        3. Highlight how the program aligns with the user’s profile and market opportunities.
        4. Do not restate the input data. Focus on synthesis.
        5. Mention how current market trends and the user's interests support this choice.
        6. Categories are derived from peer clustering and content-based filtering methods.

        Now generate the explanation.
        """

        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "openai/gpt-oss-20b:free",
                "messages": [
                    {"role": "system", "content": "You are a helpful academic advisor who explains recommendations clearly and positively."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.65,
                "top_p": 0.9
            }

            resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            explanation = data["choices"][0]["message"]["content"].strip()
            return explanation
        except Exception as e:
            print(f"Error calling LLM API: {e}")
            raise Exception("Failed to generate explanation from LLM.")