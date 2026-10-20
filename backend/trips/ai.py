"""Small provider-agnostic AI helper.

The application works without any AI key (deterministic itinerary fallback),
so every failure here is surfaced to callers and handled gracefully.
"""

import json
import logging
import re

from django.conf import settings

logger = logging.getLogger(__name__)


class AIUnavailable(Exception):
    """Raised when no AI provider is configured."""


class AIResponseError(Exception):
    """Raised when a configured provider cannot return usable JSON."""


def openai_configured():
    key = (getattr(settings, "OPENAI_API_KEY", "") or "").strip()
    return bool(key) and not key.startswith(("your_", "sk-placeholder"))


def gemini_configured():
    key = (getattr(settings, "GEMINI_API_KEY", "") or "").strip()
    return bool(key) and not key.startswith("your_")


def ai_available():
    return openai_configured() or gemini_configured()


def provider_name():
    if openai_configured():
        return "openai"
    if gemini_configured():
        return "gemini"
    return None


def _strip_code_fence(text):
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def extract_json(text):
    """Parse JSON even when the model wraps it in prose or code fences."""
    cleaned = _strip_code_fence(text)
    try:
        return json.loads(cleaned)
    except (TypeError, ValueError):
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        candidate = cleaned[start : end + 1]
        try:
            return json.loads(candidate)
        except ValueError as exc:
            raise AIResponseError("AI returned malformed JSON") from exc
    raise AIResponseError("AI returned no JSON object")


def _ask_openai(prompt, system_prompt):
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=60.0)
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=0.7,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content


def _ask_gemini(prompt, system_prompt):
    from google import genai

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config={
            "system_instruction": system_prompt,
            "response_mime_type": "application/json",
            "temperature": 0.7,
        },
    )
    return response.text


def generate_json(prompt, system_prompt="You are a helpful travel assistant."):
    """Ask the configured provider for a JSON object and return it parsed."""
    if openai_configured():
        try:
            return extract_json(_ask_openai(prompt, system_prompt))
        except Exception:
            logger.exception("OpenAI itinerary generation failed")
            if not gemini_configured():
                raise

    if gemini_configured():
        try:
            return extract_json(_ask_gemini(prompt, system_prompt))
        except Exception as exc:
            logger.exception("Gemini itinerary generation failed")
            raise AIResponseError("AI provider request failed") from exc

    raise AIUnavailable("No AI provider is configured")
