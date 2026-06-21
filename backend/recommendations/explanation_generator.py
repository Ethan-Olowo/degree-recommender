import os
import requests
from models import DegreeProgram, Recommendation, User, ChatRequest, ChatResponse
import json
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
    # Section templates for degree explanation
    SECTION_TEMPLATES = {
        "semantic": "* **A Great Fit for Your Interests:**\n    {snippet_semantic}\n",
        "subject": "* **Plays to Your Strengths:**\n    {snippet_subject}\n",
        "peers": "* **Aligns with Similar Students:**\n  Students like you have thrived in this program.\n",
        "market": "* **A Strong Future Outlook:**\n    {snippet_market}\n"
    }
    HEADER_TEMPLATE = "Based on your unique profile, we think **{degree_name}** is an excellent match for you!\n\nHere's a quick breakdown of why:\n\n"
    FOOTER_TEMPLATE = "\nWhen recommending this program, we considered your interests, strengths, what students like you have done, and the job market."

    def generate_explanation(self, user: User, degree_program: DegreeProgram, recommendation: Recommendation, trends) -> str:
        """
        Generates a natural language explanation for a recommendation using an LLM.
        """

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

        scores = {}
        scores['semantic_score'] = recommendation.semantic_score if recommendation.semantic_score is not None else 0
        scores['peer_score'] = recommendation.peer_score if recommendation.peer_score is not None else 0
        scores['subject_score'] = recommendation.subject_score if recommendation.subject_score is not None else 0
        scores['market_score'] = recommendation.market_score if recommendation.market_score is not None else 0

        high_scores = []
        for score_name, score_value in scores.items():
            if isinstance(score_value, (int, float)) and score_value >= 0.5:
                high_scores.append((score_name, score_value))

        
        high_scores_dict = dict(high_scores)
        drivers_to_generate = []
        
        # Create a list of "jobs" for the LLM
        if 'semantic_score' in high_scores_dict:
            drivers_to_generate.append({
                "type": "semantic",
                "prompt_data": f"Interests: {personal_interests}, Degree Description: {degree_program.description}, Industries Linked to Degree: {industries}"
            })
        if 'subject_score' in high_scores_dict:
            drivers_to_generate.append({
                "type": "subject",
                "prompt_data": f"Academic Performance: {academic_performance}, Required Subjects: {required_subjects}"
            })
        if 'market_score' in high_scores_dict:
            drivers_to_generate.append({
                "type": "market",
                "prompt_data": f"Market Trends: {str(trends)}, country: {user.socioeconomic.country_code if user.socioeconomic else 'N/A'}"
            })
        print(f"Drivers to generate snippets for: {[driver['type'] for driver in drivers_to_generate]}")

        # Generate snippets for each driver and collect them by type
        snippets = {}
        for driver in drivers_to_generate:
            snippet = self._get_llm_snippet(driver['type'], driver['prompt_data'], degree_program.program_name)
            print(f"Generated snippet for {driver['type']}: {snippet}")
            key = driver['type']
            snippets[key] = snippet if snippet is not None else ""

        # Map score keys to section names
        score_to_section = {
            "semantic_score": "semantic",
            "subject_score": "subject",
            "market_score": "market"
        }

        explanation_parts = [self.HEADER_TEMPLATE.format(degree_name=degree_program.program_name)]
        # Add section headers for each high-score driver
        for score_key, score_value in high_scores_dict.items():
            section = score_to_section.get(score_key)
            if section:
                snippet_key = f"snippet_{section}"
                section_text = self.SECTION_TEMPLATES[section].format(**{snippet_key: snippets.get(section, "")})
                explanation_parts.append(section_text)

        if 'peer_score' in high_scores_dict:
            explanation_parts.append(self.SECTION_TEMPLATES["peers"])

        explanation_parts.append(self.FOOTER_TEMPLATE)
        final_explanation = "\n\n".join(explanation_parts)
        return final_explanation
       

        
    @staticmethod
    def process_chat_request(chat_request: ChatRequest, recommendations: list[Recommendation], user_interests: str) -> ChatResponse:
        """
        Process the chat request by constructing the system prompt and calling the OpenRouter API.
        """
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_api_key:
            raise ValueError("OpenRouter API key is not configured.")

        # Construct the system prompt as JSON
        system_prompt = {
            "role": "assistant",
            "purpose": "Help students understand their degree recommendations and academic journey.",
            "guidance": "Provide clear, concise, and supportive responses.",
            "metrics_explanation": {
                "confidence_score": "Represents the overall confidence in the recommendation, based on multiple factors.",
                "market_score": "Indicates the job market demand and future outlook for the degree.",
                "semantic_score": "Measures how well the degree aligns with the student's interests.",
                "peer_score": "Reflects whether similar students chose this program.",
                "subject_score": "Evaluates how well the student's academic strengths match the degree requirements."
            },
            "user_interests": user_interests,
            "recommendations": []
        }

        if recommendations:
            for rec in recommendations:
                rec_data = {
                    "degree_program": rec.degree_program.program_name,
                    "program_type": rec.degree_program.program_type,
                    "confidence_score": rec.confidence_score,
                    "market_score": rec.market_score,
                    "semantic_score": rec.semantic_score,
                    "peer_score": rec.peer_score,
                    "subject_score": rec.subject_score,
                    "explanation": rec.explanation,
                    "description": rec.degree_program.description,
                }
                system_prompt["recommendations"].append(rec_data)

        # Convert the system prompt to a JSON string
        system_prompt_json = json.dumps(system_prompt, indent=4)

        # Build the messages array
        messages = [
            {"role": "system", "content": system_prompt_json},
            *(message.dict() for message in chat_request.chatHistory),
            {"role": "user", "content": chat_request.newMessage},
        ]

        # Call the OpenRouter API
        headers = {
            "Authorization": f"Bearer {openrouter_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "openai/gpt-oss-20b:free",
            "messages": messages,
        }

        try:
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "Error generating response.")
            if any(not rec.explanation for rec in recommendations):
                reply += "\n\nTo get more accurate information, generate explanations for each recommendation using the button in the Recommendation details page."
            return ChatResponse(reply=reply)
        except Exception as e:
            raise ValueError(f"Error calling OpenRouter API: {e}")

    def _get_llm_snippet(self, driver_type: str, data: str, program_name: str) -> str:
        """
        Generates a single, concise sentence for a specific recommendation driver.
        """
        prompts = {
            "semantic": f"A student's data shows: '{data}'. Write one friendly sentence (max 30 words) explaining how this shows the '{program_name}' program is a good fit for their interests.",
            "subject": f"A student's data shows: '{data}'. Write one encouraging sentence (max 30 words) explaining how their academic strengths match the '{program_name}' program.",
            "market": f"Data shows: '{data}'. Write one exciting sentence (max 30 words) about the strong career outlook for the '{program_name}' program.",
        }

        prompt_content = prompts.get(driver_type, "Explain this data.")

        headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
        payload = {
            "model": "openai/gpt-oss-20b:free",
            "messages": [
                {"role": "system", "content": "You are a career guidance assistant. You write a concise, encouraging sentence for students, explaining why they have been recommended a specific program."},
                {"role": "user", "content": prompt_content}
            ],
            "temperature": 0.7,
            "top_p": 0.9,
            # "max_tokens": 100  # CRITICAL: Constrain the output!
        }

        try:
            resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"Error generating snippet for {driver_type}: {e}")
            return "" # Return empty string on failure