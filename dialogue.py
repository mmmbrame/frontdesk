"""Front-desk dialogue for English, Urdu, and Arabic.

The desk only does the jobs the operator turned on: answer, book, remind,
review, and recover. Wording follows the selected accent.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

PHRASES = json.loads(Path(__file__).with_name("phrases.json").read_text(encoding="utf-8"))
LEX = PHRASES["lexicon"]

VOICES = {
    ("en", "us", "female"): "en-US-JennyNeural",
    ("en", "us", "male"): "en-US-GuyNeural",
    ("en", "gb", "female"): "en-GB-SoniaNeural",
    ("en", "gb", "male"): "en-GB-RyanNeural",
    ("en", "in", "female"): "en-IN-NeerjaNeural",
    ("en", "in", "male"): "en-IN-PrabhatNeural",
    ("ur", "pk", "female"): "ur-PK-UzmaNeural",
    ("ur", "pk", "male"): "ur-PK-AsadNeural",
    ("ar", "sa", "female"): "ar-SA-ZariyahNeural",
    ("ar", "sa", "male"): "ar-SA-HamedNeural",
    ("ar", "ae", "female"): "ar-AE-FatimaNeural",
    ("ar", "ae", "male"): "ar-AE-HamdanNeural",
    ("ar", "eg", "female"): "ar-EG-SalmaNeural",
    ("ar", "eg", "male"): "ar-EG-ShakirNeural",
    ("ar", "lb", "female"): "ar-LB-LaylaNeural",
    ("ar", "lb", "male"): "ar-LB-RamiNeural",
}

VOICE_LABELS = {
    "en-US-JennyNeural": "American English, female",
    "en-US-GuyNeural": "American English, male",
    "en-GB-SoniaNeural": "British English, female",
    "en-GB-RyanNeural": "British English, male",
    "en-IN-NeerjaNeural": "South Asian English, female",
    "en-IN-PrabhatNeural": "South Asian English, male",
    "ur-PK-UzmaNeural": "Pakistani Urdu, female",
    "ur-PK-AsadNeural": "Pakistani Urdu, male",
    "ar-SA-ZariyahNeural": "Saudi Arabic, female",
    "ar-SA-HamedNeural": "Saudi Arabic, male",
    "ar-AE-FatimaNeural": "Emirati Arabic, female",
    "ar-AE-HamdanNeural": "Emirati Arabic, male",
    "ar-EG-SalmaNeural": "Egyptian Arabic, female",
    "ar-EG-ShakirNeural": "Egyptian Arabic, male",
    "ar-LB-LaylaNeural": "Lebanese Arabic, female",
    "ar-LB-RamiNeural": "Lebanese Arabic, male",
}

JOBS = ("answer", "book", "remind", "review", "recover")
NAME_PATTERNS = [re.compile(pattern) for pattern in LEX["name_patterns"]]


def handle(payload: dict[str, Any]) -> dict[str, Any]:
    message = _clean(payload.get("message") or "")
    if not message:
        raise ValueError("Message is empty.")

    business = _business(payload.get("business") or {})
    jobs = [job for job in payload.get("jobs") or [] if job in JOBS] or ["answer"]
    gender = payload.get("gender") if payload.get("gender") in ("female", "male") else "female"
    accents = payload.get("accents") or {}
    locked = payload.get("language") if payload.get("language") in ("en", "ur", "ar") else "auto"
    language = locked if locked != "auto" else _detect(message)
    accent = _accent_for(language, accents)
    dialect = _dialect(language, accent)
    channel = payload.get("channel") if payload.get("channel") in ("phone", "whatsapp", "sms", "email", "web") else "whatsapp"

    state = {
        "intent": None,
        "step": "idle",
        "name": "",
        "reason": "",
        "when": "",
        "detail": "",
        **(payload.get("state") or {}),
    }
    ctx = {
        "business": business,
        "jobs": jobs,
        "gender": gender,
        "language": language,
        "dialect": dialect,
        "channel": channel,
        "short": channel == "sms",
    }
    text, outcome, state = _turn(message, state, ctx)
    voice = VOICES[(language, accent, gender)]
    subject = _email_subject(business["name"], language) if channel == "email" else None

    return {
        "text": text,
        "subject": subject,
        "language": language,
        "accent": accent,
        "dialect": dialect,
        "voice": voice,
        "voiceLabel": VOICE_LABELS[voice],
        "outcome": outcome,
        "state": state,
        "dir": "rtl" if language in ("ur", "ar") else "ltr",
    }


def _email_subject(name: str, language: str) -> str:
    template = LEX["email_subject"].get(language, LEX["email_subject"]["en"])
    return template.replace("{name}", name)


def _turn(message: str, state: dict[str, Any], ctx: dict[str, Any]) -> tuple[str, str | None, dict[str, Any]]:
    info = _info_kind(message)
    intent = _detect_intent(message)
    jobs: list[str] = ctx["jobs"]

    if info and (state["step"] == "idle" or intent is None):
        answer = _info_answer(info, ctx)
        if state["step"] == "idle":
            return answer, None, state
        return f"{answer} {_prompt(state, ctx)}", None, state

    if intent and intent != state["intent"] and intent != "answer":
        if intent not in jobs:
            return _disabled(ctx), None, state
        kept_name = state.get("name") or ""
        state = {"intent": intent, "step": "idle", "name": kept_name, "reason": "", "when": "", "detail": ""}
        if intent == "book":
            _absorb_name(message, state)
        return _run(message, state, ctx, opening=True)

    if state["step"] == "idle":
        return say("greet", ctx, name=ctx["business"]["name"]), None, state

    return _run(message, state, ctx, opening=False)


def _run(message: str, state: dict[str, Any], ctx: dict[str, Any], opening: bool) -> tuple[str, str | None, dict[str, Any]]:
    intent = state["intent"]
    if intent == "book":
        return _book(message, state, ctx, opening)
    if intent == "remind":
        return _remind(message, state, ctx, opening)
    if intent == "review":
        return _review(message, state, ctx, opening)
    if intent == "recover":
        return _recover(message, state, ctx, opening)
    fresh = {"intent": None, "step": "idle", "name": "", "reason": "", "when": "", "detail": ""}
    return say("greet", ctx, name=ctx["business"]["name"]), None, fresh


def _book(message: str, state: dict[str, Any], ctx: dict[str, Any], opening: bool) -> tuple[str, str | None, dict[str, Any]]:
    if not opening:
        _absorb_name(message, state)
        if state["step"] == "need_name" and not state["name"]:
            state["name"] = _name_from_step(message)
        elif state["step"] == "need_reason" and not state["reason"]:
            state["reason"] = _clean(message)[:160]
        elif state["step"] == "need_when" and not state["when"]:
            state["when"] = _clean(message)[:160]
        elif state["step"] == "confirm":
            if _is_yes(message):
                state["step"] = "done"
                return _booked(state, ctx), "booked", state
            if _is_no(message):
                state["when"] = ""
                state["step"] = "need_when"
                return say("ask_when", ctx), None, state

    if not state["name"]:
        state["step"] = "need_name"
        return say("ask_name", ctx), None, state
    if not state["reason"]:
        state["step"] = "need_reason"
        return say("ask_reason", ctx), None, state
    if not state["when"]:
        state["step"] = "need_when"
        return say("ask_when", ctx), None, state
    state["step"] = "confirm"
    return say("confirm_book", ctx, name=state["name"], reason=state["reason"], when=state["when"]), None, state


def _remind(message: str, state: dict[str, Any], ctx: dict[str, Any], opening: bool) -> tuple[str, str | None, dict[str, Any]]:
    if not opening and state["step"] == "need_detail":
        state["detail"] = _clean(message)[:160]
        state["step"] = "need_confirm"
        return say("remind_offer", ctx, detail=state["detail"]), None, state
    if not opening and state["step"] == "need_confirm":
        if _is_yes(message):
            state["step"] = "done"
            return say("reminded", ctx), "reminded", state
        if _is_no(message):
            state["intent"] = None
            state["step"] = "idle"
            return say("remind_declined", ctx), None, state
    state["step"] = "need_detail"
    return say("ask_remind", ctx), None, state


def _review(message: str, state: dict[str, Any], ctx: dict[str, Any], opening: bool) -> tuple[str, str | None, dict[str, Any]]:
    if not opening or _rating(message):
        rating = None if opening and not _rating(message) else _rating(message)
        if rating:
            state["rating"] = rating
            state["step"] = "done"
            return say("reviewed", ctx, rating=rating), "reviewed", state
    state["step"] = "need_rating"
    return say("ask_review", ctx), None, state


def _recover(message: str, state: dict[str, Any], ctx: dict[str, Any], opening: bool) -> tuple[str, str | None, dict[str, Any]]:
    if opening:
        state["step"] = "need_yes"
        state["reason"] = ""
        state["when"] = ""
        return say("recover_offer", ctx), None, state
    if state["step"] == "need_yes":
        if _is_no(message):
            state["intent"] = None
            state["step"] = "idle"
            return say("recover_declined", ctx), None, state
        state["intent"] = "book"
        state["step"] = "need_name"
        return _book(message, state, ctx, opening=True)
    return _book(message, state, ctx, opening=False)


def _prompt(state: dict[str, Any], ctx: dict[str, Any]) -> str:
    step = state["step"]
    if step == "need_name":
        return say("ask_name", ctx)
    if step == "need_reason":
        return say("ask_reason", ctx)
    if step == "need_when":
        return say("ask_when", ctx)
    if step == "need_detail":
        return say("ask_remind", ctx)
    if step == "confirm":
        return say("confirm_book", ctx, name=state["name"], reason=state["reason"], when=state["when"])
    if step == "need_confirm":
        return say("remind_offer", ctx, detail=state.get("detail") or "")
    if step == "need_rating":
        return say("ask_review", ctx)
    if step == "need_yes":
        return say("recover_offer", ctx)
    return ""


def _info_answer(kind: str, ctx: dict[str, Any]) -> str:
    biz = ctx["business"]
    if kind == "where":
        return say("info_where", ctx, location=biz["location"])
    if kind == "services":
        return say("info_services", ctx, services=biz["services"])
    return say("info_hours", ctx, hours=biz["hours"], location=biz["location"])


def _disabled(ctx: dict[str, Any]) -> str:
    labels = PHRASES["job_labels"]
    lang = "ar" if ctx["language"] == "ar" else ctx["language"]
    allowed = ", ".join(labels[job][lang] for job in ctx["jobs"])
    return say("disabled", ctx, allowed=allowed)


def _booked(state: dict[str, Any], ctx: dict[str, Any]) -> str:
    reason = state["reason"]
    if reason:
        reason = reason[:1].upper() + reason[1:]
    return say("booked", ctx, name=state["name"], reason=reason, when=state["when"])


def _absorb_name(message: str, state: dict[str, Any]) -> None:
    name = _extract_name(message)
    if name:
        state["name"] = name


def say(key: str, ctx: dict[str, Any], **kwargs: object) -> str:
    node = PHRASES[key]
    lang = ctx["language"]
    template = node.get(f"{lang}_sms") if ctx["short"] and f"{lang}_sms" in node else node[lang]
    text = str(template)
    for name, value in kwargs.items():
        text = text.replace("{" + name + "}", str(value))
    return text


def _detect(text: str) -> str:
    if any(ch in LEX["urdu_marks"] for ch in text) or any(word in text for word in LEX["urdu_words"]):
        return "ur"
    if re.search(r"[\u0600-\u06FF]", text):
        return "ar"
    folded = text.lower()
    if any(word in folded for word in LEX["roman_urdu"]):
        return "ur"
    return "en"


def _contains_any(text: str, words: list[str]) -> bool:
    folded = text.lower()
    return any(word in folded or word in text for word in words)


def _detect_intent(text: str) -> str | None:
    found = [intent for intent in ("review", "remind", "recover", "book") if _contains_any(text, LEX[intent])]
    if "recover" in found:
        return "recover"
    if found:
        return found[0]
    return None


def _info_kind(text: str) -> str | None:
    if _contains_any(text, LEX["where"]):
        return "where"
    if _contains_any(text, LEX["services"]):
        return "services"
    if _contains_any(text, LEX["hours"]):
        return "hours"
    return None


def _is_greeting(text: str) -> bool:
    folded = text.strip().lower()
    for mark in LEX["punct"]:
        folded = folded.replace(mark, "")
    return folded.strip() in set(LEX["greetings"])


def _is_yes(text: str) -> bool:
    folded = text.strip().lower()
    if folded in set(LEX["yes"]):
        return True
    return any(folded.startswith(prefix) for prefix in LEX["yes_prefixes"])


def _is_no(text: str) -> bool:
    return text.strip().lower() in set(LEX["no"])


def _extract_name(text: str) -> str:
    for pattern in NAME_PATTERNS:
        match = pattern.search(text)
        if match:
            return _tidy_name(match.group(1))
    return ""


def _name_from_step(text: str) -> str:
    found = _extract_name(text)
    if found:
        return found
    if _is_yes(text) or _is_no(text) or _detect_intent(text) or _info_kind(text) or _is_greeting(text):
        return ""
    words = text.strip().split()
    if 1 <= len(words) <= 4 and not re.search(r"\d", text):
        return _tidy_name(text)
    return ""


def _tidy_name(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(LEX["trim"])[:40]


def _rating(text: str) -> int | None:
    match = re.search(r"[1-5]", text)
    if match:
        return int(match.group(0))
    for word, value in LEX["rating_words"].items():
        if word in text.lower() or word in text:
            return int(value)
    return None


def _accent_for(language: str, accents: dict[str, Any]) -> str:
    defaults = {"en": "us", "ur": "pk", "ar": "sa"}
    allowed = {"en": {"us", "gb", "in"}, "ur": {"pk"}, "ar": {"sa", "ae", "eg", "lb"}}
    choice = str(accents.get(language) or defaults[language])
    return choice if choice in allowed[language] else defaults[language]


def _dialect(language: str, accent: str) -> str:
    if language == "ar":
        return {"sa": "gulf", "ae": "gulf", "eg": "egypt", "lb": "levant"}[accent]
    if language == "en":
        return accent
    return "pk"


def _business(raw: dict[str, Any]) -> dict[str, str]:
    def text(key: str, fallback: str) -> str:
        value = _clean(str(raw.get(key) or ""))
        return (value or fallback)[:180]

    return {
        "name": text("name", "Sysmatixx"),
        "location": text("location", "27 K Model Town, Lahore"),
        "hours": text("hours", "Monday to Saturday, 10 in the morning until 7 in the evening"),
        "services": text("services", "game consultations, project estimates, and social media planning"),
    }


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()
