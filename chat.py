import os
import requests
from .models import ChatRequest, ChatResponse

def process_chat_request(chat_request: ChatRequest) -> ChatResponse:
    """
    Process the chat request by constructing the system prompt and calling the OpenRouter API.
    """
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_api_key:
        raise ValueError("OpenRouter API key is not configured.")

    # Construct the system prompt
    system_prompt = (
        "You are a helpful AI assistant that helps students understand their degree recommendations and academic journey. "
        "You provide clear, concise, and supportive guidance."
    )

    if chat_request.recOutput:
        system_prompt += "\n\nThe student has the following degree recommendations:\n"
        for idx, rec in enumerate(chat_request.recOutput):
            system_prompt += f"{idx + 1}. {rec.degree_program.program_name} ({rec.degree_program.program_type})\n"
            system_prompt += f"   - Confidence Score: {rec.confidence_score}/100\n"
            system_prompt += f"   - Market Score: {rec.market_score}/100\n"
            if rec.explanation:
                system_prompt += f"   - Why: {rec.explanation}\n"
            if rec.degree_program.description:
                system_prompt += f"   - Description: {rec.degree_program.description}\n"

    system_prompt += (
        "\n\nAnswer questions about these recommendations, help the student understand their options, and provide guidance on their academic path. "
        "Keep responses friendly, clear, and under 200 words unless more detail is specifically requested."
    )

    # Build the messages array
    messages = [
        {"role": "system", "content": system_prompt},
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
        "temperature": 0.7,
        "top_p": 0.9,
    }

    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        reply = data.get("choices", [{}])[0].get("message", {}).get("content", "Error generating response.")
        return ChatResponse(reply=reply)
    except Exception as e:
        raise ValueError(f"Error calling OpenRouter API: {e}")