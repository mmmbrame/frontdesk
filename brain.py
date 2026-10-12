"""Open conversation in English, Urdu, or Arabic, spoken with a chosen accent."""

from __future__ import annotations

import re
import threading
from typing import Any

from dialogue import VOICE_LABELS, VOICES, _accent_for, _detect, _email_subject

MODEL_ID = "mlx-community/Qwen2.5-1.5B-Instruct-4bit"
_model = None
_tokenizer = None
_load_lock = threading.Lock()
_generate_lock = threading.Lock()
_OUTCOME = re.compile(r"\s*\[\[outcome:(booked|reminded|reviewed)\]\]\s*$", re.IGNORECASE)


def reply(payload: dict[str, Any]) -> dict[str, Any]:
    message = re.sub(r"\s+", " ", str(payload.get("message") or "")).strip()
    if not message:
        raise ValueError("Message is empty.")

    locked = payload.get("language") if payload.get("language") in ("en", "ur", "ar") else "auto"
    language = locked if locked != "auto" else _detect(message)
    gender = payload.get("gender") if payload.get("gender") in ("female", "male") else "female"
    accent = _accent_for(language, payload.get("accents") or {})
    channel = payload.get("channel") if payload.get("channel") in ("phone", "whatsapp", "sms", "email", "web") else "whatsapp"
    business = payload.get("business") or {}
    name = str(business.get("name") or "the business").strip()[:80]

    history = _history(payload.get("history"))
    messages = [{"role": "system", "content": _instructions(payload, language, channel)}]
    messages.extend(history)
    messages.append({"role": "user", "content": message})

    text = _generate(messages)
    outcome = None
    match = _OUTCOME.search(text)
    if match:
        outcome = match.group(1).lower()
        text = _OUTCOME.sub("", text).strip()
    text = text.strip() or _fallback(language)

    voice = VOICES[(language, accent, gender)]
    return {
        "text": text,
        "subject": _email_subject(name, language) if channel == "email" else None,
        "language": language,
        "accent": accent,
        "voice": voice,
        "voiceLabel": VOICE_LABELS[voice],
        "outcome": outcome,
        "state": {},
        "dir": "rtl" if language in ("ur", "ar") else "ltr",
    }


def _instructions(payload: dict[str, Any], language: str, channel: str) -> str:
    business = payload.get("business") or {}
    jobs = [job for job in payload.get("jobs") or [] if job in ("answer", "book", "remind", "review", "recover")]
    language_name = {"en": "English", "ur": "Urdu", "ar": "Arabic"}[language]
    length = "one or two short sentences" if channel == "sms" else "two to four short sentences"
    return (
        "You are a helpful assistant in a live conversation. "
        "Talk naturally about whatever the person asks, including everyday questions that have nothing to do with a business. "
        f"Reply only in {language_name}. "
        "Use standard Urdu, Modern Standard Arabic, or clear spoken English. "
        "Do not use markdown, bullet lists, or emojis. "
        f"Keep the reply to {length}, because it will be read aloud. "
        f"The channel is {channel}. "
        f"You are speaking for {business.get('name') or 'the business'}. "
        f"Location: {business.get('location') or 'not specified'}. "
        f"Hours: {business.get('hours') or 'not specified'}. "
        f"What they offer: {business.get('services') or 'not specified'}. "
        "Use those facts only when the person asks about the business. "
        f"You may help with these tasks: {', '.join(jobs) or 'general questions'}. "
        "If they ask to book, send a reminder, collect a review, or recover a missed visit, and that task is not allowed, say you cannot do it. "
        "When you confirm a booking, end with a new line [[outcome:booked]]. "
        "When you confirm a reminder, end with [[outcome:reminded]]. "
        "When you record a rating, end with [[outcome:reviewed]]. "
        "Otherwise do not add an outcome line."
    )


def _history(raw: object) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    turns: list[dict[str, str]] = []
    for item in raw[-12:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = re.sub(r"\s+", " ", str(item.get("content") or "")).strip()
        if role in ("user", "assistant") and content:
            turns.append({"role": role, "content": content[:2000]})
    return turns


def _generate(messages: list[dict[str, str]]) -> str:
    from mlx_lm import generate
    from mlx_lm.sample_utils import make_sampler

    with _generate_lock:
        model, tokenizer = _ensure_model()
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        text = generate(
            model,
            tokenizer,
            prompt=prompt,
            max_tokens=120,
            sampler=make_sampler(temp=0.6),
            verbose=False,
        )
        return _trim_repeat(text)


def _trim_repeat(text: str) -> str:
    words = text.split()
    for size in (8, 5, 3):
        if len(words) < size * 2:
            continue
        for index in range(len(words) - size * 2 + 1):
            chunk = words[index:index + size]
            if words[index + size:index + size * 2] == chunk:
                return " ".join(words[:index + size]).rstrip(" ,،")
    return text


def _ensure_model():
    global _model, _tokenizer
    if _model is not None and _tokenizer is not None:
        return _model, _tokenizer
    with _load_lock:
        if _model is None or _tokenizer is None:
            from mlx_lm import load

            _model, _tokenizer = load(MODEL_ID)
    return _model, _tokenizer


def _fallback(language: str) -> str:
    return {
        "en": "Could you say that another way?",
        "ur": "براہ کرم اسے دوبارہ کہیے؟",
        "ar": "هل يمكنكم قول ذلك بطريقة أخرى؟",
    }[language]
