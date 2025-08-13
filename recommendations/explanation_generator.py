import os
from openai import OpenAI
from models import StudentProfile, DegreeProgram, Recommendation


from dotenv import load_dotenv
load_dotenv()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class ExplanationGenerator:
    """
    A class to generate explanations for degree recommendations.
    """
    def generate_explanation(self, student_profile: StudentProfile, degree_program: DegreeProgram, recommendation: Recommendation, trends, ) -> str:
        """
        Generates a natural language explanation for a recommendation using an LLM.
        """
        print(f"Generating explanation for recommendation: {recommendation.recommendationId}")

        # Construct a detailed prompt for the LLM
        prompt = f"""
        Given the following student profile and recommended degree program, generate a concise and encouraging explanation for why this degree is a good fit for the student.

        Student Profile:
        - Academic Performance: {student_profile.academicPerformance}
        - Career Preferences: {student_profile.careerPreferences}
        - Extracurricular Activities: {student_profile.extracurricularActivities}
        - Personal Interests: {student_profile.personalInterests}
        - Socioeconomic Indicators: {student_profile.socioeconomicIndicators}

        Recommended Degree Program:
        - Program Name: {degree_program.programName}
        - Description: {degree_program.description}
        - Industries: {', '.join(degree_program.industries)}
        - Required Subjects: {degree_program.requiredSubjects}

        Recommendation Details:
        - Confidence Score: {recommendation.confidenceScore}
        - Market Score: {recommendation.marketScore}
        - Algorithm Source: {recommendation.algorithmSource}
        
        Market Trends:
        {trends}

        Based on this information, explain in a friendly tone why the '{degree_program.programName}' program is a strong recommendation for this student. Highlight connections between the student's profile and the program's features.
        """

        try:
            # This is where the call to the LLM happens
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # Or any other suitable model like gpt-4
                messages=[
                    {"role": "system", "content": "You are a helpful academic advisor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            explanation = response.choices[0].message.content.strip()
            return explanation
        except Exception as e:
            print(f"Error calling LLM API: {e}")
            # Fallback explanation if the API call fails
            return f"The {degree_program.programName} is recommended based on a {recommendation.algorithmSource} model with a confidence of {recommendation.confidenceScore*100:.0f}%."
